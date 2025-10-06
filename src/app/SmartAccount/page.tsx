'use client';

import * as React from 'react';
import type { Abi } from 'viem';
import { parseAbi } from 'viem';        
import { isAddressEqual, parseEventLogs, encodeFunctionData, parseEther, zeroAddress, type Address   } from 'viem';
import {
  useAccount,
  useAccountEffect,
  useWaitForTransactionReceipt,
  useWriteContract,
  useBalance,
  useReadContract, 
  useWalletClient,
} from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SaStatusCard } from '../../../src/components/SaStatusCard';
import { useSmartAccount } from '../../app/SmartAccountProvider';
import { bundlerClient } from '../../../src/lib/aa/clients';

// + ADD (keep your other imports intact)
import { buildSmartAccount } from '../../../src/lib/aa/smartAccount';

// ⬇️ RELATIVE imports (keep your own)
import FortuneABI from '../../abi/FortuneCookiesAI.json';
import { monadTestnet } from '../../lib/chain';

// [FIXED] Privy + banner
//import { PrivyProvider } from '@privy-io/react-auth';
<<<<<<< HEAD
import MonadGamesIdBanner from '../../components/MonadGamesIdBanner';
=======
//import MonadGamesIdBanner from '../components/MonadGamesIdBanner';
>>>>>>> 0d0fea5 (Restore working state: remove metamaskSmartAccount.ts, add SmartAccount provider/components, UI fixes)

const COOKIE_ADDRESS = process.env.NEXT_PUBLIC_COOKIE_ADDRESS as `0x${string}`;

const explorerNftUrl = (tokenId: number) =>
  `https://testnet.monadexplorer.com/nft/${COOKIE_ADDRESS}/${tokenId}`;
const xShareUrl = (tokenId: number) => {
  const text = `My COOKIE #${tokenId} on Monad 🍪✨`;
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(
    explorerNftUrl(tokenId),
  )}`;
};

const MIN_ABI = parseAbi([
  'function mintPrice() view returns (uint256)',
  // If your contract takes different args (e.g., (string imageCid, string fortune)), adjust here and in onMintImage()
  'function mintWithImage(string fortune, string imageCid) payable returns (uint256)',
]);

// Minimal AA sender to avoid TS2589 noise
const sendSaUo = async ({
  sa,
  to,
  data,
  value,
}: {
  sa: any; // SmartAccount at runtime
  to: Address;
  data: `0x${string}`;
  value: bigint;
}) => {
  // cast bundlerClient to any locally to avoid deep type expansion
  return (bundlerClient as any).sendUserOperation({
    account: sa as any,
    calls: [{ to, data, value }] as any,
  });
};

export default function Page() {
  const qc = useQueryClient();
  const { address, chain, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const connected = isConnected && !!address;
/*
  // [FIXED] load Privy config from server-only env via /api/privy-config
  const [privyCfg, setPrivyCfg] = React.useState<{ appId: string; providerAppId: string } | null>(null);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/privy-config', { cache: 'no-store' });
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as { appId: string; providerAppId: string };
        if (alive) setPrivyCfg(j);
      } catch {
        if (alive) setPrivyCfg(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
*/
  // Wallet balance (shown in top bar)
  const { data: balance } = useBalance({
    address,
    chainId: monadTestnet.id,
    query: { enabled: !!address },
  });

  // ---------- UI state ----------
  const [topic, setTopic] = React.useState('');
  const [vibe, setVibe] = React.useState('optimistic');
  const [nameOpt, setNameOpt] = React.useState('');
  const [fortune, setFortune] = React.useState('');
  const [genBusy, setGenBusy] = React.useState(false);
  const [mintBusy, setMintBusy] = React.useState(false);
  const [uiError, setUiError] = React.useState<string | null>(null);
  const [lastMinted, setLastMinted] = React.useState<number | null>(null);
  const [holdingIds, setHoldingIds] = React.useState<number[]>([]);
  const [scanNote, setScanNote] = React.useState<string | null>(null);

  // image minting state
  const [imgPrompt, setImgPrompt] = React.useState('');
  const [imgB64, setImgB64] = React.useState<string | null>(null);
  const [pinCid, setPinCid] = React.useState<string | null>(null);
  const [imgBusy, setImgBusy] = React.useState(false);
  const [pinBusy, setPinBusy] = React.useState(false);
  const [mintImgBusy, setMintImgBusy] = React.useState(false);
  const [zoom, setZoom] = React.useState(false);

  const { data: onchainMintPrice } = useReadContract({
    address: COOKIE_ADDRESS,
    abi: MIN_ABI,
    functionName: 'mintPrice',
<<<<<<< HEAD
    query: { refetchInterval: 30000 }, // 30s
=======
    query: { refetchInterval: 120000 }, // 120s
>>>>>>> 0d0fea5 (Restore working state: remove metamaskSmartAccount.ts, add SmartAccount provider/components, UI fixes)
  });

  const prevAddrRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (address) prevAddrRef.current = address;
  }, [address]);

  // ---------- Clear everything on disconnect ----------
  const clearWalletUI = React.useCallback(() => {
    setLastMinted(null);
    setHoldingIds([]);
    setScanNote(null);
    setUiError(null);
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

<<<<<<< HEAD
    // + ADD (don’t remove your current address logic)
=======
  // + ADD (don’t remove your current address logic)
>>>>>>> 0d0fea5 (Restore working state: remove metamaskSmartAccount.ts, add SmartAccount provider/components, UI fixes)
const { mode, eoaAddress, saAddress, saReady, saBalance } = useSmartAccount();

// The wallet address that should drive reads (holdings)
//const selectedAddress: Address | undefined = mode === 'sa' ? saAddress : eoaAddress;

  // ---------- Queries ----------
const lastMintQ = useQuery({
  queryKey: ['lastMinted', saAddress, COOKIE_ADDRESS],
  enabled: !!saAddress && !!COOKIE_ADDRESS,
  staleTime: 60_000,
  queryFn: async () => {
    const r = await fetch(`/api/holdings?address=${saAddress}&contract=${COOKIE_ADDRESS}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    const ids = Array.isArray(j?.tokenIds) ? (j.tokenIds as number[]) : [];
    if (!ids.length) return null;
    return Math.max(...ids);
  },
});

  // Load localStorage fallback on connect (only if server returned null)
  React.useEffect(() => {
    if (!connected) return;
    const serverVal = lastMintQ.data;
    if (serverVal != null) {
      setLastMinted(serverVal);
      try {
        localStorage.setItem(`fc:lastMinted:${saAddress}`, String(serverVal));
      } catch {}
      return;
    }
    // server null/404 → try localStorage
    try {
      const s = localStorage.getItem(`fc:lastMinted:${saAddress}`);
      if (s && !Number.isNaN(Number(s))) setLastMinted(Number(s));
    } catch {}
  }, [connected, saAddress, lastMintQ.data]);


  const holdingsQ = useQuery({
    queryKey: ['holdings', saAddress, COOKIE_ADDRESS],
    enabled: !!saAddress && !!COOKIE_ADDRESS,
    staleTime: 60_000,
    queryFn: async () => {
      const r = await fetch(
        `/api/holdings?address=${saAddress}&contract=${COOKIE_ADDRESS}`,
        { cache: 'no-store' },
      );
      if (!r.ok) return [] as number[];
      const j = await r.json();
      if (j?.note) setScanNote(j.note as string);
      const ids = Array.isArray(j?.tokenIds) ? (j.tokenIds as number[]) : [];
      return Array.from(new Set(ids)).sort((a, b) => a - b);
    },
  });

  // If lastMint still null but we have holdings, use max tokenId as fallback
  React.useEffect(() => {
    if (lastMintQ.isLoading) return;
    if (!connected) return;
    if (lastMintQ.data == null && holdingsQ.data && holdingsQ.data.length > 0) {
      const mx = holdingsQ.data[holdingsQ.data.length - 1];
      setLastMinted(mx);
      try {
        localStorage.setItem(`fc:lastMinted:${saAddress}`, String(mx));
      } catch {}
    }
  }, [connected, saAddress, lastMintQ.isLoading, lastMintQ.data, holdingsQ.data]);

  React.useEffect(() => {
    setHoldingIds(holdingsQ.data ?? []);
  }, [holdingsQ.data]);

  // Gentle refresh every 60s while connected
  React.useEffect(() => {
    if (!connected) return;
    const t = window.setInterval(() => {
      qc.invalidateQueries({ queryKey: ['lastMinted', saAddress] });
      qc.invalidateQueries({ queryKey: ['holdings', saAddress, COOKIE_ADDRESS] });
<<<<<<< HEAD
    }, 10_000);
=======
    }, 60_000);
>>>>>>> 0d0fea5 (Restore working state: remove metamaskSmartAccount.ts, add SmartAccount provider/components, UI fixes)
    return () => window.clearInterval(t);
  }, [connected, saAddress, qc]);

  // ---------- Generate with AI ----------
  const onGenerate = async () => {
    setUiError(null);
    setGenBusy(true);
    try {
      const r = await fetch('/api/fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic || undefined,
          vibe: vibe || undefined,
          name: nameOpt || undefined,
        }),
      });
      const j = await r.json();
      const f = j?.fortune ?? j?.text ?? j?.message ?? '';
      if (!f) throw new Error('No fortune returned');
      setFortune(f);
    } catch (e: any) {
      setUiError(e?.message || 'Failed to generate fortune');
    } finally {
      setGenBusy(false);
    }
  };

  // ---------- Mint ----------
<<<<<<< HEAD
  const { writeContractAsync } = useWriteContract();
=======
  //const { writeContractAsync } = useWriteContract();
>>>>>>> 0d0fea5 (Restore working state: remove metamaskSmartAccount.ts, add SmartAccount provider/components, UI fixes)
  const [txHash, setTxHash] = React.useState<`0x${string}` | undefined>(undefined);


  const genImage = async () => {
    const prompt = (imgPrompt || '').trim();
    if (!prompt) {
      setUiError('Enter a topic/hint');
      // Optional: toast or inline error UI
      return;
    }
    setUiError(null);
    setImgBusy?.(true);
    try {
      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt, size: '1024x1024' }),
      });

      // Always parse JSON; surface server error text
      let data: any = null;
      try { data = await res.json(); } catch {}

      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      const b64: string | undefined = data?.b64;
      if (!b64) {
        throw new Error('No image returned');
      }
      setImgB64?.(b64);
      setPinCid?.(null); // reset any previous CID
    } catch (err: any) {
      setUiError(String(err?.message || err));
      throw err; // keep existing catch path behavior if you have one
    } finally {
      setImgBusy?.(false);
    }
};

const saveToPinata = async () => {
  setUiError(null);
  if (!imgB64) { setUiError('No image to save.'); return; }
  setPinBusy(true);
  try {
    const r = await fetch('/api/pinata', { method: 'POST', body: JSON.stringify({ b64: imgB64, filename: 'monad-cookie.png' }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || 'Failed to save to Pinata');
    setPinCid(j.cid);
  } catch (e: any) {
    setUiError(String(e?.message || e));
  } finally {
    setPinBusy(false);
  }
};

<<<<<<< HEAD
/*
const onMintImage = async () => {
  setUiError(null);
  if (!connected || !address) { setUiError('Connect your wallet first.'); return; }
  if (!pinCid) { setUiError('Save the image to Pinata first.'); return; }

  setMintImgBusy(true);
  try {
    const call: any = {
      address: COOKIE_ADDRESS,
      abi: MIN_ABI,
      functionName: 'mintWithImage',
      args: [`fortune`, `ipfs://${pinCid}` ],         // <— if your signature differs, adjust
    };
    if (typeof onchainMintPrice === 'bigint' && onchainMintPrice > 0n) {
      call.value = onchainMintPrice;
    }
    const txHash = await writeContractAsync(call);
    // You already watch confirmation below; we can rely on that or show a toast here
  } catch (e: any) {
    setUiError(String(e?.message || e));
  } finally {
    setMintImgBusy(false);
  }
};
*/
=======
>>>>>>> 0d0fea5 (Restore working state: remove metamaskSmartAccount.ts, add SmartAccount provider/components, UI fixes)

const onMintImage = async () => {
  setUiError(null);
  if (!connected || !address) { setUiError('Connect your wallet first.'); return; }
  if (!pinCid) { setUiError('Save the image to Pinata first.'); return; }

  // --- Smart Account path (ONLY when Smart is ON) ---
  if (mode === 'sa' && bundlerClient && saReady) {
    // guard: SA balance must be >= 1.1 MON
    if (parseEther(String(saBalance ?? '0')) < parseEther('1.1')) {
      setUiError('need to top up Smart account > 1.1 MON');
      return;
    }
    setMintImgBusy(true);
    try {
      // same signer as your app uses
      // @ts-ignore – relax generics for wagmi helper
      //const walletClient = await (await import('wagmi')).getWalletClient({ chainId: monadTestnet.id });
      if (!walletClient) throw new Error('No wallet client');

      const sa = await buildSmartAccount(walletClient as any);

      // EXACT same ABI/function/args as your EOA path:
      const data = encodeFunctionData({
        abi: MIN_ABI,
        functionName: 'mintWithImage',
        args: [`fortune`, `ipfs://${pinCid}`],
      });

      const value = (typeof onchainMintPrice === 'bigint' && onchainMintPrice > 0n)
        ? onchainMintPrice : 0n;

    await sendSaUo({
      sa,
      to: COOKIE_ADDRESS as Address,
      data: data as `0x${string}`,
      value,
    });
    } catch (e: any) {
      setUiError(String(e?.message || e));
    } finally {
      setMintImgBusy(false);
    }
    return; // do not run EOA path
  }
  // --- end Smart Account path ---
<<<<<<< HEAD

/*
  // (keep your EOA path exactly as-is below)
  setMintImgBusy(true);
  try {
    const call: any = {
      address: COOKIE_ADDRESS,
      abi: MIN_ABI,
      functionName: 'mintWithImage',
      args: [`fortune`, `ipfs://${pinCid}`],
    };
    if (typeof onchainMintPrice === 'bigint' && onchainMintPrice > 0n) {
      call.value = onchainMintPrice;
    }
    const hash = await writeContractAsync(call);
    setTxHash?.(hash); // keep your receipt watcher flow
  } catch (e: any) {
    setUiError(String(e?.message || e));
  } finally {
    setMintImgBusy(false);
  }
  */
};

=======
};


>>>>>>> 0d0fea5 (Restore working state: remove metamaskSmartAccount.ts, add SmartAccount provider/components, UI fixes)
/*
  const onMint = async () => {
    setUiError(null);
    if (!connected || !address) {
      setUiError('Connect your wallet first.');
      return;
    }
    if (!fortune?.trim()) {
      setUiError('Enter or generate a fortune first.');
      return;
    }
    setMintBusy(true);
    try {
      const hash = await writeContractAsync({
        address: COOKIE_ADDRESS,
        abi: FortuneABI as Abi,
        functionName: 'mintWithFortune',
        args: [fortune.trim()],
        account: address as `0x${string}`,
        chain: monadTestnet,
        value: 1000000000000000000
      });
      setTxHash(hash);
    } catch (e: any) {
      setUiError(e?.shortMessage || e?.message || 'Mint failed');
    } finally {
      setMintBusy(false);
    }
  };
*/
<<<<<<< HEAD
/*
=======

>>>>>>> 0d0fea5 (Restore working state: remove metamaskSmartAccount.ts, add SmartAccount provider/components, UI fixes)
  const onMint = async () => {
    setUiError(null);
    if (!connected || !address) {
      setUiError('Connect your wallet first.');
      return;
    }
    if (!fortune?.trim()) {
      setUiError('Enter or generate a fortune first.');
      return;
    }
    setMintBusy(true);
    try {
<<<<<<< HEAD
      const call: any = {
        address: COOKIE_ADDRESS,
        abi: FortuneABI as Abi,
        functionName: 'mintWithFortune',
        args: [fortune],
      };
      if (typeof onchainMintPrice === 'bigint' && onchainMintPrice > 0n) {
        call.value = onchainMintPrice;
      }
      const hash = await writeContractAsync(call);
    } catch (e: any) {
      setUiError(String(e?.message || e));
    } finally {
      setMintBusy(false);
    }
  };
*/
const onMint = async () => {
  setUiError(null);
  if (!connected || !address) {
    setUiError('Connect your wallet first.');
    return;
  }
  if (!fortune?.trim()) {
    setUiError('Enter or generate a fortune first.');
    return;
  }

  // --- Smart Account path (ONLY when Smart is ON) ---
  if (mode === 'sa' && bundlerClient && saReady) {
    // guard: SA balance must be >= 1.1 MON
    if (parseEther(String(saBalance ?? '0')) < parseEther('1.1')) {
      setUiError('need to top up Smart account > 1.1 MON');
      return;
    }
    setMintBusy(true);
    try {
=======
>>>>>>> 0d0fea5 (Restore working state: remove metamaskSmartAccount.ts, add SmartAccount provider/components, UI fixes)
      // @ts-ignore
      //const walletClient = await (await import('wagmi')).getWalletClient({ chainId: monadTestnet.id });
      if (!walletClient) throw new Error('No wallet client');

      const sa = await buildSmartAccount(walletClient as any);

      // EXACT same ABI/function/args/value as your EOA path:
      const data = encodeFunctionData({
        abi: FortuneABI as Abi,
        functionName: 'mintWithFortune',
        args: [fortune.trim()],
      });

      const value = (typeof onchainMintPrice === 'bigint' && onchainMintPrice > 0n)
        ? onchainMintPrice : 0n;

    await sendSaUo({
      sa,
      to: COOKIE_ADDRESS as Address,
      data: data as `0x${string}`,
      value,
    });
    } catch (e: any) {
      setUiError(e?.shortMessage || e?.message || 'Mint failed');
    } finally {
      setMintBusy(false);
    }
<<<<<<< HEAD
    return; // do not run EOA path
  }
  // --- end Smart Account path ---

  /*
  // (keep your EOA path exactly as-is below)
  setMintBusy(true);
    try {
      const call: any = {
        address: COOKIE_ADDRESS,
        abi: FortuneABI as Abi,
        functionName: 'mintWithFortune',
        args: [fortune],
      };
      if (typeof onchainMintPrice === 'bigint' && onchainMintPrice > 0n) {
        call.value = onchainMintPrice;
      }
      const hash = await writeContractAsync(call);
    } catch (e: any) {
      setUiError(String(e?.message || e));
    } finally {
      setMintBusy(false);
    }
      */
=======
    return; 
  
  // --- end Smart Account path ---
>>>>>>> 0d0fea5 (Restore working state: remove metamaskSmartAccount.ts, add SmartAccount provider/components, UI fixes)
};

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({ hash: txHash });

  // Parse receipt logs safely with parseEventLogs
  React.useEffect(() => {
    if (!isConfirmed || !receipt || !address) return;

    let foundTokenId: number | null = null;

    try {
      const decoded = parseEventLogs({
        abi: FortuneABI as Abi,
        logs: (receipt.logs ?? []) as any,
      });

      for (const ev of decoded) {
        if (!ev || (ev as any).eventName == null) continue;

        const evAddr = (ev as any).saAddress as `0x${string}` | undefined;
        if (evAddr && evAddr.toLowerCase() !== COOKIE_ADDRESS.toLowerCase()) continue;

        if (ev.eventName === 'CookieMinted') {
          const args: any = ev.args;
          const tid = Number(args?.tokenId ?? args?.tokenID ?? args?.id);
          const minter = args?.minter as `0x${string}` | undefined;
          if (!Number.isNaN(tid) && (!minter || isAddressEqual(minter, saAddress as `0x${string}`))) {
            foundTokenId = tid;
            break;
          }
        }

        if (ev.eventName === 'Transfer') {
          const args: any = ev.args;
          const from = args?.from as `0x${string}`;
          const to = args?.to as `0x${string}`;
          const tid = Number(args?.tokenId);
          if (
            from &&
            to &&
            isAddressEqual(from, zeroAddress) &&
            isAddressEqual(to, saAddress as `0x${string}`) &&
            !Number.isNaN(tid)
          ) {
            foundTokenId = tid;
            break;
          }
        }
      }
    } catch {
      // ignore
    }

    if (foundTokenId != null) {
      setLastMinted(foundTokenId);
      try {
        localStorage.setItem(`fc:lastMinted:${saAddress}`, String(foundTokenId));
      } catch {}
    }

    qc.invalidateQueries({ queryKey: ['lastMinted', saAddress] });
    qc.invalidateQueries({ queryKey: ['holdings', saAddress, COOKIE_ADDRESS] });
  }, [isConfirmed, receipt, saAddress, qc]);

  // ---------- UI ----------
/*{privyCfg ? <MonadGamesIdBanner /> : null}*/
/*
      <h1 style={{
        fontSize: 40, fontWeight: 900, letterSpacing: "-0.02em",
        color: "white", marginBottom: 8
      }}>
        Monad Fortune Cookies
      </h1>
      <div style={{
        height: 2, width: 200, background: "linear-gradient(90deg,#7c3aed,#a855f7)",
        borderRadius: 999, marginBottom: 20
      }} />
*/

  // [FIXED] Declare content BEFORE using it
  const content = (
    <main className="page">
      {/* Monad Games ID banner */}
      
      {uiError ? <div className="alert">{uiError}</div> : null}
      {confirmError ? (
        <div className="alert">
          {(confirmError as any)?.shortMessage ||
            (confirmError as any)?.message ||
            String(confirmError)}
        </div>
      ) : null}

      <div className="grid">
        {/* LEFT: Mint Card */}
        <section className="card card--fortune">
          <h2 className="card__title">Generate Fortune</h2>

          <div className="two-col">
            <div className="field field--full">
              <label className="label">Prompt </label> {/*Topic / hint*/}
              <input
                className="input"
                placeholder="e.g., gas efficiency, launch day, testnet"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="row">
              <div className="field field--full">
                <label className="label">Vibe</label>
                <input
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                  className="input"
                  placeholder="optimistic"
                />
              </div>
              <div className="field field--full">
                <label className="label">Name (optional)</label>
                <input
                  value={nameOpt}
                  onChange={(e) => setNameOpt(e.target.value)}
                  className="input"
                  placeholder="your name/team"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn--primary"
            onClick={onGenerate}
            disabled={genBusy}
          >
            {genBusy ? 'Generating…' : 'Generate with AI'}
          </button>

          <div className="two-col">
            <div className="field field--full">
              <label className="label">Fortune (preview)</label>
              <textarea
                className="textarea"
                value={fortune}
                onChange={(e) => setFortune(e.target.value)}
                placeholder="Your fortune will appear here…"
              />
              <p className="hint">Tip: keep under ~160 chars (contract allows up to 240 bytes).</p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn--accent"
            onClick={onMint}
            disabled={mintBusy || isConfirming || !connected}
          >
            {mintBusy ? 'Waiting for wallet…' : isConfirming ? 'Confirming…' : 'Mint This Fortune'}
          </button>
        </section>


{/* Image generation + mint */}
<section className="card card--image">
  <h2 className="card__title">Generate Image with AI</h2>

  <div className="row">
    <div className="col">
      <label className="label">Topic / Hint</label>
      <input
        className="input"
        value={imgPrompt}
        onChange={(e) => setImgPrompt(e.target.value)}
        placeholder="e.g., neon cyber cookie with Monad logo"
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn btn--primary" onClick={genImage} disabled={imgBusy}>
          {imgBusy ? 'Generating…' : 'Generate Image with AI'}
        </button>
        <button className="btn btn--primary" onClick={saveToPinata} disabled={!imgB64 || pinBusy}>
          {pinBusy ? 'Saving…' : 'Save to Pinata'}
        </button>
      </div>
      {pinCid ? <div className="hint" style={{ marginTop: 8 }}>CID: {pinCid}</div> : null}
    </div>

    <div className="col" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label className="label">Preview</label>
      <div
        style={{
          border: '1px solid rgba(63,63,70,0.7)',
          borderRadius: 12,
          padding: 8,
          minHeight: 140,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(24,24,28,0.5)',
          cursor: imgB64 ? 'zoom-in' : 'default',
        }}
        onClick={() => imgB64 && setZoom(true)}
        title={imgB64 ? 'Click to zoom' : ''}
      >
        {imgB64 ? (
          <img
            src={`data:image/png;base64,${imgB64}`}
            style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8 }}
            alt="AI preview"
          />
        ) : (
          <span className="muted">No image yet</span>
        )}
      </div>

      <button
        className="btn btn--accent"
        onClick={onMintImage}
        disabled={!pinCid || mintImgBusy || isConfirming || !connected}
      >
        {mintImgBusy ? 'Waiting for wallet…' : isConfirming ? 'Confirming…' : 'Mint this Image'}
      </button>
    </div>
  </div>

  {/* Simple zoom modal */}
  {zoom && imgB64 ? (
    <div
      onClick={() => setZoom(false)}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <img src={`data:image/png;base64,${imgB64}`} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12 }} />
    </div>
  ) : null}
</section>


        {/* RIGHT: Status Card */}
        <section className="card card--status">
          <h2 className="card__title">Status</h2>

          <div className="status">
            <div className="status__row">
              <span className="muted">Status:</span>
              <span className={`pill ${connected ? 'pill--ok' : 'pill--off'}`}>
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="status__row">
              <span className="muted">Network:</span>
              <span>{connected ? chain?.name ?? '—' : '—'}</span>
            </div>
            <div className="status__row">
              <span className="muted">Address:</span>
              <span>
                {connected && address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '—'}
              </span>
            </div>
          </div>

          <SaStatusCard />

          {/* Last minted */}
          <div className="block">
            <div className="block__title">Last minted</div>
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

          {/* Holdings */}
          <div className="block">
            <div className="block__title">
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
{/*
          .grid {
            grid-template-columns: 1fr 1fr;
          }

         @media (min-width: 560px) {
          .row {
            grid-template-columns: 1fr 1fr;
          }
        }
*/}
      {/* --- Card CSS --- */}
      <style jsx>{`
        :global(html),
        :global(body) {
          background: #0b0b10;
        }
        .page {
          color: #e5e7eb;
          max-width: 1280px;
          margin: 0 auto;
          padding: 24px;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (min-width: 900px) {
          .card--status { grid-column: 3; order: 3; }
          .card--image { grid-column: 2; order: 2; }
          .card--fortune { grid-column: 1; order: 1; }
        }
 
        .col { min-width: 0; display: flex; flex-direction: column; gap: 8px; }
        .card {
          background: rgba(24, 24, 28, 0.82);
          border: 1px solid rgba(63, 63, 70, 0.7);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        .card__title {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #a1a1aa;
          margin-bottom: 12px;
          font-weight: 700;
        }
        .row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        .field {
          margin: 10px 0;
        }
        .label {
          display: block;
          font-size: 12px;
          color: #9ca3af;
          margin-bottom: 4px;
        }
        .input,
        .textarea {
          width: 90%;
          background: rgba(39, 39, 42, 0.7);
          border: 1px solid rgba(82, 82, 91, 0.6);
          border-radius: 10px;
          padding: 8px 12px;
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
        .two-col {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 14px;
        }
        .two-col .input {
          display: block;
          width: 100%;
          box-sizing: border-box;
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
        .btn--primary {
          background: #4f46e5;
          color: white;
        }
        .btn--primary:hover {
          background: #6366f1;
        }
        .btn--accent {
          background: #7c3aed;
          color: white;
        }
        .btn--accent:hover {
          background: #8b5cf6;
        }
        .alert {
          background: rgba(127, 29, 29, 0.25);
          border: 1px solid rgba(185, 28, 28, 0.35);
          color: #fecaca;
          padding: 10px 12px;
          border-radius: 10px;
          margin-bottom: 12px;
          font-size: 13px;
        }
        .status {
          display: grid;
          gap: 8px;
          font-size: 14px;
        }
        .status__row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .muted {
          color: #9ca3af;
        }
        .pill {
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 12px;
        }
        .pill--ok {
          background: rgba(6, 95, 70, 0.3);
          color: #86efac;
        }
        .pill--off {
          background: rgba(82, 82, 91, 0.5);
          color: #e5e7eb;
        }
        .block {
          margin-top: 18px;
        }
        .block__title {
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

  // [FIXED] Correct loginMethodsAndOrder.primary (remove "wallet")
  /*
  return privyCfg ? (
    <PrivyProvider
      appId={privyCfg.appId}
      config={{
        loginMethodsAndOrder: {
          primary: [`privy:${privyCfg.providerAppId}`], // [FIXED] 'email', 'google', 
        },
        embeddedWallets: { createOnLogin: 'users-without-wallets' },
      }}
    >
      {content}
    </PrivyProvider>
  ) : (
    content
  );
  */
 return content;
<<<<<<< HEAD
}
=======
}
>>>>>>> 0d0fea5 (Restore working state: remove metamaskSmartAccount.ts, add SmartAccount provider/components, UI fixes)
