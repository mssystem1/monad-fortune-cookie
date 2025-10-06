// src/providers/SmartAccountProvider.tsx
'use client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useWalletClient, useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { buildSmartAccount } from '../../src/lib/aa/smartAccount';
import { bundlerClient, publicClient } from '../../src/lib/aa/clients';
import { monadTestnet } from '../../src/lib/chain';

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

export function SmartAccountProvider({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient({ chainId: monadTestnet.id });

  // persist user choice
  const [mode, setMode] = useState<Mode>(() => (typeof window !== 'undefined'
    ? ((localStorage.getItem('wallet-mode') as Mode) || 'eoa')
    : 'eoa'));

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
  const saReady = !!bundlerClient; // if no bundler, we disable SA mode

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!walletClient) return;
      try {
        const sa = await buildSmartAccount(walletClient);
        if (!alive) return;
        setSaAddress(sa.address);

        // SA balance via publicClient
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
  if (!saAddress) {
    setSaBalance(undefined);
    return;
  }
  let alive = true;
  const tick = async () => {
    try {
      const bal = await publicClient.getBalance({ address: saAddress });
      if (!alive) return;
      setSaBalance(formatEther(bal)); // keep your string for UI
    } catch (e) {
      if (!alive) return;
      // keep previous value; optional: setSaBalance('0')
    }
  };
  // first fetch immediately
  tick();
  const t = setInterval(tick, 10_000); // <-- every 10s
  return () => {
    alive = false;
    clearInterval(t);
  };
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

export const useSmartAccount = () => {
  const ctx = useContext(SmartAccountCtx);
  if (!ctx) throw new Error('useSmartAccount must be used inside SmartAccountProvider');
  return ctx;
};
