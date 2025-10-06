// src/lib/wagmi.ts
/*
'use client';
import { createConfig, http } from 'wagmi';
import { injected, metaMask, coinbaseWallet, walletConnect } from 'wagmi/connectors';
import { monadTestnet } from '../lib/chain'; // keep your existing chain import/path

// transport for your chain
const transport = http(process.env.NEXT_PUBLIC_MONAD_RPC_URL!);

const connectors = [
  injected({ shimDisconnect: true }),    // ✅ keep here
  metaMask(),                            // ✅ remove shimDisconnect
  coinbaseWallet({ appName: 'Monad Fortune Cookie' }),
    // ✅ WalletConnect (restores dozens of wallets + MetaMask Mobile)
  walletConnect({
    projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!, // <- REQUIRED
    showQrModal: true,                                 // RainbowKit will use the WC modal
  }),
];

// Create wagmi config without WalletConnect
export const config = createConfig({
  chains: [monadTestnet],
  connectors,
  transports: {
    [monadTestnet.id]: transport,
  },
  ssr: true, // keep if you render on the server
});

export type AppConfig = typeof config;
*/

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