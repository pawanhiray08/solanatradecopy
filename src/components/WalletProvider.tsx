'use client';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo } from 'react';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

const WalletModalProviderDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletModalProvider,
  { ssr: false }
);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // You can change this to 'Devnet' | 'Testnet' | 'Mainnet' based on your needs
  const network = WalletAdapterNetwork.Devnet;
  
  // Use the provided RPC URL or fall back to the default one
  const endpoint = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    if (url) return url;
    console.warn('No custom RPC URL provided, falling back to default', network);
    return clusterApiUrl(network);
  }, [network]);

  // Initialize the wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    []
  );

  // Show error if no endpoint is available
  if (!endpoint) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <h2 className="text-red-800 font-semibold">Configuration Error</h2>
          <p className="text-red-600">No RPC endpoint available. Please check your environment configuration.</p>
        </div>
      </div>
    );
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProviderDynamic>{children}</WalletModalProviderDynamic>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
