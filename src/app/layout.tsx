import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/components/WalletProvider';
import { TradeMonitor } from '@/components/TradeMonitor';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Solana Copy Trading',
  description: 'Copy trade on Solana devnet',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          <TradeMonitor />
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
