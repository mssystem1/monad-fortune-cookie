'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseEventLogs, parseAbiItem } from 'viem';
import cookieAbiJson from '../abi/FortuneCookiesAI.json';
import { monadTestnet } from '../lib/chain';

// ─────────────────────────── Config ───────────────────────────

// Contract address from env (public)
const CONTRACT = (() => {
  const v = process.env.NEXT_PUBLIC_COOKIE_ADDRESS as `0x${string}` | undefined;
  if (!v) throw new Error('NEXT_PUBLIC_COOKIE_ADDRESS is not set in .env.local');
  return v;
})();

// Cast the ABI loosely to avoid deep type instantiations
const cookieAbi = cookieAbiJson as any;

// Only used to decode the tx receipt after mint (no global log scans)
const EV_COOKIE = parseAbiItem(
  'event CookieMinted(address indexed minter, uint256 indexed tokenId, string fortune)'
);
const EV_TRANSFER = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
);
const ABI_COOKIE = [EV_COOKIE] as const;
const ABI_TRANSFER = [EV_TRANSFER] as const;

const explorerUrlFor = (tokenId: bigint | string) =>
  `https://testnet.monadexplorer.com/nft/${CONTRACT}/${tokenId.toString()}`;

// ─────────────────────────── Component ───────────────────────────

export default function Page() {
  const { address, chain, status } = useAccount();
  const { data: walletClient } = useWalletClient();
  const pc = usePublicClient();

  const isConnected = status === 'connected' && !!address;
  const onCorrectNetwork = chain?.id === monadTestnet.id;

  // UI/form
  const [topic, setTopic] = useState('');
  const [vibe, setVibe] = useState('optimistic');
  const [name, setName] = useState('');
  const [fortune, setFortune] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [mintLoading, setMintLoading] = useState(false);

  // Data
  const [lastToken, setLastToken] = useState<bigint | null>(null);
  const [heldTokens, setHeldTokens] = useState<bigint[]>([]);
  const [holdNote, setHoldNote] = useState<string>('');

  // Status pill
  function humanStatus(): { text: string; tone: 'ok' | 'warn' | 'err' } {
    if (!isConnected) return { text: 'Disconnected', tone: 'warn' };
    if (!onCorrectNetwork) return { text: `Wrong network — switch to Monad Testnet (${monadTestnet.id})`, tone: 'err' };
    if (!walletClient) return { text: 'Connected (read-only). Open wallet to enable mint.', tone: 'warn' };
    return { text: 'Connected and ready', tone: 'ok' };
  }
  const st = humanStatus();
  const badgeStyle: React.CSSProperties = {
    display: 'inline-block', padding: '2px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
    background: st.tone === 'ok' ? '#e6ffed' : st.tone === 'warn' ? '#fffbe6' : '#ffecec',
    color: st.tone === 'ok' ? '#056d2b' : st.tone === 'warn' ? '#7a5b00' : '#8a0012',
  };

  // ───────── server: last-minted (load/save) ─────────
  const savingLastRef = useRef(false);

  async function loadLastFromServer() {
    if (!address) return;
    try {
      const res = await fetch(
        `/api/last-minted?address=${address}&contract=${CONTRACT}&chainId=${monadTestnet.id}`,
        { cache: 'no-store' }
      );
      if (!res.ok) return;
      const j = await res.json();
      if (j?.tokenId) setLastToken(BigInt(j.tokenId));
    } catch {
      // ignore
    }
  }

  async function saveLastToServer(tokenId: bigint) {
    if (!address || savingLastRef.current) return;
    savingLastRef.current = true;
    try {
      await fetch(
        `/api/last-minted?address=${address}&contract=${CONTRACT}&chainId=${monadTestnet.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenId: tokenId.toString() }),
        }
      );
    } catch {
      // ignore
    } finally {
      savingLastRef.current = false;
    }
  }

  // ───────── holdings: server (BlockVision and/or enumerable via /api/holdings) ─────────
  async function refreshHoldings() {
    if (!address) { setHeldTokens([]); setHoldNote(''); return; }
    setHoldNote('loading…');
    try {
      const r = await fetch(`/api/holdings?address=${address}&contract=${CONTRACT}`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok || !j?.ok) {
        setHeldTokens([]);
        setHoldNote(j?.error || 'indexer error');
        return;
      }
      const ids: bigint[] = (j.tokenIds as string[] | undefined)?.map((s) => BigInt(s)) ?? [];
      ids.sort((a, b) => (a < b ? -1 : 1));
      setHeldTokens(ids);
      setHoldNote(j.source ? `from ${j.source} (${ids.length})` : `from server (${ids.length})`);
    } catch (e: any) {
      setHeldTokens([]);
      setHoldNote(e?.message || 'failed to load');
    }
  }

  // ───────── effects ─────────
  useEffect(() => {
    if (!isConnected || !onCorrectNetwork) return;
    loadLastFromServer();
    refreshHoldings(); // No polling; manual Refresh or after mint
  }, [isConnected, onCorrectNetwork, address]);

  // ───────── actions ─────────
  const pcRef = useRef(pc);
  useEffect(() => { pcRef.current = pc; }, [pc]);

  async function generateFortune() {
    setGenLoading(true);
    try {
      const res = await fetch('/api/fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, vibe, name }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'AI failed');
      setFortune(String(j.fortune || ''));
    } catch (e: any) {
      alert(e?.message || 'Failed to generate fortune');
    } finally {
      setGenLoading(false);
    }
  }

  async function mint() {
    if (!walletClient || chain?.id !== monadTestnet.id) {
      alert(`Connect wallet on Monad Testnet (${monadTestnet.id})`);
      return;
    }
    if (!fortune) { alert('Generate a fortune first'); return; }

    setMintLoading(true);
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT,
        abi: cookieAbi,
        functionName: 'mintWithFortune',
        args: [fortune],
        chain: monadTestnet,
        account: address as `0x${string}`,
      });

      // Wait for the tx receipt; this is the only on-chain read on client
      const receipt = await pcRef.current!.waitForTransactionReceipt({ hash });

      // Extract tokenId from the tx receipt logs (no global scans)
      const cookieEvents = parseEventLogs({
        abi: ABI_COOKIE,
        logs: receipt.logs as any,
        eventName: 'CookieMinted',
        strict: false,
      });

      let tid: bigint | null = null;
      if (cookieEvents.length) {
        tid = cookieEvents[cookieEvents.length - 1].args.tokenId as bigint;
      } else {
        const transfers = parseEventLogs({
          abi: ABI_TRANSFER,
          logs: receipt.logs as any,
          eventName: 'Transfer',
          strict: false,
        });
        if (transfers.length) {
          tid = transfers[transfers.length - 1].args.tokenId as bigint;
        }
      }

      if (tid != null) {
        setLastToken(tid);
        saveLastToServer(tid);
      }

      // Refresh holdings after successful mint (server-side, fast)
      await refreshHoldings();
    } catch (e: any) {
      alert(e?.shortMessage || e?.message || 'Mint failed');
    } finally {
      setMintLoading(false);
    }
  }

  // ───────── UI helpers ─────────
  const shortAddr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '—';
  const explorerUrl = lastToken != null ? explorerUrlFor(lastToken) : null;
  const shareUrl =
    lastToken != null && explorerUrl
      ? `https://x.com/intent/tweet?text=${encodeURIComponent(
          `I just minted COOKIE #${lastToken.toString()} on Monad Testnet!`
        )}&url=${encodeURIComponent(explorerUrl)}`
      : null;

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ───────── render ─────────
  return (
    <div className="container" style={{ padding: 16, maxWidth: 980, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', marginBottom: 12 }}>
        <div />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <ConnectButton />
        </div>
      </div>

      <div className="row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Left: AI + Mint */}
        <div className="card" style={{ padding: 12, border: '1px solid #eee', borderRadius: 12 }}>
          <label>Topic / hint</label>
          <input
            className="input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., gas efficiency, launch day, testnet"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label>Vibe</label>
              <input
                className="input"
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder="optimistic, playful, zen…"
              />
            </div>
            <div>
              <label>Name (optional)</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="your name/team"
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <button type="button" className="button" onClick={generateFortune} disabled={genLoading}>
              {genLoading ? 'Generating…' : 'Generate with AI'}
            </button>
          </div>

          <div style={{ marginTop: 10 }}>
            <label>Fortune (preview)</label>
            <textarea className="input" rows={3} value={fortune} onChange={(e) => setFortune(e.target.value)} />
            <div className="small" style={{ marginTop: 6, opacity: 0.7 }}>
              Tip: keep under ~160 chars (contract allows up to 240 bytes).
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className="button"
              onClick={mint}
              disabled={mintLoading || !fortune || !onCorrectNetwork || !isConnected}
            >
              {mintLoading ? 'Minting…' : 'Mint This Fortune'}
            </button>
          </div>
        </div>

        {/* Right: Status + Last + Holdings */}
        <div className="card" style={{ padding: 12, border: '1px solid #eee', borderRadius: 12 }}>
          <div className="small">Status</div>
          <div style={{ marginBottom: 6 }}>
            <span style={badgeStyle}>{st.text}</span>
          </div>
          <div>
            Network: <b suppressHydrationWarning>{mounted ? (chain?.name || '—') : '—'}</b>
          </div>
          <div>
            Address: <b suppressHydrationWarning>{mounted && address ? shortAddr : '—'}</b>
          </div>

          <div style={{ marginTop: 12 }} className="small">Last minted</div>
          <div>
            {lastToken ? (
              <>
                COOKIE #{lastToken.toString()}
                {explorerUrl && (
                  <>
                    {' '}•{' '}
                    <a target="_blank" rel="noreferrer" href={explorerUrl}>view</a>
                    {' '}•{' '}
                    <a target="_blank" rel="noreferrer" href={shareUrl!}>share on X</a>
                  </>
                )}
              </>
            ) : '—'}
          </div>

          <div style={{ marginTop: 16 }} className="small">All minted to this wallet (currently holding)</div>
          <div>
            {!heldTokens.length ? (
              <div>—{holdNote ? <em style={{ opacity: 0.7 }}> • {holdNote}</em> : null}</div>
            ) : (
              <>
                <ul style={{ paddingLeft: 18, marginTop: 6 }}>
                  {heldTokens.map((id) => {
                    const url = explorerUrlFor(id);
                    const x = `https://x.com/intent/tweet?text=${encodeURIComponent(
                      `I hold COOKIE #${id.toString()} on Monad Testnet!`
                    )}&url=${encodeURIComponent(url)}`;
                    return (
                      <li key={id.toString()} style={{ marginBottom: 10 }}>
                        COOKIE #{id.toString()} •{' '}
                        <a target="_blank" rel="noreferrer" href={url}>view</a>
                        {' '}•{' '}
                        <a target="_blank" rel="noreferrer" href={x}>share on X</a>
                      </li>
                    );
                  })}
                </ul>
                {holdNote ? <div style={{ fontSize: 12, opacity: 0.7 }}>{holdNote}</div> : null}
              </>
            )}
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                className="button"
                style={{ padding: '2px 8px', fontSize: 12 }}
                onClick={refreshHoldings}
                disabled={!isConnected || !onCorrectNetwork}
              >
                Refresh
              </button>
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
            This shows token IDs you <b>currently hold</b> for this collection (from server). No client log scans.
          </div>
        </div>
      </div>
    </div>
  );
}
