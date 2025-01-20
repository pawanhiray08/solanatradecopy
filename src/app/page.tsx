'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { InsiderWallets } from '@/components/InsiderWallets';
import { TradeExecutor } from '@/components/TradeExecutor';
import { UserSettings } from '@/components/UserSettings';
import { TransactionDetails } from '@/components/TransactionDetails';
import { PriceChart } from '@/components/PriceChart';
import { PositionTracker } from '@/components/PositionTracker';
import { AdvancedTrading } from '@/components/AdvancedTrading';
import { PortfolioAnalytics } from '@/components/PortfolioAnalytics';
import { SocialTrading } from '@/components/SocialTrading';
import { InsiderWalletManager } from '@/components/InsiderWalletManager';
import TestConnection from '@/components/TestConnection';

const WalletMultiButtonDynamic = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
);

export default function Home() {
  const { publicKey, connected } = useWallet();
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trading' | 'portfolio' | 'social' | 'insiders'>('insiders');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading delay for dynamic imports
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const tabs = [
    { id: 'trading', label: 'Trading' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'social', label: 'Social' },
    { id: 'insiders', label: 'Insider Wallets' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <TestConnection />
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Solana Copy Trading</h1>
            <p className="text-gray-600">Copy trade on Solana testnet</p>
          </div>
          <WalletMultiButtonDynamic />
        </div>

        {!connected ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Connect Your Wallet</h2>
            <p className="text-gray-600 mb-8">Please connect your wallet to access the trading features</p>
            <WalletMultiButtonDynamic />
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
              <div className="border-b">
                <nav className="flex space-x-8">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            <div className="space-y-8">
              {activeTab === 'trading' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    <PriceChart tokenAddress={selectedToken || ''} />
                    <TradeExecutor onTokenSelect={setSelectedToken} />
                  </div>
                  <div>
                    <TransactionDetails />
                    <PositionTracker />
                  </div>
                </div>
              )}

              {activeTab === 'portfolio' && (
                <div className="space-y-8">
                  <PortfolioAnalytics />
                  <AdvancedTrading />
                </div>
              )}

              {activeTab === 'social' && (
                <div className="space-y-8">
                  <SocialTrading />
                  <UserSettings />
                </div>
              )}

              {activeTab === 'insiders' && (
                <div className="space-y-8">
                  <InsiderWalletManager />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
