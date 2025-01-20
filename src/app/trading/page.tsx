'use client';

import { TradeManager } from '@/components/TradeManager';
import { TradingDashboard } from '@/components/TradingDashboard';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function TradingPage() {
  const { connected } = useWallet();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Trading Dashboard</h1>
        <WalletMultiButton />
      </div>

      {!connected ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-4">Connect your wallet to start trading</h2>
          <p className="text-gray-600">You need to connect your Solana wallet to access the trading features.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <TradingDashboard />
          <TradeManager />
        </div>
      )}
    </div>
  );
}
