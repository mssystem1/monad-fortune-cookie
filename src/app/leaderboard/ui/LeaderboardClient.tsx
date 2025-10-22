"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useSmartAccount } from '../../../app/SmartAccountProvider'; 

type Row = {
  rank: number;
  address?: string | string[] | null; // ← allow array
  mints: number;
  mintedCookies?: number;
  mintedImages?: number;
};

type Api = {
  top20: Row[];
  you: Row | null;
  totalMinters: number;
  updatedAt: string;
  stale?: boolean;
  error?: string;
};

type LeaderboardSize = 'default' | 'mini';
type LeaderboardClientProps = { size?: LeaderboardSize };

export default function LeaderboardClient({ size = 'default' }: LeaderboardClientProps) {

  const compact = size === 'mini';
  const { address } = useAccount();
  const [data, setData] = useState<Api | null>(null);
  const [loading, setLoading] = useState(true);

  const { saAddress } = useSmartAccount();
  const eoaLower = address?.toLowerCase();
  const saLower  = saAddress?.toLowerCase();
  const highlights = Array.from(new Set([eoaLower, saLower].filter(Boolean) as string[]));

  function fetchData(fresh = false) {
    const qs = new URLSearchParams();
    // send BOTH EOA and SA if present
    const youList = [address, saAddress].filter(Boolean) as string[];
    if (youList.length) qs.set("you", youList.join(","));
    if (fresh) qs.set("fresh", "1");
    setLoading(true);
    fetch(`/api/leaderboard?${qs.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setData(j))
      .finally(() => setLoading(false));
  }

  // Fetch on mount and when wallet changes (fresh)
  useEffect(() => {
    fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, saAddress]);

  // Refetch fresh when window gains focus or tab becomes visible (switching tabs)
  useEffect(() => {
    const onFocus = () => fetchData(true);
    const onVisible = () => { if (!document.hidden) onFocus(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //const lower = address?.toLowerCase();

  if (loading)
    return <div style={{ opacity: 0.8, color: "#cbd5e1" }}>Loading leaderboard…</div>;

  if (!data || !Array.isArray(data.top20)) {
    return <div style={{ color: "#cbd5e1" }}>Leaderboard unavailable.</div>;
  }

const inTopForAll = highlights.length
  ? highlights.every((h) => data.top20.some((r) => lowers(r.address).includes(h)))
  : false;
  const showPinned = highlights.length > 0 && !inTopForAll;

  // If API couldn't compute rank (e.g., no mints yet), still show your wallet card
  /*
const youRow: Row | null =
  (data.you as any) ??
  ([address, saAddress].filter(Boolean).length
    ? {
        rank: NaN,
        address: [address, saAddress].filter(Boolean) as string[], // ← array, not "a + b"
        mints: 0,
        mintedCookies: 0,
        mintedImages: 0,
      }
    : null);
*/

// Derive "you" from Top-20 if API omitted it.
// If any of your wallets (EOA/SA) appear in Top-20, show their real rank & totals.
const youRow: Row | null = (data.you as any) ?? (() => {
  const wallets = [address, saAddress].filter(Boolean) as string[];
  if (!wallets.length) return null;

  const wanted = wallets.map((w) => w.toLowerCase());
  const hits = data.top20.filter((r) => lowers(r.address).some((a) => wanted.includes(a)));

  if (!hits.length) {
    // nothing on the board yet → keep the “no mints yet” fallback
    return {
      rank: Number.NaN,
      address: wallets, // keep as array
      mints: 0,
      mintedCookies: 0,
      mintedImages: 0,
    };
  }

  // aggregate across any hit (EOA and/or SA if both appear)
  const rank = Math.min(...hits.map((r) => r.rank));
  const mints = hits.reduce((acc, r) => acc + (r.mints || 0), 0);
  const mintedCookies = hits.reduce((acc, r) => acc + (r.mintedCookies || 0), 0);
  const mintedImages = hits.reduce((acc, r) => acc + (r.mintedImages || 0), 0);

  return { rank, address: wallets, mints, mintedCookies, mintedImages };
})();

  return (
    <div>
      {data.stale ? (
        <div style={{ color: "#fbbf24", marginBottom: 8, fontWeight: 700 }}>
          Showing cached leaderboard (rate-limited). Will refresh automatically.
        </div>
      ) : null}

      {/*showPinned && youRow ? <PinnedYouRow you={youRow} hasRank={!!data.you} /> : null*/}
      {showPinned && youRow ? <PinnedYouRow you={youRow} hasRank={Number.isFinite(youRow.rank)} /> : null}

      <Table rows={data.top20} highlight={highlights} compact={compact} />
      <p style={{ marginTop: 12, color: "#9ca3af" }}>
        {Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.updatedAt))}
        {" • "}
        {data.totalMinters} total unique minters
      </p>
    </div>
  );
}

function PinnedYouRow({ you, hasRank }: { you: Row; hasRank: boolean }) {
  const mints   = you.mints ?? 0;
  const cookies = you.mintedCookies ?? 0;
  const images  = you.mintedImages ?? 0;
  const hasAnyActivity = mints > 0 || cookies > 0 || images > 0;

  return (
    <div
      style={{
        marginBottom: 12,
        padding: "12px 16px",
        border: "2px solid #7c3aed",
        borderRadius: 12,
        background: "linear-gradient(90deg, rgba(124,58,237,0.25), rgba(124,58,237,0.10))",
        color: "#f5f3ff",
        fontWeight: 800,
      }}
    >
      {hasRank || hasAnyActivity ? (
        <>
          {hasRank ? `Your rank: #${you.rank} • ` : `Your wallet: `}
          {youLabelStr(you.address)} • {mints} mints
          {" • Cookies "}{cookies}
          {" • Images "}{images}
        </>
      ) : (
        <>
          Your wallet: {youLabelStr(you.address)} • No mints yet
          {" • Cookies 0 • Images 0"}
        </>
      )}
    </div>
  );
}

function Table({
  rows,
  highlight,
  compact = false,
}: {
  rows: Row[];
  highlight: string | string[];
  compact?: boolean;
}) {
  const showExtras = !compact; // hide extra columns in mini
  const hl = Array.isArray(highlight) ? highlight : [highlight];

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          tableLayout: "fixed",
          color: "#e5e7eb",
          background: "#0f0f12",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #1f1f26",
          fontSize: compact ? 12 : 14,
        }}
      >
        <colgroup>
          {compact ? (
            <>
            {/*
              <col style={{ width: "20%" }} />
              <col style={{ width: "60%" }} />
              <col style={{ width: "20%" }} />
              */}
              <col style={{ width: "18%" }} />
              <col style={{ width: "56%" }} />
              <col style={{ width: "26%" }} />
              <col style={{ width: "26%" }} />
              <col style={{ width: "26%" }} />
            </>
          ) : (
            <>
              <col style={{ width: "18%" }} />
              <col style={{ width: "56%" }} />
              <col style={{ width: "26%" }} />
              <col style={{ width: "26%" }} />
              <col style={{ width: "26%" }} />
            </>
          )}
        </colgroup>

        <thead>
          <tr>
            <Th compact={compact} style={{ textAlign: "left", paddingLeft: 8, background: "#14141a", borderBottom: "1px solid #1f1f26" }}>
              RANK
            </Th>
            <Th compact={compact} style={{ textAlign: "left", paddingLeft: compact ? 16 : 28, background: "#14141a", borderBottom: "1px solid #1f1f26" }}>
              WALLET
            </Th>
            <Th compact={compact} style={{ textAlign: "right", paddingRight: compact ? 10 : 18, background: "#14141a", borderBottom: "1px solid #1f1f26" }}>
              MINTS
            </Th>
            {/*showExtras &&*/} 
            {(
              <Th compact={compact} style={{ textAlign: "right", paddingRight: compact ? 12 : 25, background: "#14141a", borderBottom: "1px solid #1f1f26" }}>
                MINTED COOKIES
              </Th>
            )}
            {/*showExtras &&*/} 
            {(
              <Th compact={compact} style={{ textAlign: "right", paddingRight: compact ? 14 : 30, background: "#14141a", borderBottom: "1px solid #1f1f26" }}>
                MINTED IMAGES
              </Th>
            )}
          </tr>
        </thead>

        <tbody>
          {rows.map((r, i) => {
            const isPlaceholder = !r.address;
            const rowLowers = lowers(r.address);
            const active = rowLowers.some((a) => hl.includes(a));
            const key = (r.address || "placeholder") + "-" + r.rank;

            return (
              <Tr key={key} i={i} active={active}>
                <Td compact={compact} style={{ textAlign: "left", paddingLeft: compact ? 8 : 12 }}>
                  {rankCell(r.rank)}
                </Td>

                <Td compact={compact} style={{ textAlign: "left", paddingLeft: compact ? 16 : 28 }}>
                  {isPlaceholder ? (
                    <span style={{ color: "#6b7280" }}>—</span>
                  ) : (
                    <a
                      href={`https://testnet.monadexplorer.com/address/${Array.isArray(r.address) ? r.address[0] : r.address}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#cbd5e1", textDecoration: "none" }}
                    >
                      {youLabelStr(r.address!)}
                    </a>
                  )}
                </Td>

                <Td compact={compact} style={{ textAlign: "right", paddingRight: compact ? 10 : 18 }}>
                  {isPlaceholder ? <span style={{ color: "#6b7280" }}>—</span> : <span style={pillStyle(r.rank)}>{r.mints}</span>}
                </Td>

                {/*showExtras &&*/} 
                {(
                  <Td compact={compact} style={{ textAlign: "right", paddingRight: compact ? 12 : 25 }}>
                    {isPlaceholder ? <span style={{ color: "#6b7280" }}>—</span> : <span style={pillStyle(r.rank)}>{r.mintedCookies ?? 0}</span>}
                  </Td>
                )}
                {/*showExtras &&*/} 
                {(
                  <Td compact={compact} style={{ textAlign: "right", paddingRight: compact ? 14 : 30 }}>
                    {isPlaceholder ? <span style={{ color: "#6b7280" }}>—</span> : <span style={pillStyle(r.rank)}>{r.mintedImages ?? 0}</span>}
                  </Td>
                )}
              </Tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  compact = false,
  style,
}: {
  children: React.ReactNode;
  compact?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <th
      style={{
        padding: compact ? "8px 8px" : "12px 12px",
        color: "#e5e7eb",
        letterSpacing: "0.04em",
        fontSize: compact ? 12 : 13,
        ...style,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  compact = false,
  style,
}: {
  children: React.ReactNode;
  compact?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <td
      style={{
        padding: compact ? "8px" : "12px",
        borderBottom: "1px solid #16161d",
        ...style,
      }}
    >
      {children}
    </td>
  );
}

function Tr({ children, i, active }: { children: React.ReactNode; i: number; active: boolean }) {
  const base: React.CSSProperties = {
    background: i < 3 ? "linear-gradient(90deg, rgba(124,58,237,0.18), rgba(15,15,18,0))" : i % 2 ? "#0d0d12" : "#0b0b10",
    transition: "box-shadow 140ms ease, background 140ms ease",
  };
  const glow: React.CSSProperties = active
    ? { boxShadow: "0 0 0 2px rgba(124,58,237,0.70) inset, 0 0 24px rgba(124,58,237,0.35)", background: "linear-gradient(90deg, rgba(124,58,237,0.28), rgba(15,15,18,0.10))" }
    : {};
  return <tr style={{ ...base, ...glow }}>{children}</tr>;
}

function rankCell(rank: number) {
  if (rank === 1) return "🥇  1";
  if (rank === 2) return "🥈  2";
  if (rank === 3) return "🥉  3";
  return `🟣 ${rank.toString().padStart(2, " ")}`;
}

function short(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function youLabelStr(a?: string | string[] | null) {
  if (!a) return "";
  const parts = Array.isArray(a) ? a : String(a).split(" + ").map(s => s.trim()).filter(Boolean);
  return parts.map((s) => short(s)).join(" + ");
}

function pillStyle(rank: number): React.CSSProperties {
  const palette =
    rank === 1 ? { bg: "#fef3c7", fg: "#92400e", b: "#f59e0b" } :
    rank === 2 ? { bg: "#e5e7eb", fg: "#374151", b: "#9ca3af" } :
    rank === 3 ? { bg: "#f3e8ff", fg: "#6b21a8", b: "#a855f7" } :
                  { bg: "#eff6ff", fg: "#1e3a8a", b: "#60a5fa" };
  return {
    display: "inline-block",
    minWidth: 36, //
    textAlign: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontWeight: 800,
    background: palette.bg,
    color: palette.fg,
    border: `1px solid ${palette.b}`,
  };
}

// put these near your other helpers (e.g., below `short` / above `youLabelStr`)
type AddrInput = string | string[] | null | undefined;

function toArray(v: AddrInput): string[] {
  return Array.isArray(v) ? v : v ? [v] : [];
}
function lowers(v: AddrInput): string[] {
  return toArray(v).map((s) => s.toLowerCase());
}