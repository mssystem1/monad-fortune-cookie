import './globals.css';
import type { Metadata } from 'next';
import '@rainbow-me/rainbowkit/styles.css';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Monad Fortune Cookie',
  description: 'AI + Monad fortune cookie dapp',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-[#0b0b10] text-zinc-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
