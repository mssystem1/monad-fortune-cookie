import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";
import { monadTestnet } from "../../../lib/chain";

/**
 * Leaderboard strategy:
 * 1) Base Top-20 = BlockVision collection holders snapshot (stable).
 * 2) ALWAYS patch the connected wallet (if ?you=<wallet>) using the same
 *    "account nft holdings" logic that works in holdings/route.ts (authoritative).
 * 3) Short server caches + real bypass on fresh=1.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ABI = parseAbi([
  "function getTextMinters() view returns (address[])",
  "function getImageMinters() view returns (address[])",
]);

// Shared viem public client (do NOT create another elsewhere)
const pc = createPublicClient({
  chain: monadTestnet,
  transport: http(
    process.env.NEXT_PUBLIC_RPC_HTTP ||
      process.env.NEXT_PUBLIC_MONAD_RPC_URL ||
      "https://testnet-rpc.monad.xyz"
  ),
});

// Count repeated addresses (case-insensitive)
const tallyLower = (arr?: readonly (string | `0x${string}`)[]) => {
  const m = new Map<string, number>();
  if (!arr) return m;
  for (const a of arr) {
    const k = String(a).toLowerCase();
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
};

// ---- BlockVision endpoints ----
const BV_HOLDERS  = "https://api.blockvision.org/v2/monad/collection/holders";
const BV_HOLDINGS = "https://api.blockvision.org/v2/monad/account/nft/holdings";

// ---- Types (loose) ----
type Holder = { ownerAddress?: string; amount?: string };
type Holding = { nft?: { contractAddress?: string; tokenId?: string }, amount?: string | number };
type Row = { address: string; mints: number };

// ---- Small in-memory caches ----
// holders snapshot (collection-wide)
const HOLDERS_TTL_MS = 10_000;
let holdersCacheRows: Row[] | null = null;
let holdersCachedAt = 0;
let holdersInflight: Promise<Row[]> | null = null;

// per-wallet holdings cache (authoritative for connected wallet)
const YOU_TTL_MS = 5_000;
const youCache = new Map<string, { at: number; count: number }>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Lowercase → Set helper (so we can do O(1) membership checks)
const toLowerSet = (arr?: readonly (string | `0x${string}`)[]) =>
  new Set((arr ?? []).map(a => String(a).toLowerCase()));

/** Normalize tokenId ("1" vs "0x1" etc.) so we can dedupe per token reliably. */
function normTokenId(id?: string): string {
  if (!id) return "";
  try {
    return "0x" + BigInt(id).toString(16);
  } catch {
    return id.toLowerCase();
  }
}

/** Fetch collection holders (stable base). */
async function fetchHolders(
  contract: string,
  apiKey: string,
  forceFresh = false
): Promise<Row[]> {
  const now = Date.now();
  if (!forceFresh && holdersCacheRows && now - holdersCachedAt < HOLDERS_TTL_MS) {
    return holdersCacheRows;
  }
  if (!forceFresh && holdersInflight) return holdersInflight;

  holdersInflight = (async () => {
    const byAddr: Record<string, number> = {};
    let cursor = "";
    let pages = 0;
    const MAX_PAGES = 6;
    const LIMIT = "100";

    while (pages < MAX_PAGES) {
      const qs = new URLSearchParams({ contractAddress: contract, limit: LIMIT });
      if (cursor) qs.set("cursor", cursor);

      // retry/backoff for 429
      let attempt = 0;
      let res: Response | null = null;
      while (attempt <= 3) {
        res = await fetch(`${BV_HOLDERS}?${qs.toString()}`, {
          headers: { Accept: "application/json", "x-api-key": apiKey },
          cache: "no-store",
        });
        if (res.status !== 429) break;
        await sleep(300 + attempt * 300 + Math.floor(Math.random() * 200));
        attempt++;
      }
      if (!res || !res.ok) {
        const text = await (res ? res.text() : Promise.resolve("no response"));
        throw new Error(`BlockVision error: ${res ? res.status : "?"} ${text}`);
      }

      const json = await res.json();
      const data: Holder[] = json?.result?.data ?? [];
      for (const h of data) {
        const addr = (h.ownerAddress || "").toLowerCase();
        if (!addr) continue;
        const amt = Number(h.amount || "0");
        if (!Number.isFinite(amt)) continue;
        // pages can repeat; take max to avoid double counting
        byAddr[addr] = Math.max(byAddr[addr] ?? 0, amt);
      }

      cursor = json?.result?.nextPageCursor || "";
      pages++;
      if (!cursor) break;
      // heuristic: once many uniques seen, Top-20 is stable enough
      if (Object.keys(byAddr).length >= 200) break;
    }

    const rows = Object.entries(byAddr)
      .map(([address, mints]) => ({ address, mints }))
      .filter((r) => r.mints > 0)
      .sort((a, b) => b.mints - a.mints);

    holdersCacheRows = rows;
    holdersCachedAt = Date.now();
    return rows;
  })();

  try {
    return await holdersInflight;
  } finally {
    holdersInflight = null;
  }
}

/** Authoritative per-wallet count for THIS collection (same idea as holdings/route.ts). */
async function fetchYouHoldingsCount(
  you: string,
  contract: string,
  apiKey: string,
  forceFresh = false
): Promise<number | null> {
  const now = Date.now();
  const ck = you.toLowerCase();

  // tiny cache (skip when forceFresh)
  if (!forceFresh) {
    const cached = youCache.get(ck);
    if (cached && now - cached.at < YOU_TTL_MS) return cached.count;
  }

  let cursor = "";
  let pages = 0;
  const LIMIT = "100";
  const MAX_PAGES = 100; // generous; we stop when no cursor
  const target = contract.toLowerCase();

  // per-token map: take MAX amount we see for each tokenId (prevents undercount w/ dup rows)
  const perToken = new Map<string, number>();

  while (pages < MAX_PAGES) {
    const qs = new URLSearchParams({ address: ck, limit: LIMIT });
    if (cursor) qs.set("cursor", cursor);

    // retry/backoff
    let attempt = 0;
    let res: Response | null = null;
    while (attempt <= 3) {
      res = await fetch(`${BV_HOLDINGS}?${qs.toString()}`, {
        headers: { Accept: "application/json", "x-api-key": apiKey },
        cache: "no-store",
      });
      if (res.status !== 429) break;
      await sleep(300 + attempt * 300 + Math.floor(Math.random() * 200));
      attempt++;
    }
    if (!res || !res.ok) {
      // don’t break leaderboard if holdings fails; just skip patching
      return null;
    }

    const json = await res.json();
    const data: Holding[] = json?.result?.data ?? [];

    for (const h of data) {
      const ca = (h.nft?.contractAddress || "").toLowerCase();
      if (ca !== target) continue;

      const key = normTokenId(h.nft?.tokenId);
      const qty = Number(h.amount ?? 1) || 1; // ERC721=1, ERC1155 uses amount

      const prev = perToken.get(key) ?? 0;
      if (qty > prev) perToken.set(key, qty);
    }

    cursor = json?.result?.nextPageCursor || "";
    pages++;
    if (!cursor) break;
  }

  const total = Array.from(perToken.values()).reduce((a, b) => a + b, 0);
  youCache.set(ck, { at: Date.now(), count: total });
  return total;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    //const YOU = (url.searchParams.get("you") || "").toLowerCase();
    const forceFresh = url.searchParams.get("fresh") === "1";

    const YOU_RAW = (url.searchParams.get('you') || '').toLowerCase();
    const YOU_LIST = YOU_RAW ? YOU_RAW.split(',').map(s => s.trim()).filter(Boolean) : [];
    const YOU = YOU_LIST[0] || ''; // keep the first for backward-compatibility

    const contract = (process.env.NEXT_PUBLIC_COOKIE_ADDRESS || "").toLowerCase();
    const apiKey = process.env.BLOCKVISION_API_KEY;

    if (!contract) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_COOKIE_ADDRESS is not set" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (!apiKey) {
      return NextResponse.json(
        { error: "BLOCKVISION_API_KEY is not set (server-side)" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    // If truly fresh, drop holders cache/inflight so we refetch now
    if (forceFresh) {
      holdersCacheRows = null;
      holdersCachedAt = 0;
      holdersInflight = null;
      // per-wallet cache is skipped via forceFresh flag inside fetchYouHoldingsCount
    }

    // 1) Base snapshot
    const baseRows = await fetchHolders(contract, apiKey, /*forceFresh*/ forceFresh);
    const byAddr = new Map<string, number>(baseRows.map((r) => [r.address, r.mints]));

    // 2) ALWAYS patch the connected wallet from holdings (authoritative)
    if (YOU) {
      const youCount = await fetchYouHoldingsCount(YOU, contract, apiKey, /*forceFresh*/ forceFresh);
      if (youCount != null) {
        const current = byAddr.get(YOU) ?? 0;
        if (youCount !== current) byAddr.set(YOU, youCount);
      }
    }

    // 2.5) Read contract minters for the two leaderboard columns
let textCounts  = new Map<string, number>();
let imageCounts = new Map<string, number>();
try {
  const [textMintersArr, imageMintersArr] = await Promise.all([
    (pc as any).readContract({
      address: contract as `0x${string}`,
      abi: ABI,
      functionName: "getTextMinters",
    } as any) as Promise<`0x${string}`[]>,
    (pc as any).readContract({
      address: contract as `0x${string}`,
      abi: ABI,
      functionName: "getImageMinters",
    } as any) as Promise<`0x${string}`[]>,
  ]);
  textCounts  = tallyLower(textMintersArr);
  imageCounts = tallyLower(imageMintersArr);
} catch {
  // Keep sets empty if reads fail → columns default to 0
}

    // 3) Build rows + Top-20
    const rows = Array.from(byAddr.entries())
      .map(([address, mints]) => ({ address, mints }))
      .filter((r) => r.mints > 0)
      .sort((a, b) => b.mints - a.mints);

const actual = rows.slice(0, 20).map((r, i) => {
  const a = (r.address || "").toLowerCase();
  return {
    rank: i + 1,
    address: r.address,
    mints: r.mints,
    // ↓ counts, not booleans
    mintedCookies: textCounts.get(a)  ?? 0,
    mintedImages:  imageCounts.get(a) ?? 0,
  };
});
    const need = Math.max(0, 20 - actual.length);
    const top20 = [
      ...actual,
      ...Array.from({ length: need }, (_, i) => ({
        rank: actual.length + i + 1,
        address: null as string | null,
        mints: 0,
        mintedCookies: 0,
        mintedImages: 0,
      })),
    ];

    // 4) you row
    /*
    let you: { rank: number; address: string; mints: number } | null = null;
    if (YOU) {
      const idx = rows.findIndex((r) => r.address === YOU);
      if (idx >= 0) you = { rank: idx + 1, address: YOU, mints: rows[idx].mints };
    }
    */
    let you: { rank: number; address: string | string[]; mints: number; mintedCookies: number; mintedImages: number } | null = null;

    if (YOU_LIST.length) {
      // mints: sum across rows (case-insensitive)
      const rowMap = new Map(rows.map(r => [r.address.toLowerCase(), r.mints]));
      const sum = (map: Map<string, number>) =>
        YOU_LIST.reduce((acc, a) => acc + (map.get(a) ?? 0), 0);
      const mintedCookies = sum(textCounts);
      const mintedImages  = sum(imageCounts);
      const mints         = YOU_LIST.reduce((acc, a) => acc + (rowMap.get(a) ?? 0), 0);

      // rank is ambiguous for multi; set to NaN or min rank if you prefer
      you = { rank: Number.NaN, address: YOU_LIST, mints, mintedCookies, mintedImages };
    } else if (YOU) {
      const idx = rows.findIndex(r => r.address.toLowerCase() === YOU);
      you = {
        rank: idx >= 0 ? idx + 1 : Number.NaN,
        address: YOU,
        mints: rows[idx]?.mints ?? 0,
        mintedCookies: textCounts.get(YOU) ?? 0,
        mintedImages: imageCounts.get(YOU) ?? 0,
      };
    }

    return NextResponse.json(
      { updatedAt: new Date().toISOString(), totalMinters: rows.length, top20, you },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    // If we have a holders cache, serve it as a fallback
    if (holdersCacheRows) {
      const rows = holdersCacheRows;
      const actual = rows.slice(0, 20).map((r, i) => ({
        rank: i + 1,
        address: r.address,
        mints: r.mints,
        mintedCookies: 0,
        mintedImages: 0,
      }));
      const need = Math.max(0, 20 - actual.length);
      const top20 = [
        ...actual,
        ...Array.from({ length: need }, (_, i) => ({
          rank: actual.length + i + 1,
          address: null as string | null,
          mints: 0,
          mintedCookies: 0,
          mintedImages: 0,
        })),
      ];
      return NextResponse.json(
        {
          updatedAt: new Date().toISOString(),
          totalMinters: rows.length,
          top20,
          you: null,
          stale: true,
          error: String(err?.message || err),
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}