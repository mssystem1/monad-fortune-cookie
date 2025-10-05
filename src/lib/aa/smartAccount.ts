import type { PublicClient } from 'viem';
import type { SmartAccount } from 'viem/account-abstraction';
import { Implementation, toMetaMaskSmartAccount } from '@metamask/delegation-toolkit';
import { publicClient } from './clients';

export async function buildSmartAccount(walletClient: any) {
  const [owner] = await walletClient.getAddresses();

  const params = {
    client: publicClient as unknown as PublicClient,
    implementation: Implementation.Hybrid as const,
    deployParams: [owner, [], [], []] as const,
    deploySalt: '0x' as const,
    signer: { walletClient: walletClient as any },
  } as const;

  // Cast only the function signature — return a true SmartAccount object.
  const sa = await (toMetaMaskSmartAccount as unknown as (p: any) => Promise<SmartAccount>)(params);

  return sa; // <-- has address, getAddress, encodeCalls, userOperation helpers, etc.
}
