'use client';

import * as React from 'react';
import { useAccount, useAccountEffect } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const COOKIE_ADDRESS = process.env.NEXT_PUBLIC_COOKIE_ADDRESS as string;
const explorerNftUrl = (tokenId: number) =>
  `https://testnet.monadexplorer.com/nft/${COOKIE_ADDRESS}/${tokenId}`;

const xShareUrl = (tokenId: number) => {
  const text = `My COOKIE #${tokenId} on Monad 🍪✨`;
  const url = explorerNftUrl(tokenId);
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(
    url,
  )}`;
};

export default function Page() {
  const qc = useQueryClient();
  const { address, chain, isConnected, status } = useAccount();
  const connected = isConnected && !!address;

  // Local UI state
  const [lastMinted, setLastMinted] = React.useState<number | null>(null);
  const [holdingIds, setHoldingIds] = React.useState<number[]>([]);
  const [scanNote, setScanNote] = React.useState<string | null>(null);

  // Keep the previous address (for clearing LS keys safely on disconnect)
  const prevAddrRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (address) prevAddrRef.current = address;
  }, [address]);

  // --- Helpers -------------------------------------------------------------

  const clearWalletUI = React.useCallback(() => {
    // Clear React state
    setLastMinted(null);
    setHoldingIds([]);
    setScanNote(null);

    // Clear react-query caches keyed without address (defensive)
    qc.removeQueries({ queryKey: ['lastMinted'] });
    qc.removeQueries({ queryKey: ['holdings'] });

    // Clear localStorage caches (address-scoped & generic)
    try {
      const a = prevAddrRef.current ?? address ?? '';
      localStorage.removeItem('fc:lastMinted');
      if (a) {
        localStorage.removeItem(`fc:lastMinted:${a}`);
        localStorage.removeItem(`fc:holdings:${a}`);
      }
    } catch {
      /* ignore */
    }
  }, [qc, address]);

  // Reset when wallet disconnects
  useAccountEffect({
    onDisconnect() {
      clearWalletUI();
    },
  });

  // --- Queries (disabled when not connected) -------------------------------

  const lastMintQ = useQuery({
    queryKey: ['lastMinted', address],
    enabled: !!address, // auto-disable when disconnected
    staleTime: 60_000,
    queryFn: async () => {
      const r = await fetch(`/api/last-minted?address=${address}`, {
        cache: 'no-store',
      });
      const j = await r.json();
      // { ok: true, tokenId: number | null }
      return (j?.tokenId ?? null) as number | null;
    },
  });

  React.useEffect(() => {
    setLastMinted(lastMintQ.data ?? null);
  }, [lastMintQ.data]);

  const holdingsQ = useQuery({
    queryKey: ['holdings', address, COOKIE_ADDRESS],
    enabled: !!address && !!COOKIE_ADDRESS,
    staleTime: 60_000,
    queryFn: async () => {
      const r = await fetch(
        `/api/holdings?address=${address}&contract=${COOKIE_ADDRESS}`,
        { cache: 'no-store' },
      );
      const j = await r.json();
      // { ok: true, tokenIds: number[], note?: string }
      if (j?.note) setScanNote(j.note as string);
      const ids = Array.isArray(j?.tokenIds) ? (j.tokenIds as number[]) : [];
      // Sort ascending & unique (defensive)
      return Array.from(new Set(ids)).sort((a, b) => a - b);
    },
  });

  React.useEffect(() => {
    setHoldingIds(holdingsQ.data ?? []);
  }, [holdingsQ.data]);

  // Light polling (once per minute) while connected
  React.useEffect(() => {
    if (!connected) return;
    const t = window.setInterval(() => {
      qc.invalidateQueries({ queryKey: ['lastMinted', address] });
      qc.invalidateQueries({ queryKey: ['holdings', address, COOKIE_ADDRESS] });
    }, 60_000);
    return () => window.clearInterval(t);
  }, [connected, address, qc]);

  // --- UI ------------------------------------------------------------------

  return (
    <main className="mx-auto max-w-6xl p-6 text-zinc-100">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Inputs (kept minimal; your existing mint/generate UI can live here) */}
        <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400">Topic / hint</label>
              <input
                className="mt-1 w-full rounded-lg bg-zinc-800/60 px-3 py-2 outline-none"
                placeholder="e.g., gas efficiency, launch day, testnet"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400">Vibe</label>
                <input
                  defaultValue="optimistic"
                  className="mt-1 w-full rounded-lg bg-zinc-800/60 px-3 py-2 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400">Name (optional)</label>
                <input
                  className="mt-1 w-full rounded-lg bg-zinc-800/60 px-3 py-2 outline-none"
                  placeholder="your name/team"
                />
              </div>
            </div>

            <button
              type="button"
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium hover:bg-indigo-500"
            >
              Generate with AI
            </button>

            <div>
              <label className="block text-sm text-zinc-400">Fortune (preview)</label>
              <textarea className="mt-1 h-28 w-full resize-none rounded-lg bg-zinc-800/60 px-3 py-2 outline-none" />
              <p className="mt-2 text-xs text-zinc-500">
                Tip: keep under ~160 chars (contract allows up to 240 bytes).
              </p>
            </div>

            <button
              type="button"
              className="rounded-lg bg-violet-600 px-4 py-2 font-semibold hover:bg-violet-500"
            >
              Mint This Fortune
            </button>
          </div>
        </section>

        {/* Right: Status & on-chain info */}
        <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Status
          </h2>

          <div className="space-y-1 text-sm">
            <div>
              <span className="mr-2">Status:</span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  connected ? 'bg-emerald-900/40 text-emerald-200' : 'bg-zinc-700/40'
                }`}
              >
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div>
              Network:&nbsp;{connected ? chain?.name ?? '—' : '—'}
            </div>
            <div>
              Address:&nbsp;
              {connected && address
                ? `${address.slice(0, 6)}…${address.slice(-4)}`
                : '—'}
            </div>
          </div>

          {/* Last minted */}
          <div className="mt-6 space-y-2">
            <div className="text-sm font-medium text-zinc-300">Last minted</div>
            {!connected ? (
              <div>—</div>
            ) : lastMintQ.isLoading ? (
              <div className="text-zinc-400">loading…</div>
            ) : lastMinted == null ? (
              <div>—</div>
            ) : (
              <div className="space-x-2">
                <span>{`COOKIE #${lastMinted}`}</span>
                <a
                  href={explorerNftUrl(lastMinted)}
                  target="_blank"
                  className="text-indigo-300 hover:underline"
                >
                  view
                </a>
                <a
                  href={xShareUrl(lastMinted)}
                  target="_blank"
                  className="text-indigo-300 hover:underline"
                >
                  share on X
                </a>
              </div>
            )}
          </div>

          {/* Holdings */}
          <div className="mt-6 space-y-2">
            <div className="text-sm font-medium text-zinc-300">
              All minted to this wallet <span className="text-zinc-500">(currently holding)</span>
            </div>

            {!connected ? (
              <div>—</div>
            ) : holdingsQ.isLoading ? (
              <div className="text-zinc-400">loading…</div>
            ) : holdingIds.length === 0 ? (
              <div>—</div>
            ) : (
              <ul className="list-disc space-y-1 pl-5">
                {holdingIds.map((id) => (
                  <li key={id}>
                    <span>{`COOKIE #${id}`}</span>
                    <span className="mx-1">•</span>
                    <a
                      href={explorerNftUrl(id)}
                      target="_blank"
                      className="text-indigo-300 hover:underline"
                    >
                      view
                    </a>
                    <span className="mx-1">•</span>
                    <a
                      href={xShareUrl(id)}
                      target="_blank"
                      className="text-indigo-300 hover:underline"
                    >
                      share on X
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {connected && scanNote ? (
              <div className="pt-1 text-xs text-zinc-500">{scanNote}</div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
