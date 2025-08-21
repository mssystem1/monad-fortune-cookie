import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import '@rainbow-me/rainbowkit/styles.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Monad Fortune Cookie',
  description: 'AI + Monad fortune cookie dapp',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
