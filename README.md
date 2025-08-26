# Monad Fortune Cookie 🍪✨

Turn short prompts into fortunes powered by AI, mint them as NFTs on **Monad Testnet**, and track the top minters on a slick leaderboard.

---

## Features

- **AI fortune generator** – Give a topic + vibe (+ optional name).
- **One-click mint** – Calls your contract’s `mintWithFortune(string)`.
- **Last minted** – Persisted per wallet; shows explorer link + “Share on X”.
- **Current holdings** – Exact token IDs currently owned by the connected wallet.
- **Leaderboard (Top-20)** – Beautiful purple-accented table:
  - Sorted by **total cookie NFTs minted** (descending).
  - **Medals** for ranks 1–3; subtle row glow; light-black table theme.
  - **Highlight** your wallet if it’s in Top-20.
  - If your wallet is **not** in Top-20, a **pinned card** shows your rank and total above the table.
  - Data refetches on mount/focus/tab-switch.
- **Wallet connect** – On the top tab bar; active tab highlighted in purple.
- **No noisy polling** – Reads happen via server routes with light caching.

> ⏱ **Freshness:** Leaderboard relies on BlockVision’s **collection holders** snapshot. New mints typically appear there within **~5–10 minutes**. The UI refetches on tab switch/visibility to pick updates up ASAP.

---

## Tech Stack

- **Next.js (App Router) + React + TypeScript**
- **wagmi + RainbowKit + viem** (wallet & RPC)
- **React Query** (client fetching)
- **BlockVision** (indexer for leaderboard/holdings)
- **OpenAI** (optional fortune generation)

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
OPENAI_API_KEY=sk-... # optional; fortunes can also be typed manually
BLOCKVISION_API_KEY=... # optional; enables indexer fallback

> Tip: include a public template file **`.env.example`** listing the keys (without values).

---

## Project Structure (key files)

src/
  app/
    api/
      leaderboard/
        route.ts             # Leaderboard API (Top-20 by holders snapshot)
      holdings/              # Existing wallet holdings API (unchanged)
    leaderboard/
      page.tsx               # Leaderboard tab page
      ui/
        LeaderboardClient.tsx
    page.tsx                 # Main tab (Mint a Fortune + status; original black styles kept)
    providers.tsx            # App-wide providers (React Query, etc.)

---

## Local Development

# install deps
npm install

# run dev server
npm run dev
# open http://localhost:3000

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


