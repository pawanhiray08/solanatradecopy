'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { InsiderWallets } from '@/components/InsiderWallets';
import { TradeExecutor } from '@/components/TradeExecutor';
import { UserSettings } from '@/components/UserSettings';
import { TransactionDetails } from '@/components/TransactionDetails';
import { PriceChart } from '@/components/PriceChart';
import { PositionTracker } from '@/components/PositionTracker';
import { AdvancedTrading } from '@/components/AdvancedTrading';
import { PortfolioAnalytics } from '@/components/PortfolioAnalytics';
import { SocialTrading } from '@/components/SocialTrading';
import SupabaseTest from '@/components/SupabaseTest';

export default function Home() {
  const { publicKey, connected } = useWallet();
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trading' | 'portfolio' | 'social'>('trading');

  const tabs = [
    { id: 'trading', label: 'Trading' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'social', label: 'Social' },
  ];

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Solana Copy Trading</h1>
            <p className="text-gray-600">Copy trade on Solana testnet</p>
          </div>
          <WalletMultiButton />
        </div>

        {!connected ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-4">Connect Your Wallet to Start</h2>
            <p className="text-gray-600">
              Connect your Phantom wallet to start copy trading on Solana testnet
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <nav className="flex space-x-4" aria-label="Tabs">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      activeTab === tab.id
                        ? 'bg-white text-indigo-600 shadow'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {activeTab === 'trading' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8">
                    {selectedToken && <PriceChart tokenAddress={selectedToken} />}
                    <div className="mt-8">
                      <InsiderWallets onTokenSelect={setSelectedToken} />
                    </div>
                  </div>
                  <div className="lg:col-span-4 space-y-8">
                    <UserSettings />
                    <AdvancedTrading />
                    <TradeExecutor />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <PositionTracker />
                  <TransactionDetails />
                </div>
              </div>
            )}

            {activeTab === 'portfolio' && (
              <div className="space-y-8">
                <PortfolioAnalytics />
              </div>
            )}

            {activeTab === 'social' && (
              <div className="space-y-8">
                <SocialTrading />
              </div>
            )}
          </>
        )}
      </div>
      <div className="mt-4">
        <SupabaseTest />
      </div>
    </main>
  );
}
