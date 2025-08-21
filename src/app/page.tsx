'use client';

import * as React from 'react';
import { useAccount, useAccountEffect } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const COOKIE_ADDRESS = process.env.NEXT_PUBLIC_COOKIE_ADDRESS as string;

const explorerNftUrl = (tokenId: number) =>
  `https://testnet.monadexplorer.com/nft/${COOKIE_ADDRESS}/${tokenId}`;

const xShareUrl = (tokenId: number) => {
  const text = `My COOKIE #${tokenId} on Monad 🍪✨`;
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(
    explorerNftUrl(tokenId),
  )}`;
};

export default function Page() {
  const qc = useQueryClient();
  const { address, chain, isConnected } = useAccount();
  const connected = isConnected && !!address;

  const [lastMinted, setLastMinted] = React.useState<number | null>(null);
  const [holdingIds, setHoldingIds] = React.useState<number[]>([]);
  const [scanNote, setScanNote] = React.useState<string | null>(null);

  const prevAddrRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (address) prevAddrRef.current = address;
  }, [address]);

  const clearWalletUI = React.useCallback(() => {
    setLastMinted(null);
    setHoldingIds([]);
    setScanNote(null);
    qc.removeQueries({ queryKey: ['lastMinted'] });
    qc.removeQueries({ queryKey: ['holdings'] });
    try {
      const a = prevAddrRef.current ?? address ?? '';
      localStorage.removeItem('fc:lastMinted');
      if (a) {
        localStorage.removeItem(`fc:lastMinted:${a}`);
        localStorage.removeItem(`fc:holdings:${a}`);
      }
    } catch {}
  }, [qc, address]);

  useAccountEffect({
    onDisconnect() {
      clearWalletUI();
    },
  });

  const lastMintQ = useQuery({
    queryKey: ['lastMinted', address],
    enabled: !!address,
    staleTime: 60_000,
    queryFn: async () => {
      const r = await fetch(`/api/last-minted?address=${address}`, { cache: 'no-store' });
      const j = await r.json();
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
      if (j?.note) setScanNote(j.note as string);
      const ids = Array.isArray(j?.tokenIds) ? (j.tokenIds as number[]) : [];
      return Array.from(new Set(ids)).sort((a, b) => a - b);
    },
  });
  React.useEffect(() => {
    setHoldingIds(holdingsQ.data ?? []);
  }, [holdingsQ.data]);

  React.useEffect(() => {
    if (!connected) return;
    const t = window.setInterval(() => {
      qc.invalidateQueries({ queryKey: ['lastMinted', address] });
      qc.invalidateQueries({ queryKey: ['holdings', address, COOKIE_ADDRESS] });
    }, 60_000);
    return () => window.clearInterval(t);
  }, [connected, address, qc]);

  return (
    <main className="page-wrap">
      <div className="grid two-col">
        {/* LEFT CARD */}
        <section className="card">
          <h2 className="card-title">Mint a Fortune</h2>

          <div className="form-row">
            <label className="label">Topic / hint</label>
            <input className="input" placeholder="e.g., gas efficiency, launch day, testnet" />
          </div>

          <div className="grid two">
            <div className="form-row">
              <label className="label">Vibe</label>
              <input defaultValue="optimistic" className="input" />
            </div>
            <div className="form-row">
              <label className="label">Name (optional)</label>
              <input className="input" placeholder="your name/team" />
            </div>
          </div>

          <button type="button" className="btn btn-primary">
            Generate with AI
          </button>

          <div className="form-row">
            <label className="label">Fortune (preview)</label>
            <textarea className="textarea" />
            <p className="hint">Tip: keep under ~160 chars (contract allows up to 240 bytes).</p>
          </div>

          <button type="button" className="btn btn-accent">
            Mint This Fortune
          </button>
        </section>

        {/* RIGHT CARD */}
        <section className="card">
          <h2 className="card-title">Status</h2>

          <div className="status">
            <div>
              <span className="muted">Status:</span>{' '}
              <span className={`pill ${connected ? 'pill-ok' : 'pill-off'}`}>
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div>
              <span className="muted">Network:</span> {connected ? chain?.name ?? '—' : '—'}
            </div>
            <div>
              <span className="muted">Address:</span>{' '}
              {connected && address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '—'}
            </div>
          </div>

          <div className="block">
            <div className="block-title">Last minted</div>
            {!connected ? (
              <div className="dash">—</div>
            ) : lastMintQ.isLoading ? (
              <div className="muted">loading…</div>
            ) : lastMinted == null ? (
              <div className="dash">—</div>
            ) : (
              <div className="line">
                <span>{`COOKIE #${lastMinted}`}</span>
                <a href={explorerNftUrl(lastMinted)} target="_blank" className="link">
                  view
                </a>
                <a href={xShareUrl(lastMinted)} target="_blank" className="link">
                  share on X
                </a>
              </div>
            )}
          </div>

          <div className="block">
            <div className="block-title">
              All minted to this wallet <span className="muted">(currently holding)</span>
            </div>

            {!connected ? (
              <div className="dash">—</div>
            ) : holdingsQ.isLoading ? (
              <div className="muted">loading…</div>
            ) : holdingIds.length === 0 ? (
              <div className="dash">—</div>
            ) : (
              <ul className="list">
                {holdingIds.map((id) => (
                  <li key={id} className="line">
                    <span>{`COOKIE #${id}`}</span>
                    <a href={explorerNftUrl(id)} target="_blank" className="link">
                      view
                    </a>
                    <a href={xShareUrl(id)} target="_blank" className="link">
                      share on X
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {connected && scanNote ? <div className="note">{scanNote}</div> : null}
          </div>
        </section>
      </div>

      {/* ---- Minimal fallback CSS so it looks like cards even if Tailwind isn't loaded ---- */}
      <style jsx>{`
        .page-wrap {
          color: #e5e7eb;
          background: #0b0b10;
          min-height: 100dvh;
          padding: 24px;
        }
        .grid.two-col {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 900px) {
          .grid.two-col {
            grid-template-columns: 1fr 1fr;
          }
        }
        .card {
          background: rgba(24, 24, 28, 0.8);
          border: 1px solid rgba(63, 63, 70, 0.7);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        .card-title {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #a1a1aa;
          margin-bottom: 12px;
          font-weight: 700;
        }
        .form-row {
          margin: 14px 0;
        }
        .label {
          display: block;
          font-size: 12px;
          color: #9ca3af;
          margin-bottom: 6px;
        }
        .input,
        .textarea {
          width: 100%;
          background: rgba(39, 39, 42, 0.7);
          border: 1px solid rgba(82, 82, 91, 0.6);
          border-radius: 10px;
          padding: 10px 12px;
          color: #e5e7eb;
          outline: none;
        }
        .textarea {
          min-height: 120px;
          resize: vertical;
        }
        .hint {
          margin-top: 6px;
          font-size: 12px;
          color: #9ca3af;
        }
        .grid.two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .btn {
          display: inline-block;
          border-radius: 10px;
          padding: 10px 14px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          margin: 6px 0;
        }
        .btn-primary {
          background: #4f46e5;
          color: white;
        }
        .btn-primary:hover {
          background: #6366f1;
        }
        .btn-accent {
          background: #7c3aed;
          color: white;
        }
        .btn-accent:hover {
          background: #8b5cf6;
        }
        .status {
          display: grid;
          gap: 6px;
          font-size: 14px;
        }
        .muted {
          color: #9ca3af;
        }
        .pill {
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 12px;
        }
        .pill-ok {
          background: rgba(6, 95, 70, 0.3);
          color: #86efac;
        }
        .pill-off {
          background: rgba(82, 82, 91, 0.5);
          color: #e5e7eb;
        }
        .block {
          margin-top: 18px;
        }
        .block-title {
          font-weight: 600;
          color: #d4d4d8;
          margin-bottom: 6px;
          font-size: 14px;
        }
        .dash {
          color: #a1a1aa;
        }
        .list {
          list-style: disc;
          padding-left: 18px;
          display: grid;
          gap: 6px;
        }
        .line > * + * {
          margin-left: 10px;
        }
        .link {
          color: #a5b4fc;
          text-decoration: none;
        }
        .link:hover {
          text-decoration: underline;
        }
        .note {
          margin-top: 6px;
          font-size: 12px;
          color: #9ca3af;
        }
      `}</style>
    </main>
  );
}
