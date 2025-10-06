import { createPublicClient, http } from 'viem';
import { createBundlerClient } from 'viem/account-abstraction';
import { monadTestnet } from '../chain';

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(process.env.NEXT_PUBLIC_MONAD_RPC_URL!),
});

// bundler is built from chain + transport (no 'client' prop)
export const bundlerClient = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL
  ? createBundlerClient({
      chain: monadTestnet,
      transport: http(process.env.NEXT_PUBLIC_BUNDLER_RPC_URL!),
    })
  : undefined;
