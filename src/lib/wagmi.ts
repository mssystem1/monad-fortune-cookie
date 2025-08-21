// src/lib/wagmi.ts
'use client';

import { http } from 'wagmi';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { monadTestnet } from './chain';

const RPC_HTTP =
  process.env.NEXT_PUBLIC_RPC_HTTP ||
  process.env.NEXT_PUBLIC_MONAD_RPC_URL ||
  'https://testnet-rpc.monad.xyz';

const WC_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo';

// RainbowKit v2 style: build Wagmi config directly.
// - no HTTP batching (batch:false)
// - SSR enabled
// If your RK/Wagmi version supports it, `pollingInterval` as a number slows internal watchers.
// If your version errors on `pollingInterval`, just remove that line – our page code already polls at 60s.
export const wagmiConfig = getDefaultConfig({
  appName: 'Fortune Cookies',
  projectId: WC_PROJECT_ID,
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(RPC_HTTP, { batch: false }),
  },
  ssr: true,
  // Remove this line if your installed versions complain about it:
  pollingInterval: 60_000,
});
