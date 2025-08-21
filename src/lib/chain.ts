// lib/chain.ts
import { defineChain } from 'viem';

const RPC_HTTP =
  process.env.NEXT_PUBLIC_RPC_HTTP || 'https://testnet-rpc.monad.xyz';

export const monadTestnet = defineChain({
  id: 10143, // Monad Testnet chain id
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_HTTP] },
    public: { http: [RPC_HTTP] },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://testnet.monadexplorer.com',
    },
  },
  testnet: true,
});
