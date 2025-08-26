import type { Metadata } from "next";
import Providers from "./providers";
import NavTabs from "../components/NavTabs";

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
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: 16 }}>
            <NavTabs />
          </div>

          {/* Page content */}
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: 16 }}>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
