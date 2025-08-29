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
 **MGID banner** (main page, above the cards)
  - **Login/Signup with Monad Games ID** (Privy Cross-App, *Monad Games ID only*).
  - Shows **Player name** and **Embedded wallet (full)** after linking.
  - **Register score** button (big, purple, white text).
  - **Live values**:  
    - `scoreAmount` – session mints (resets after successful register & on page leave)  
    - `transactionAmount` – on-chain total transactions (read-only)  
    - `totalScore` – on-chain total score (read-only)
  - **Username flow:** after a successful MGID connection and once the embedded wallet is loaded, the app opens a **separate window** to `https://monad-games-id-site.vercel.app/` for username registration.  
    If the browser blocks it, a **button** appears in the banner so users can open it manually.
- **MGID Leaderboard** (third tab)  
  Columns: **Rank**, **Player**, **Embedded wallet (short)**, **TotalScore**.  
  Uses the **same rank emojis** and **pill styling** as the main leaderboard.
- **Server signer route** `/api/register-score`  
  - Writes to contract `0xceCBFF203C8B6044F52CE23D914A1bfD997541A4` via `updatePlayerData(player, scoreAmount, 1)`.  
    (We send a **delta** of `+1` for `transactionAmount` because the contract **adds** it.)
  - Reads back `totalTransactionsOfPlayer` and `totalScoreOfPlayer`.
  - **Persists** `{ username, embeddedWallet, totalScore, totalTransactions }` into a small JSON store for the MGID leaderboard.
- **MGID leaderboard API** `/api/mgid-leaderboard` serves persisted rows, sorted by `totalScore` desc then `totalTransactions`.

> **Note:** `scoreAmount` is a **session counter** of new mints while the wallet is connected. It resets after a successful **Register score** and when the page is left/refreshed.

> ⏱ **Freshness:** Leaderboard relies on BlockVision’s **collection holders** snapshot. New mints typically appear there within **~5–10 minutes**. The UI refetches on tab switch/visibility to pick updates up ASAP.

---

## Tech Stack

- **Next.js (App Router) + React + TypeScript**
- **wagmi + RainbowKit + Privy + viem** (Raibow + Privy(Monad Games ID) wallets & RPC)
- **React Query** (client fetching)
- **BlockVision** (indexer for leaderboard/holdings)
- **OpenAI** (main fortune generation)

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


