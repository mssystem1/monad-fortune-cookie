import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbi } from 'viem';

const RPC =
  process.env.NEXT_PUBLIC_RPC_HTTP ||
  process.env.NEXT_PUBLIC_MONAD_RPC_URL ||
  'https://testnet-rpc.monad.xyz';

const pc = createPublicClient({ transport: http(RPC) });

// Minimal ABIs for reads (no logs)
const ABI_BASE = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function supportsInterface(bytes4 interfaceId) view returns (bool)',
  'function totalSupply() view returns (uint256)', // may not exist (ERC721A usually has it)
]);

const ABI_ENUM = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function supportsInterface(bytes4 interfaceId) view returns (bool)',
]);

const BV_URL = 'https://api.blockvision.org/v2/monad/account/nfts';

type BvItem = { contractAddress: string; tokenId: string };
type BvCollection = { contractAddress: string; items?: BvItem[] };
type BvResp = {
  code: number;
  message?: string;
  reason?: string;
  result?: { data?: BvCollection[]; nextPageIndex?: number };
};

export async function GET(req: Request) {
  const t0 = Date.now();
  const { searchParams } = new URL(req.url);
  const address = (searchParams.get('address') || '').toLowerCase();
  const contract = (searchParams.get('contract') || '').toLowerCase();
  const debug = searchParams.get('debug') === '1';

  if (!address || !contract) {
    return NextResponse.json({ ok: false, error: 'address and contract are required' }, { status: 400 });
  }

  const dbg: any = { steps: [] };

  /*
  // 1) Try ERC721Enumerable path
  try {
    const enumerable = await pc.readContract({
      address: contract as `0x${string}`,
      abi: ABI_ENUM,
      functionName: 'supportsInterface',
      args: ['0x780e9d63'], // ERC-721 Enumerable
    });
    dbg.steps.push({ enumerable });

    if (enumerable) {
      const bal = (await pc.readContract({
        address: contract as `0x${string}`,
        abi: ABI_ENUM,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      })) as bigint;

      const ids: bigint[] = [];
      for (let i = 0n; i < bal; i++) {
        const id = (await pc.readContract({
          address: contract as `0x${string}`,
          abi: ABI_ENUM,
          functionName: 'tokenOfOwnerByIndex',
          args: [address as `0x${string}`, i],
        })) as bigint;
        ids.push(id);
      }
      if (ids.length) {
        ids.sort((a, b) => (a < b ? -1 : 1));
        const took = Date.now() - t0;
        return NextResponse.json({
          ok: true,
          source: 'enumerable',
          tokenIds: ids.map(String),
          tookMs: took,
          ...(debug ? { debug: dbg } : {}),
        });
      }
      // If balance is 0, fall through to other methods to double-check
    }
  } catch (e: any) {
    dbg.steps.push({ enumerableError: e?.message || String(e) });
  }

  // 2) On-chain ownerOf scan (uses totalSupply if available; otherwise 0..MAX_SCAN)
  try {
    const MAX_SCAN = Number(process.env.NEXT_PUBLIC_MAX_SCAN || '5000');
    let top: bigint | null = null;
    try {
      top = (await pc.readContract({
        address: contract as `0x${string}`,
        abi: ABI_BASE,
        functionName: 'totalSupply',
      })) as bigint;
      dbg.steps.push({ totalSupply: top.toString() });
    } catch {
      dbg.steps.push({ totalSupply: 'not available' });
    }

    let targetCount: bigint | null = null;
    try {
      targetCount = (await pc.readContract({
        address: contract as `0x${string}`,
        abi: ABI_BASE,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      })) as bigint;
      dbg.steps.push({ balanceOf: targetCount.toString() });
    } catch {
      dbg.steps.push({ balanceOf: 'failed' });
    }

    const ids: bigint[] = [];
    const start = 0n;
    const endExclusive = top != null ? top : BigInt(MAX_SCAN);

    for (let id = start; id < endExclusive; id++) {
      try {
        const owner = (await pc.readContract({
          address: contract as `0x${string}`,
          abi: ABI_BASE,
          functionName: 'ownerOf',
          args: [id],
        })) as `0x${string}`;
        if (owner.toLowerCase() === address) {
          ids.push(id);
          if (targetCount != null && BigInt(ids.length) >= targetCount) break;
        }
      } catch {
        // non-existent tokenId → ignore
      }
    }

    if (ids.length) {
      ids.sort((a, b) => (a < b ? -1 : 1));
      const took = Date.now() - t0;
      return NextResponse.json({
        ok: true,
        source: top != null ? 'ownerOf-scan(totalSupply)' : 'ownerOf-scan(maxScan)',
        tokenIds: ids.map(String),
        scanned: top != null ? Number(top) : Number(process.env.NEXT_PUBLIC_MAX_SCAN || 5000),
        tookMs: took,
        ...(debug ? { debug: dbg } : {}),
      });
    }
  } catch (e: any) {
    dbg.steps.push({ ownerOfScanError: e?.message || String(e) });
  }
*/

  // 3) BlockVision fallback (optional)
  try {
    const API_KEY = process.env.BLOCKVISION_API_KEY;
    if (API_KEY) {
      const collected: string[] = [];
      let pageIndex = 1;

      for (let safety = 0; safety < 200; safety++) {
        const qs = new URLSearchParams({
          address,
          pageIndex: String(pageIndex),
          verified: 'true',
          unknown: 'true',
        });
        const r = await fetch(`${BV_URL}?${qs.toString()}`, {
          headers: { 'X-API-Key': API_KEY },
          cache: 'no-store',
        });
        const j = (await r.json()) as BvResp;

        if (!r.ok || j.code !== 0) {
          dbg.steps.push({ blockvisionError: j.message || j.reason || `HTTP ${r.status}` });
          break;
        }

        const cols = j.result?.data || [];
        dbg.steps.push({ pageIndex, collections: cols.length });

        for (const c of cols) {
          if ((c.contractAddress || '').toLowerCase() !== contract) continue;
          for (const it of c.items || []) {
            if ((it.contractAddress || '').toLowerCase() === contract && it.tokenId) {
              collected.push(String(it.tokenId));
            }
          }
        }

        const next = j.result?.nextPageIndex;
        if (!next || next === pageIndex) break;
        pageIndex = next;
      }

      if (collected.length) {
        const uniq = Array.from(new Set(collected)).sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1));
        const took = Date.now() - t0;
        return NextResponse.json({
          ok: true,
          source: 'blockvision',
          tokenIds: uniq,
          tookMs: took,
          ...(debug ? { debug: dbg } : {}),
        });
      }
    } else {
      dbg.steps.push({ blockvision: 'no API key set' });
    }
  } catch (e: any) {
    dbg.steps.push({ blockvisionCatch: e?.message || String(e) });
  }

  // Nothing found
  const took = Date.now() - t0;
  return NextResponse.json({
    ok: true,
    source: 'none',
    tokenIds: [],
    tookMs: took,
    ...(debug ? { debug: dbg } : {}),
  });
}
