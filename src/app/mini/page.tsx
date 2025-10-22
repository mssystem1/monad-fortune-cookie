/*
'use client';

import MiniNav from '../../components/mini/MiniNav'
import MiniMintFortune from '../../.,/../components/mini/cards/MiniMintFortune'
import MiniMintImage from '../../.,/../components/mini/cards/MiniMintImage'
import MiniStatus from '../../.,/../components/mini/cards/MiniStatus'

export default function MiniMain() {
  return (
    <>
      <div className="page">
        <MiniNav />
        <div className="grid">
          <section className="card card--fortune"><MiniMintFortune /></section>
          <section className="card card--image"><MiniMintImage /></section>
          <section className="card card--status"><MiniStatus /></section>
        </div>
      </div>
      <style jsx>{`
        :global(html), :global(body) { background: #0b0b10; }
        .page { color: #e5e7eb; max-width: 1280px; margin: 0 auto; padding: 24px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (min-width: 900px) {
          .card--status { grid-column: 3; order: 3; }
          .card--image { grid-column: 2; order: 2; }
          .card--fortune { grid-column: 1; order: 1; }
        }
        .card { background: rgba(24,24,28,.82); border:1px solid rgba(63,63,70,.7); border-radius:16px; padding:18px; box-shadow:0 10px 30px rgba(0,0,0,.3) }
        .card__title { font-size:14px; text-transform:uppercase; letter-spacing:.08em; color:#a1a1aa; margin-bottom:12px; font-weight:700 }
      `}</style>
    </>
  )
}
*/
// src/app/mini/page.tsx
'use client';

import * as React from 'react';
// lazy import the SDK so /mini can render even outside Warpcast
const getSdk = async () => (await import('@farcaster/miniapp-sdk')).sdk;

// reuse your main page 1:1 (all logic/cards/queries)
import MainPage from '../page';

export default function MiniMirrorPage() {
  React.useEffect(() => {
    (async () => {
      try {
        const sdk = await getSdk();
        // Hide the splash **after** your UI is ready
        sdk.actions.ready().catch(() => {});
        // Expose Farcaster EIP-1193 so wagmi injected() picks it up
        const provider: any = await sdk.wallet.getEthereumProvider().catch(() => null);
        if (provider) {
          (window as any).ethereum = provider;
          provider?.on?.('accountsChanged', () => {});
          provider?.on?.('disconnect', () => {});
        }
      } catch {
        // Not inside Farcaster host — safe no-op so /mini still renders
      }
    })();
  }, []);

  return (
    <div className="mini-root">
      {/* exact same content as app/page.tsx */}
      <MainPage />

      {/* --- MINI OVERRIDES (scoped) --- */}
      <style jsx global>{`
        /* Outer modal size per docs (web mini): 424 x 695 */
        .mini-root {
          box-sizing: border-box;
          width: 424px;
          max-width: 100%;
          height: 695px;
          margin: 0 auto;
          padding: 8px 0 12px;
          overflow: hidden;           /* contain the app UI to modal bounds */
          display: flex;
          flex-direction: column;
          background: #0b0b10;
        }

        /* Make the scroll area only the main content, not the header */
        .mini-header {
          flex: 0 0 auto;
          padding: 0 12px;
        }
        .mini-root .page {
          flex: 1 1 auto;
          overflow: auto;             /* vertical scroll in the content only */
          max-width: 100%;
          padding: 12px;              /* tighter padding for mini */
        }

        /* Layout: stack cards in one column; keep small gaps */
        .mini-root .grid {
          grid-template-columns: 1fr !important;
          gap: 10px !important;
        }

        /* Tighter components for mini surface */
        .mini-root .card {
          padding: 14px !important;
          border-radius: 14px !important;
        }
        .mini-root .card__title {
          font-size: 12px !important;
          margin-bottom: 8px !important;
          letter-spacing: 0.08em;
        }

        /* Form controls trimmed to fit 424 width comfortably */
        .mini-root .input,
        .mini-root .textarea {
          width: 90% !important;
          padding: 8px 10px !important;
          font-size: 14px !important;
        }
        .mini-root .textarea {
          min-height: 100px !important;
        }

        /* Buttons: slightly smaller padding for mini */
        .mini-root .btn {
          padding: 9px 12px !important;
          font-size: 13px !important;
          border-radius: 10px !important;
        }

        /* 2-col groups collapse nicely inside the 424px surface */
        .mini-root .two-col {
          grid-template-columns: 1fr !important;
          gap: 10px !important;
        }

        /* Status list spacing tweaks */
        .mini-root .list {
          gap: 4px !important;
        }

        /* Ensure the body background stays consistent when embedded */
        :root, :global(html), :global(body) {
          background: #0b0b10;
        }
      `}</style>
    </div>
  );
}
