/*
// src/lib/aa/metamaskSmartAccount.ts
import { http, createPublicClient, encodeFunctionData, type PublicClient } from 'viem';
import { createBundlerClient } from 'viem/account-abstraction';
import { Implementation, toMetaMaskSmartAccount } from '@metamask/delegation-toolkit';
import { monadTestnet } from '../../lib/chain';

// --- Public client (explicitly typed so it does NOT carry an `account`) ---
export const publicClient: PublicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(process.env.NEXT_PUBLIC_MONAD_RPC || 'https://testnet-rpc.monad.xyz'),
}) as unknown as PublicClient; // tame viem/delegation-toolkit generic recursion

// --- Bundler client (no `client:` field here; some viem versions reject it) ---
const bundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_RPC || '';
export const bundlerClient =
  bundlerUrl
    ? (createBundlerClient as any)({
        chain: monadTestnet,
        transport: http(bundlerUrl),
      })
    : null;

// --- Build a MetaMask Hybrid Smart Account using Wallet Client signer ---
export async function getSmartAccount(walletClient: any) {
  const [owner] = await walletClient.getAddresses();

  // NOTE: cast to `any` here avoids TS2322 & TS2589 from deep generics
  const sa = await (toMetaMaskSmartAccount as any)({
    client: publicClient as any,                 // <= PublicClient without `account`
    implementation: Implementation.Hybrid,
    deployParams: [owner, [], [], []],          // Hybrid: owner + empty passkey arrays
    deploySalt: '0x',
    signer: { walletClient },                    // wagmi Wallet Client (MetaMask)
  });

  return sa;
}

export { encodeFunctionData };
*/