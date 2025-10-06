"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useSmartAccount } from '../../../app/SmartAccountProvider'; 

type Row = {
  rank: number;
  address?: string | null;
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

export default function LeaderboardClient() {
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
    ? highlights.every(h => data.top20.some(r => (r.address || "").toLowerCase() === h))
    : false;
  const showPinned = highlights.length > 0 && !inTopForAll;

  // If API couldn't compute rank (e.g., no mints yet), still show your wallet card
 const youRow: Row | null =
  (data.you as any) ??
  (highlights.length ? { rank: NaN, address: highlights.join(" + "), mints: 0, mintedCookies: 0, mintedImages: 0 } : null);


  return (
    <div>
      {data.stale ? (
        <div style={{ color: "#fbbf24", marginBottom: 8, fontWeight: 700 }}>
          Showing cached leaderboard (rate-limited). Will refresh automatically.
        </div>
      ) : null}

      {/*showPinned && youRow ? <PinnedYouRow you={youRow} hasRank={!!data.you} /> : null*/}
      {showPinned && youRow ? <PinnedYouRow you={youRow} hasRank={Number.isFinite(youRow.rank)} /> : null}

      <Table rows={data.top20} highlight={highlights} />
      <p style={{ marginTop: 12, color: "#9ca3af" }}>
        {Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.updatedAt))}
        {" • "}
        {data.totalMinters} total unique minters
      </p>
    </div>
  );
}

function PinnedYouRow({ you, hasRank }: { you: Row; hasRank: boolean }) {
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
      {/*hasRank ? (
        <>Your rank: #{you.rank} • {short(you.address || "")} • {you.mints} mints</>
      ) : (
        <>Your wallet: {short(you.address || "")} • No mints yet</>
      )*/}
      {hasRank ? (
          <>
            Your rank: #{you.rank} • {youLabelStr(you.address)} • {you.mints} mints
            {" • Cookies "}{you.mintedCookies ?? 0}
            {" • Images "}{you.mintedImages ?? 0}
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

function Table({ rows, highlight }: { rows: Row[]; highlight: string | string[] }) {
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
        }}
      >
        <colgroup>
          <col style={{ width: "18%" }} />
          <col style={{ width: "56%" }} />
          <col style={{ width: "26%" }} />
          <col style={{ width: "26%" }} />
          <col style={{ width: "26%" }} />
        </colgroup>

        <thead>
          <tr>
            <Th style={{ textAlign: "left", paddingLeft: 8, background: "#14141a", borderBottom: "1px solid #1f1f26" }}>
              RANK
            </Th>
            <Th style={{ textAlign: "left", paddingLeft: 28, background: "#14141a", borderBottom: "1px solid #1f1f26" }}>
              WALLET
            </Th>
            <Th style={{ textAlign: "right", paddingRight: 18, background: "#14141a", borderBottom: "1px solid #1f1f26" }}>
              MINTS
            </Th>
            <th style={{ textAlign: "right", paddingRight: 25, background: "#14141a", borderBottom: "1px solid #1f1f26" }}>
              MINTED COOKIES
            </th>
            <th style={{ textAlign: "right", paddingRight: 30, background: "#14141a", borderBottom: "1px solid #1f1f26" }}>
              MINTED IMAGES
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, i) => {
            const isPlaceholder = !r.address;
            //const isMintedCookies = !r.mintedCookies;
            const hl = Array.isArray(highlight) ? highlight : [highlight];
            const active = !!r.address && hl.includes(r.address.toLowerCase());
            const key = (r.address || "placeholder") + "-" + r.rank;
            return (
              <Tr key={key} i={i} active={active}>
                <Td style={{ textAlign: "left", paddingLeft: 12 }}>{rankCell(r.rank)}</Td>

                <Td style={{ textAlign: "left", paddingLeft: 28 }}>
                  {isPlaceholder ? (
                    <span style={{ color: "#6b7280" }}>—</span>
                  ) : (
                    <a
                      href={`https://testnet.monadexplorer.com/address/${r.address}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#cbd5e1", textDecoration: "none" }}
                    >
                      {short(r.address!)}
                    </a>
                  )}
                </Td>

                <Td style={{ textAlign: "right", paddingRight: 18 }}>
                  {isPlaceholder ? <span style={{ color: "#6b7280" }}>—</span> : <span style={pillStyle(r.rank)}>{r.mints}</span>}
                </Td>
                <td style={{ textAlign: "right", paddingRight: 25 }}>
                  {isPlaceholder ? <span style={{ color: "#6b7280" }}>—</span> :  <span style={pillStyle(r.rank)}>{r.mintedCookies ?? 0}</span>}
                </td>
                <td style={{ textAlign: "right", paddingRight: 30 }}>
                  {isPlaceholder ? <span style={{ color: "#6b7280" }}>—</span> :  <span style={pillStyle(r.rank)}>{r.mintedImages ?? 0} </span>}
                </td>
              </Tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <th style={{ padding: "12px 12px", color: "#e5e7eb", letterSpacing: "0.04em", ...style }}>{children}</th>;
}
function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: "12px", borderBottom: "1px solid #16161d", ...style }}>{children}</td>;
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

function youLabelStr(a?: string | null) {
  if (!a) return "";
  return a.split(" + ").map((s) => short(s)).join(" + ");
}

function pillStyle(rank: number): React.CSSProperties {
  const palette =
    rank === 1 ? { bg: "#fef3c7", fg: "#92400e", b: "#f59e0b" } :
    rank === 2 ? { bg: "#e5e7eb", fg: "#374151", b: "#9ca3af" } :
    rank === 3 ? { bg: "#f3e8ff", fg: "#6b21a8", b: "#a855f7" } :
                  { bg: "#eff6ff", fg: "#1e3a8a", b: "#60a5fa" };
  return {
    display: "inline-block",
    minWidth: 56,
    textAlign: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontWeight: 800,
    background: palette.bg,
    color: palette.fg,
    border: `1px solid ${palette.b}`,
  };
}
