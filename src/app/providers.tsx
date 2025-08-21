// src/app/providers.tsx
'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { ReactNode, useMemo } from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { monadTestnet } from '../lib/chain';
import { wagmiConfig } from '../lib/wagmi';

export default function Providers({ children }: { children: ReactNode }) {
  // IMPORTANT: keep react-query from refetching every second in background
  const qc = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            refetchInterval: false,      // ← no periodic refetch
            staleTime: 30_000,           // cache data for 30s
            gcTime: 5 * 60_000,
          },
        },
      }),
    []
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>
        <RainbowKitProvider theme={darkTheme()} initialChain={monadTestnet}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
