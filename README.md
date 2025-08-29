# Monad Fortune Cookie 🍪✨

Turn short prompts into fortunes powered by AI, mint them as NFTs on **Monad Testnet**, and track the top minters on a slick leaderboard.

---

## Features

- **AI fortune generator** – Give a topic + vibe (+ optional name).  
- **One-click mint** – Calls `mintWithFortune(string)` on your Fortune Cookies contract.  
- **Last minted** – Persisted per wallet; shows token page + “Share on X”.  
- **Current holdings** – Exact token IDs currently owned by the connected wallet.  
- **No noisy polling** – Calm UX; reads are server-side, lightweight, and cached.  
- **Monad-first** – URLs, chain config, and explorer links tailored for Monad Testnet.

---

## Tech Stack

- **Next.js (App Router) + React + TypeScript**
- **wagmi + RainbowKit + viem** for wallet UX & RPC
- **OpenAI** (optional) to generate fortunes
- **BlockVision** (optional) as an indexer fallback

---

## Environment Variables

Create **`.env.local`** at the project root (do not commit this file).

**Public (safe for client):**
NEXT_PUBLIC_COOKIE_ADDRESS=0x06001F5e6e56d49A865BeD5B33FC613C7DcA0D81
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz

NEXT_PUBLIC_RPC_HTTP=https://testnet-rpc.monad.xyz

NEXT_PUBLIC_COOKIE_START_BLOCK=31738389
NEXT_PUBLIC_MAX_SCAN=10000
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=YOUR_WC_PROJECT_ID

**Server-only (no `NEXT_PUBLIC_`):**
OPENAI_API_KEY=sk-... # main; fortunes can also be typed manually
BLOCKVISION_API_KEY=... # main; enables indexer fallback
MONAD_GAMES_PROVIDER_APP_ID= # main; enables Monad Games ID
SIGNER_PRIVATE_KEY= # main; enables transaction of game owner
PRIVY_APP_ID= # main; enables privy wallet

> Tip: include a public template file **`.env.example`** listing the keys (without values).

---

## Contract Notes

- Expects a contract with `mintWithFortune(string)` and standard ERC-721 interfaces.
- The app links each token as:  
  `https://testnet.monadexplorer.com/nft/<CONTRACT>/<TOKEN_ID>`

---

## Known Behavior

- Leaderboard delay: New mints appear on the leaderboard after ~5–10 minutes (BlockVision snapshot latency). The UI refetches on focus/tab-switch.
- Rate limits: Server routes use light in-memory caching and retry/backoff to avoid 429s.

---

## Contributing

Issues and PRs welcome!  
Please keep client-side reads minimal and favor server routes for anything heavy.  
If you add new env vars or routes, update this README.

---

## License

MIT ©Maksim / MSSystem1

---

## Acknowledgements

- [Monad](https://docs.monad.xyz/) – EVM-compatible L1 with serious performance.  
- [wagmi](https://wagmi.sh/), [RainbowKit](https://www.rainbowkit.com/), [viem](https://viem.sh/) – smooth wallet & RPC tooling.  
- [BlockVision](https://blockvision.org/) – optional indexer fallback.  
- [OpenAI](https://platform.openai.com/) – for delightful fortunes.
- [Privy](https://docs.privy.io/wallets/global-wallets/integrate-a-global-wallet/login-with-a-global-wallet) – for Monad Games ID.


