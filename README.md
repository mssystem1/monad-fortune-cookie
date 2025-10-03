# Monad Fortune Cookie 🍪✨

Turn short prompts into fortunes powered by AI, mint them as NFTs on **Monad Testnet**, and track the top minters on a slick leaderboard.

---

## Features

- **AI fortune generator** – Give a topic + vibe (+ optional name).
- **Preview fortune** - check what fortune was generated.
- **One-click mint Fortune** – Calls your contract’s `mintWithFortune(string)`.
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
- **Generate Image with AI from text** - give a hintt and generate image.
- **Preview image** - check what image was generated.
- **Save to Pinata** - save generated iamge in IPFS.
- **Mint image** – Calls your contract’s `mintWithImage()`to mint generated image from IPFS.

> **Note:** `scoreAmount` is a **session counter** of new mints while the wallet is connected. It resets after a successful **Register score** and when the page is left/refreshed.

> ⏱ **Freshness:** Leaderboard relies on BlockVision’s **collection holders** snapshot. New mints typically appear there within **~5–10 minutes**. The UI refetches on tab switch/visibility to pick updates up ASAP.

---

## Tech Stack

- **Next.js (App Router) + React + TypeScript**
- **wagmi + RainbowKit + Privy + viem** (Raibow + Privy(Monad Games ID) wallets & RPC)
- **React Query** (client fetching)
- **BlockVision** (indexer for leaderboard/holdings)
- **OpenAI** (main fortune generation)
- **Pinata** (IFPS storage)

---

## Environment Variables

Create **`.env.local`** at the project root (do not commit this file).

**Public (safe for client):**
NEXT_PUBLIC_COOKIE_ADDRESS=0xBdB861cdfcAE8aC7B5DC95000EE487224BD89E54
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz

NEXT_PUBLIC_RPC_HTTP=https://testnet-rpc.monad.xyz

NEXT_PUBLIC_MAX_SCAN=10000

# Pinata (JWT is easiest)
PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs/

**Server-only (no `NEXT_PUBLIC_`):**
OPENAI_API_KEY=sk-... # main; fortunes can also be typed manually
BLOCKVISION_API_KEY=... # main; enables indexer fallback
SIGNER_PRIVATE_KEY= # main; enables transaction of game owner
PINATA_JWT=... #main; enables pinata

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

MIT ©Maksim / MSSystem

---

## Acknowledgements

- [Monad](https://docs.monad.xyz/) – EVM-compatible L1 with serious performance.  
- [wagmi](https://wagmi.sh/), [RainbowKit](https://www.rainbowkit.com/), [viem](https://viem.sh/) – smooth wallet & RPC tooling.  
- [BlockVision](https://blockvision.org/) – optional indexer fallback.  
- [OpenAI](https://platform.openai.com/) – for delightful fortunes.
- [Pinata](https://app.pinata.cloud/) – for Pinata.





