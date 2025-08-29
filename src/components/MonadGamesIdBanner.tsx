'use client';

import * as React from 'react';
import { useAccount, useAccountEffect } from 'wagmi';
import {
  createPublicClient,
  encodeFunctionData,
  decodeFunctionResult,
  http,
  zeroAddress,
  type Address,
} from 'viem';
import { usePrivy, useCrossAppAccounts } from '@privy-io/react-auth';
import type {
  CrossAppAccountWithMetadata,
  LinkedAccountWithMetadata,
} from '@privy-io/react-auth';
import { monadTestnet } from '../lib/chain';

const SCORE_CONTRACT_ADDRESS = '0xceCBFF203C8B6044F52CE23D914A1bfD997541A4' as const;
const COOKIE_ADDRESS = process.env.NEXT_PUBLIC_COOKIE_ADDRESS as `0x${string}` | undefined;

// ABI for score contract getters (client reads only)
const SCORE_CONTRACT_ABI = [
  {
    type: 'function',
    name: 'totalTransactionsOfPlayer',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: 'count', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'totalScoreOfPlayer',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: 'score', type: 'uint256' }],
  },
] as const;

// ERC-721 Transfer event ABI (to detect session mints)
const ERC721_TRANSFER_ABI = [
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
    anonymous: false,
  },
] as const;

export default function MonadGamesIdBanner() {
  // Rainbow (wagmi) wallet connection
  const { address: connectedWallet, isConnected } = useAccount();

  // Privy
  const { authenticated, login, user } = usePrivy();
  const { linkCrossAppAccount } = useCrossAppAccounts();

  // UI state
  const [status, setStatus] = React.useState<string | null>(null);
  const [username, setUsername] = React.useState<string | null>(null);
  const [crossAppAddr, setCrossAppAddr] = React.useState<`0x${string}` | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Session-only mints counter (scoreAmount)
  const [sessionMints, setSessionMints] = React.useState<number>(0);


const mgidPopupRef = React.useRef<Window | null>(null);
const MGID_POPUP_FEATURES =
  'popup=yes,width=520,height=720,menubar=0,toolbar=0,location=0,status=0,scrollbars=1,resizable=1';

async function hasUsernameFor(wallet: `0x${string}`) {
  const r = await fetch(
    `https://monad-games-id-site.vercel.app/api/check-wallet?wallet=${wallet}`,
    { method: 'GET', cache: 'no-store' }
  );
  const j = await r.json();
  return Boolean(j?.hasUsername && j?.user?.username);
}

// Persist per tab & per wallet
const storageKey = React.useMemo(
  () => (connectedWallet ? `mgid:mints:${connectedWallet.toLowerCase()}` : 'mgid:mints'),
  [connectedWallet]
);

// Load EARLY so other effects don't flash 0
React.useLayoutEffect(() => {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (raw !== null) {
      const n = Number.parseInt(raw, 10);
      if (Number.isFinite(n) && n >= 0) setSessionMints(n);
    }
  } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [storageKey]);

// Migrate generic → per-wallet once address is known
React.useEffect(() => {
  if (!connectedWallet) return;
  try {
    const genericKey = 'mgid:mints';
    const addrKey = `mgid:mints:${connectedWallet.toLowerCase()}`;
    if (!sessionStorage.getItem(addrKey)) {
      const raw = sessionStorage.getItem(genericKey);
      if (raw !== null) {
        sessionStorage.setItem(addrKey, raw);
        sessionStorage.removeItem(genericKey);
        const n = Number.parseInt(raw, 10);
        if (Number.isFinite(n) && n >= 0) setSessionMints(n);
      }
    }
  } catch {}
}, [connectedWallet]);

// Save on every change
React.useEffect(() => {
  try { sessionStorage.setItem(storageKey, String(sessionMints)); } catch {}
}, [storageKey, sessionMints]);


// add with your other useState hooks
const [needsUsername, setNeedsUsername] = React.useState(false);

// add with your other helpers
const openUsernameWindow = React.useCallback(() => {
  const features =
    'popup=yes,width=520,height=720,menubar=0,toolbar=0,location=0,status=0,scrollbars=1,resizable=1';
  window.open('https://monad-games-id-site.vercel.app/', 'mgid_register', features);
}, []);


  // Live preview in banner
  const [scorePreview, setScorePreview] = React.useState<number | null>(null);     // session mints
  const [txPreview, setTxPreview] = React.useState<number | null>(null);          // on-chain total txs (actual)
  const [totalScorePreview, setTotalScorePreview] = React.useState<number | null>(null); // on-chain total score (actual)

  // Last submitted (echo in status)
  const [mintCount, setMintCount] = React.useState<number | null>(null);
  const [txCount, setTxCount] = React.useState<number | null>(null);

  // Provider App ID for Monad Games ID-only login/linking
  const [providerAppId, setProviderAppId] = React.useState<string | null>(null);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/privy-config', { cache: 'no-store' });
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as { appId: string; providerAppId: string };
        if (alive) setProviderAppId(j.providerAppId);
      } catch {
        if (alive) setProviderAppId(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // viem public client
  const clientRef = React.useRef(
    createPublicClient({
      chain: monadTestnet,
      transport: http((monadTestnet.rpcUrls?.default?.http?.[0] as string) || ''),
    })
  );
  const client = clientRef.current;

  // Detect cross-app embedded wallet (Monad Games ID)
  const checkLinked = React.useCallback(() => {
    if (!authenticated || !user) return;
    const cross = (user.linkedAccounts ?? []).find(
      (a: LinkedAccountWithMetadata): a is CrossAppAccountWithMetadata =>
        (a as any).type === 'cross_app'
    );
    const addr = cross?.embeddedWallets?.[0]?.address as `0x${string}` | undefined;
    if (addr) setCrossAppAddr(addr);
  }, [authenticated, user]);

  // Wallet connect/disconnect
  useAccountEffect({
    onConnect() {
      // Reset session score each time a wallet connects
      //setSessionMints(0);
      checkLinked();
    },
    onDisconnect() {
      setStatus(null);
      setUsername(null);
      setCrossAppAddr(null);
      //setSessionMints(0);
      setScorePreview(null);
      setTxPreview(null);
      setTotalScorePreview(null);
      setMintCount(null);
      setTxCount(null);
    },
  });

  React.useEffect(() => {
    checkLinked();
  }, [checkLinked]);

  // Watch NEW mints this session (Transfer from 0x0 → connected wallet)
  React.useEffect(() => {
    if (!isConnected || !connectedWallet || !COOKIE_ADDRESS) return;

    const unwatch = client.watchContractEvent({
      address: COOKIE_ADDRESS,
      abi: ERC721_TRANSFER_ABI,
      eventName: 'Transfer',
      onLogs: (logs) => {
        for (const log of logs) {
          try {
            const from = (log as any).args?.from as `0x${string}` | undefined;
            const to = (log as any).args?.to as `0x${string}` | undefined;
            if (!from || !to) continue;
            if (
              from.toLowerCase() === zeroAddress &&
              to.toLowerCase() === connectedWallet.toLowerCase()
            ) {
              setSessionMints((x) => x + 1);
            }
          } catch {
            // ignore malformed log
          }
        }
      },
    });

    return () => {
      try {
        unwatch?.();
      } catch {}
    };
  }, [isConnected, connectedWallet, COOKIE_ADDRESS, client]);

  // Resolve Monad Games ID username
React.useEffect(() => {
  let cancelled = false;

  (async () => {
    if (!authenticated || !crossAppAddr) return;

    try {
      setStatus('Resolving player name…');
      const res = await fetch(
        `https://monad-games-id-site.vercel.app/api/check-wallet?wallet=${crossAppAddr}`,
        { method: 'GET', cache: 'no-store' }
      );
      const json = await res.json();
      if (cancelled) return;

      if (json?.hasUsername && json?.user?.username) {
        setUsername(json.user.username as string);
        setNeedsUsername?.(false); // if you use this flag
        setStatus(null);
      } else {
        // open a SEPARATE WINDOW right after successful MGID connection
        const w = window.open(
          'https://monad-games-id-site.vercel.app/',
          'mgid_register',
          'popup=yes,width=520,height=720,menubar=0,toolbar=0,location=0,status=0,scrollbars=1,resizable=1'
        );
        if (!w) {
          // popup blocked → optional fallback UI
          setNeedsUsername?.(true);
          setStatus('Username required. Please open the registration window.');
        } else {
          setNeedsUsername?.(false);
          setStatus('Please register a username in the opened window.');
        }
      }
    } catch {
      // optional fallback
      setNeedsUsername?.(true);
      setStatus('Could not verify username. Please open the registration window.');
    }
  })();

  return () => { cancelled = true; };
}, [authenticated, crossAppAddr]);

/*  React.useEffect(() => {
    const run = async () => {
      if (!crossAppAddr) return;
      try {
        setStatus('Resolving player name…');
        const res = await fetch(
          `https://monad-games-id-site.vercel.app/api/check-wallet?wallet=${crossAppAddr}`,
          { method: 'GET' }
        );
        const json = await res.json();
        if (json?.hasUsername && json?.user?.username) {
          setUsername(json.user.username as string);
          setNeedsUsername(false);
          setStatus(null);
        }else {
          setNeedsUsername(true);          // show the separate button
          setStatus('Username required');  // optional message
        }
      } catch {
        setStatus('Failed to resolve username');
      }
    };
    run();
  }, [crossAppAddr]);

  */

  // Read on-chain totals (actual, no +1)
  const readOnchainTxTotal = React.useCallback(
    async (player: Address) => {
      try {
        const data = encodeFunctionData({
          abi: SCORE_CONTRACT_ABI,
          functionName: 'totalTransactionsOfPlayer',
          args: [player],
        });
        const res = await client.call({ to: SCORE_CONTRACT_ADDRESS, data });
        if (!res.data) return 0;
        const decoded = decodeFunctionResult({
          abi: SCORE_CONTRACT_ABI,
          functionName: 'totalTransactionsOfPlayer',
          data: res.data,
        }) as bigint;
        return Number(decoded ?? 0n);
      } catch {
        return 0;
      }
    },
    [client]
  );

  const readOnchainTotalScore = React.useCallback(
    async (player: Address) => {
      try {
        const data = encodeFunctionData({
          abi: SCORE_CONTRACT_ABI,
          functionName: 'totalScoreOfPlayer',
          args: [player],
        });
        const res = await client.call({ to: SCORE_CONTRACT_ADDRESS, data });
        if (!res.data) return 0;
        const decoded = decodeFunctionResult({
          abi: SCORE_CONTRACT_ABI,
          functionName: 'totalScoreOfPlayer',
          data: res.data,
        }) as bigint;
        return Number(decoded ?? 0n);
      } catch {
        // If the exact view name differs on-chain, fail silently and show 0
        return 0;
      }
    },
    [client]
  );

  // Preview values in banner: session mints + ACTUAL on-chain totals
  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!crossAppAddr) {
        setScorePreview(null);
        setTxPreview(null);
        setTotalScorePreview(null);
        return;
      }
      const [txTotal, scoreTotal] = await Promise.all([
        readOnchainTxTotal(crossAppAddr),
        readOnchainTotalScore(crossAppAddr),
      ]);
      if (!alive) return;
      setScorePreview(sessionMints);
      setTxPreview(txTotal);
      setTotalScorePreview(scoreTotal);
    })();
    return () => {
      alive = false;
    };
  }, [crossAppAddr, sessionMints, readOnchainTxTotal, readOnchainTotalScore]);

  // Login/link flow (Monad Games ID only)
const handleLoginOrLink = async () => {
  try {
    // 1) Pre-open a POPUP WINDOW from the user click (not a tab)
    const features =
      'popup=yes,width=520,height=720,menubar=0,toolbar=0,location=0,' +
      'status=0,scrollbars=1,resizable=1';
    const popup = typeof window !== 'undefined'
      ? window.open('about:blank', 'mgid_register', features)
      : null;

    // Optional: write a quick loading page so it’s not blank
    try {
      popup?.document?.write(
        '<!doctype html><title>Monad Games ID</title>' +
        '<body style="font:14px system-ui;padding:20px;background:#0b0b10;color:#e5e7eb">' +
        'Preparing Monad Games ID…</body>'
      );
      popup?.document?.close();
    } catch {}

    // 2) Run login/link flow as before
    if (authenticated) {
      if (!crossAppAddr && providerAppId) {
        setStatus('Linking Monad Games ID…');
        await linkCrossAppAccount({ appId: providerAppId });
      }
    } else {
      if (providerAppId) {
        setStatus('Opening login…');
        await (login as any)({
          loginMethodsAndOrder: { primary: [`privy:${providerAppId}`] },
        });
      } else {
        await login();
      }
    }

    // 3) Wait briefly for embedded wallet to appear
    const waitForAddr = async (): Promise<`0x${string}` | null> => {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        // read latest from Privy user
        const u: any = user;
        const cross = (u?.linkedAccounts ?? []).find((a: any) => a?.type === 'cross_app');
        const addr = cross?.embeddedWallets?.[0]?.address as `0x${string}` | undefined;
        if (addr) return addr;
        await new Promise(r => setTimeout(r, 100));
      }
      return null;
    };

    const addr = await waitForAddr();
    if (!addr) {
      setStatus('Could not detect embedded wallet after login.');
      try { popup?.close?.(); } catch {}
      return;
    }

    // 4) Check if username exists
    const hasUsername = async (wallet: `0x${string}`) => {
      const r = await fetch(
        `https://monad-games-id-site.vercel.app/api/check-wallet?wallet=${wallet}`,
        { method: 'GET', cache: 'no-store' }
      );
      const j = await r.json();
      return Boolean(j?.hasUsername && j?.user?.username);
    };

    if (await hasUsername(addr)) {
      // player already has a username → close popup if we opened it
      try { popup?.close?.(); } catch {}
      setStatus(null);
    } else {
      // 5) Navigate the already-open POPUP WINDOW to the registration site
      const url = 'https://monad-games-id-site.vercel.app/';
      if (popup && !popup.closed) {
        popup.location.replace(url); // actual separate WINDOW, not a tab
      } else {
        // fallback (should rarely happen)
        window.open(url, 'mgid_register', features);
      }
      setNeedsUsername(true);          // show the separate button
      setStatus('Username required');  // optional message
    }
  } catch (e: any) {
    setStatus(e?.message ?? 'Login/link failed');
  }
};


  // Register score via server signer (relayer)
  const handleRegisterScore = async () => {
    if (!crossAppAddr) return;
    setBusy(true);
    setStatus('Submitting score via game signer…');

    try {
      const res = await fetch('/api/register-score', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          player: crossAppAddr,
          scoreAmount: sessionMints, // session-only
        }),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || `Server error ${res.status}`);
      }

      const json = await res.json();

      const sentScore = Number(json.scoreAmount ?? sessionMints);
      const sentTx = Number(json.transactionAmount ?? 0);

      // show what was sent
      setMintCount(sentScore);
      setTxCount(sentTx);
      setStatus(`Score registered! tx: ${String(json.txHash).slice(0, 10)}…`);

      // ✅ RESET the session score after a successful registration
    // clear persisted counter now that we registered
      try { sessionStorage.removeItem(storageKey); } catch {}
      setSessionMints(0);
      setScorePreview(0);

      // refresh banner's on-chain totals (actual, no +1)
      const [txTotal, scoreTotal] = await Promise.all([
        readOnchainTxTotal(crossAppAddr),
        readOnchainTotalScore(crossAppAddr),
      ]);
      setTxPreview(txTotal);
      setTotalScorePreview(scoreTotal);
    } catch (e: any) {
      setStatus(e?.message || 'Failed to register score');
    } finally {
      setBusy(false);
    }
  };

  if (!isConnected) return null;

  // Styles (purple/black theme, larger buttons, white text)
  const containerStyle: React.CSSProperties = {
    marginBottom: 16,
    borderRadius: 16,
    border: '1px solid rgba(168,85,247,0.35)',
    background:
      'linear-gradient(90deg, rgba(88,28,135,0.35) 0%, rgba(76,29,149,0.25) 50%, rgba(0,0,0,0.5) 100%)',
    padding: 16,
    color: '#fff',
    boxShadow: '0 0 20px rgba(168,85,247,0.12)',
  };
  const titleStyle: React.CSSProperties = {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'rgba(216,180,254,0.9)',
    marginBottom: 6,
  };
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  };
  const textStyle: React.CSSProperties = {
    fontSize: 13,
    color: 'rgba(233,213,255,0.92)',
  };
  const smallMono: React.CSSProperties = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    color: '#e9d5ff',
  };
  const btnSolidPurpleBig: React.CSSProperties = {
    borderRadius: 14,
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 800,
    border: 'none',
    background: '#7c3aed',
    color: '#fff',
    cursor: 'pointer',
  };
  const btnOutlinePurpleBig: React.CSSProperties = {
    borderRadius: 14,
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 800,
    border: '1px solid rgba(167,139,250,0.8)',
    background: 'rgba(124,58,237,0.25)',
    color: '#fff',
    cursor: 'pointer',
  };

  const showLoginOrLink = !authenticated || !crossAppAddr;
  const loginOrLinkLabel =
    authenticated && !crossAppAddr ? 'link monad games id' : 'login/signup with monad games id';

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>Monad Games ID</div>

      {/* Top row: info at left, main action at right */}
      <div style={rowStyle}>
        {!authenticated || !crossAppAddr ? (
          <div style={textStyle}>
            Link your <b>Monad Games ID</b> to show your player name and smart wallet. Then you
            can register your score on-chain.
          </div>
        ) : (
          <div style={{ ...textStyle, flex: 1, minWidth: 260 }}>
            Player: <b style={{ color: '#fff' }}>{username ?? '—'}</b> • Smart Wallet:{' '}
            <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
              {crossAppAddr}
            </span>
          </div>
        )}

        {showLoginOrLink ? (
          <button style={btnSolidPurpleBig} onClick={handleLoginOrLink}>
            {loginOrLinkLabel}
          </button>
        ) : (
          <button style={btnOutlinePurpleBig} onClick={handleRegisterScore} disabled={busy}>
            {busy ? 'Registering…' : 'Register score'}
          </button>
        )}
      </div>

      {/* Live values that will be used */}
      {authenticated && crossAppAddr ? (
        <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={smallMono}>
            scoreAmount:{' '}
            <b style={{ color: '#fff' }}>{scorePreview ?? '—'}</b>{' '}
            <span style={{ opacity: 0.8 }}>(session mints)</span>
          </div>
          <div style={smallMono}>
            transactionAmount:{' '}
            <b style={{ color: '#fff' }}>{txPreview ?? '—'}</b>{' '}
            <span style={{ opacity: 0.8 }}>(on-chain total)</span>
          </div>
          <div style={smallMono}>
            totalScore:{' '}
            <b style={{ color: '#fff' }}>{totalScorePreview ?? '—'}</b>{' '}
            <span style={{ opacity: 0.8 }}>(on-chain total score)</span>
          </div>
        </div>
      ) : null}


    {/* NEW: show a separate button if username is missing */}
    {authenticated && crossAppAddr && needsUsername ? (
      <div
        style={{
          marginTop: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: 12,
          borderRadius: 12,
          border: '1px solid rgba(167,139,250,0.35)',
          background: 'rgba(124,58,237,0.15)',
        }}
      >
        <div style={textStyle}>
          No username yet for this Monad Games ID. Please register one.
        </div>
        <button style={btnSolidPurpleBig} onClick={openUsernameWindow}>
          Open Monad Games ID ↗
        </button>
      </div>
    ) : null}


      {authenticated && crossAppAddr ? (
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4, color: 'rgba(233,213,255,0.9)' }}>
          * scoreAmount counts new mints this session. Leaving the page resets it.
        </div>
      ) : null}

      {status ? (
        <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(233,213,255,0.9)' }}>
          {status}
          {mintCount !== null && txCount !== null ? (
            <span style={{ marginLeft: 8 }}>
              (sent scoreAmount{' '}
              <span style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{mintCount}</span>, transactionAmount{' '}
              <span style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{txCount}</span>)
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
