import { createPublicClient, http, type PublicClient } from 'viem';
import { createBundlerClient } from 'viem/account-abstraction';
import { monadTestnet } from '../chain';

// ✅ Do NOT pass "account" to public client
export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL!),
  batch: { multicall: true },
}) as unknown as PublicClient; // <- breaks deep generic inference

// bundler is built from chain + transport (no 'client' prop)
export const bundlerClient = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL
  ? createBundlerClient({
      chain: monadTestnet,
      transport: http(process.env.NEXT_PUBLIC_BUNDLER_RPC_URL!),
    })
  : undefined;
