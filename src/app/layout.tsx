import type { Metadata } from "next";
import Providers from "./providers";
import NavTabs from "../components/NavTabs";
import { headers } from 'next/headers'

import { SmartAccountProvider } from './SmartAccountProvider';

import{MainChrome, MiniOnly} from "../components/MainChrome";
import MiniProviders from "../components/mini/MiniProviders.client";

import MiniNav from '../components/mini/MiniNav'


export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  const origin = `${proto}://${host}`

  const embed = {
    title: "Monad Fortune Cookie",
    description: "AI blessing cookies",
    version: '1',
    imageUrl: `${origin}/ms-logo.png`,
    button: {
      title: 'Open',
      action: {
        type: 'launch_frame',
        name: 'Monad Fortune Cookies',
        url: `${origin}/mini`,
        splashImageUrl: `${origin}/ms-logo.png`,
        splashBackgroundColor: '#0B0118',
      },
    },
  }

  return {
    other: {
      'fc:miniapp': JSON.stringify(embed),
      'fc:frame': JSON.stringify(embed),
    },
  }
}

/*
export const metadata: Metadata = {
  title: "Fortune Cookie",
  description: "AI blessing cookies",
};
*/

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#000", // global BG black
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
        }}
      >
        {/* === NON-MINI (default app) === */}
        <MainChrome>
        <Providers>
          {/* Header (tabs + wallet button). Keep shell same; only page below changes with routing */}
          
          
          <div style={{ background: '#111', borderBottom: '1px solid #2a2a2e' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img
                src="/ms-logo.png"        // ← put your file in /public and keep this path
                alt="MS System"
                style={{
                  height: 80,             // fits your existing header height
                  width: 80,
                  borderRadius: 10,
                  objectFit: 'cover'
                }}
              />
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', color: '#3c1dd9ff' }}>
                Monad Fortune Cookies
              </div>
              {/* removed the purple gradient line */}
            </div>
          </div>
        </div>

          
          
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: 8 }}>
            <NavTabs />
          </div>

          {/* Page content */}
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: 8 }}>
          <SmartAccountProvider>{children}</SmartAccountProvider>  
          </div>
        </Providers>
        </MainChrome>

        {/* === MINI (Farcaster Mini App) ===
            No Providers, no Header, no Tabs, no SmartAccountProvider.
            Mini pages will import and use @farcaster/miniapp-sdk themselves. */}
        <MiniOnly>
          <MiniProviders>

          <div style={{ background: '#111', borderBottom: '1px solid #2a2a2e' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img
                src="/ms-logo-mini.png"        // ← put your file in /public and keep this path
                alt="MS System"
                style={{
                  height: 80,             // fits your existing header height
                  width: 80,
                  borderRadius: 10,
                  objectFit: 'cover'
                }}
              />
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em', color: '#3c1dd9ff' }}>
                Monad Fortune Cookies
              </div>
              {/* removed the purple gradient line */}
            </div>
          </div>
        </div>

          <div style={{ maxWidth: 1280, margin: "0 auto", padding: 8 }}>
            <MiniNav />
          </div>
            {children}
          </MiniProviders>
        </MiniOnly>
      </body>
    </html>
  );
}
