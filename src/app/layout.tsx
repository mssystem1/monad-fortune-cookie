import type { Metadata } from "next";
import Providers from "./providers";
import NavTabs from "../components/NavTabs";

import { SmartAccountProvider } from './SmartAccountProvider';

export const metadata: Metadata = {
  title: "Monad Fortune Cookie",
  description: "AI blessing cookies on Monad Testnet",
};

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
      </body>
    </html>
  );
}
