// src/providers/SmartAccountProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useWalletClient, useAccount, useBalance } from 'wagmi';
import { formatEther, createWalletClient, custom } from 'viem';
import { buildSmartAccount } from '../../src/lib/aa/smartAccount';
import { bundlerClient, publicClient } from '../../src/lib/aa/clients';
import { monadTestnet } from '../../src/lib/chain';

// Lazy-load Farcaster Mini SDK only on /mini to keep main bundle clean
const getMiniSdk = async () => (await import('@farcaster/miniapp-sdk')).sdk;

type Mode = 'eoa' | 'sa';

type Ctx = {
  mode: Mode;
  setMode: (m: Mode) => void;
  // EOA
  eoaAddress?: `0x${string}`;
  eoaBalance?: string;
  // Smart Account
  saAddress?: `0x${string}`;
  saBalance?: string;
  saReady: boolean; // bundler available
};

const SmartAccountCtx = createContext<Ctx | null>(null);

/* ------------------------------------------------------------------
 * Main provider (Chrome / Monad testnet) — logic preserved as-is
 * ------------------------------------------------------------------ */
export function SmartAccountProvider({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient({ chainId: monadTestnet.id });

  // persist user choice
  const [mode, setMode] = useState<Mode>(() =>
    typeof window !== 'undefined'
      ? ((localStorage.getItem('wallet-mode') as Mode) || 'eoa')
      : 'eoa'
  );
  useEffect(() => { localStorage.setItem('wallet-mode', mode); }, [mode]);

  // EOA balance
  const { data: eoaBal } = useBalance({
    address,
    chainId: monadTestnet.id,
    query: { enabled: !!address },
  });

  // Smart Account state
  const [saAddress, setSaAddress] = useState<`0x${string}` | undefined>();
  const [saBalance, setSaBalance] = useState<string | undefined>();
  const saReady = !!bundlerClient;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!walletClient) return;
      try {
        const sa = await buildSmartAccount(walletClient);
        if (!alive) return;
        setSaAddress(sa.address);

        const bal = await publicClient.getBalance({ address: sa.address });
        if (!alive) return;
        setSaBalance(formatEther(bal));
      } catch (e) {
        console.error('buildSmartAccount failed', e);
      }
    })();
    return () => { alive = false; };
  }, [walletClient?.account?.address]);

  useEffect(() => {
    if (!saAddress) { setSaBalance(undefined); return; }
    let alive = true;
    const tick = async () => {
      try {
        const bal = await publicClient.getBalance({ address: saAddress });
        if (!alive) return;
        setSaBalance(formatEther(bal));
      } catch { /* keep previous */ }
    };
    tick();
    const t = setInterval(tick, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, [saAddress]);

  const value = useMemo<Ctx>(() => ({
    mode,
    setMode: (m) => setMode(m),
    eoaAddress: address,
    eoaBalance: eoaBal ? formatEther(eoaBal.value) : undefined,
    saAddress,
    saBalance,
    saReady,
  }), [mode, address, eoaBal?.value, saAddress, saBalance, saReady]);

  return <SmartAccountCtx.Provider value={value}>{children}</SmartAccountCtx.Provider>;
}

/* ------------------------------------------------------------------
 * Mini provider (Farcaster) — builds viem WalletClient from Mini SDK
 * when Wagmi's wallet client is missing. Uses monadTestnet here;
 * switch if your Mini wallet is on a different chain.
 * ------------------------------------------------------------------ */
export function SmartAccountProviderMini({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();
  const { data: wagmiWalletClient } = useWalletClient({ chainId: monadTestnet.id });

  const [mode, setMode] = useState<Mode>(() =>
    typeof window !== 'undefined'
      ? ((localStorage.getItem('wallet-mode') as Mode) || 'eoa')
      : 'eoa'
  );
  useEffect(() => { localStorage.setItem('wallet-mode', mode); }, [mode]);

  const { data: eoaBal } = useBalance({
    address,
    chainId: monadTestnet.id,
    query: { enabled: !!address },
  });

  const [saAddress, setSaAddress] = useState<`0x${string}` | undefined>();
  const [saBalance, setSaBalance] = useState<string | undefined>();
  const saReady = !!bundlerClient;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Prefer Wagmi wallet if present
        let wc = wagmiWalletClient as any;

        // Fallback: build viem WalletClient from Farcaster Mini provider
        if (!wc) {
          try {
            const sdk = await getMiniSdk();
            if (sdk?.wallet) {
              const ethProvider = await sdk.wallet.getEthereumProvider();
              wc = createWalletClient({
                chain: monadTestnet,         // ⚠ change if your Mini is on another chain
                transport: custom(ethProvider),
              });
            }
          } catch (e) {
            console.warn('Mini wallet fallback creation failed:', e);
          }
        }

        if (!wc) return;

        const sa = await buildSmartAccount(wc);

        // Pepper to make duplicate clicks not collide in bundler cache
        //const pepper = BigInt(Date.now() % 1_000_000);

        // zero-value, zero-data no-op call
        //const calls = [
        //  { to: sa.address as `0x${string}`, data: '0x' as `0x${string}`, value: 0n + pepper * 0n }
        //];

        //const { hash } = await sendAndWaitUserOperation(bundlerClient, publicClient, { account: sa, calls });
        //alert(`Smart account deployed!\n${hash}`);

        if (!alive) return;
        setSaAddress(sa.address);

        const bal = await publicClient.getBalance({ address: sa.address });
        if (!alive) return;
        setSaBalance(formatEther(bal));
      } catch (e) {
        console.error('buildSmartAccount (mini) failed', e);
      }
    })();
    return () => { alive = false; };
  }, [wagmiWalletClient?.account?.address]);

  useEffect(() => {
    if (!saAddress) { setSaBalance(undefined); return; }
    let alive = true;
    const tick = async () => {
      try {
        const bal = await publicClient.getBalance({ address: saAddress });
        if (!alive) return;
        setSaBalance(formatEther(bal));
      } catch { /* keep previous */ }
    };
    tick();
    const t = setInterval(tick, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, [saAddress]);

  const value = useMemo<Ctx>(() => ({
    mode,
    setMode: (m) => setMode(m),
    eoaAddress: address,
    eoaBalance: eoaBal ? formatEther(eoaBal.value) : undefined,
    saAddress,
    saBalance,
    saReady,
  }), [mode, address, eoaBal?.value, saAddress, saBalance, saReady]);

  return <SmartAccountCtx.Provider value={value}>{children}</SmartAccountCtx.Provider>;
}

/* ------------------------------------------------------------------
 * Router: choose provider by pathname (/mini → Mini, else Main)
 * ------------------------------------------------------------------ */
export default function SmartAccountProviderRouter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const isMini = pathname.startsWith('/mini');
  return isMini
    ? <SmartAccountProviderMini>{children}</SmartAccountProviderMini>
    : <SmartAccountProvider>{children}</SmartAccountProvider>;
}

/* Hook */
export const useSmartAccount = () => {
  const ctx = useContext(SmartAccountCtx);
  if (!ctx) throw new Error('useSmartAccount must be used inside SmartAccountProvider');
  return ctx;
};
