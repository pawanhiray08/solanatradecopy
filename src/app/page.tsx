'use client';

import { useState, useEffect } from 'react';
import { Chart, registerables } from 'chart.js/auto';
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
import { TradeManager } from '@/components/TradeManager';
import { TradingDashboard } from '@/components/TradingDashboard';
import TestConnection from '@/components/TestConnection';
import 'chartjs-adapter-date-fns';

Chart.register(...registerables);

const WalletMultiButtonDynamic = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
);

export default function Home() {
  const { publicKey, connected } = useWallet();
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trading' | 'portfolio' | 'social' | 'insiders' | 'copyTrading'>('insiders');
  const [isLoading, setIsLoading] = useState(true);
  let myChart: Chart | undefined;

  useEffect(() => {
    // Simulate loading delay for dynamic imports
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  function renderChart(data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor?: string;
      fill?: boolean;
      tension?: number;
    }[];
  }, ctx: CanvasRenderingContext2D) {
    if (myChart) {
      myChart.destroy();
    }
    myChart = new Chart(ctx, {
      type: 'line',
      data: data,
      options: {}
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          <h1 className="text-4xl font-bold text-center mb-8">
            Solana Copy Trading - Devnet
          </h1>
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <WalletMultiButtonDynamic />
        </div>
      </div>

      {!connected ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-4">Connect your wallet to start trading</h2>
          <p className="text-gray-600">You need to connect your Solana wallet to access the trading features.</p>
        </div>
      ) : (
        <div className="w-full max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('insiders')}
                  className={`${
                    activeTab === 'insiders'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Insider Wallets
                </button>
                <button
                  onClick={() => setActiveTab('copyTrading')}
                  className={`${
                    activeTab === 'copyTrading'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Copy Trading
                </button>
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className={`${
                    activeTab === 'portfolio'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Portfolio
                </button>
                <button
                  onClick={() => setActiveTab('social')}
                  className={`${
                    activeTab === 'social'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Social
                </button>
              </nav>
            </div>
          </div>

          <div className="space-y-8">
            {activeTab === 'insiders' && (
              <>
                <InsiderWalletManager />
                <InsiderWallets onSelectToken={setSelectedToken} />
              </>
            )}
            {activeTab === 'copyTrading' && (
              <>
                <TradingDashboard />
                <TradeManager />
              </>
            )}
            {activeTab === 'portfolio' && (
              <>
                <PortfolioAnalytics />
                <PositionTracker />
              </>
            )}
            {activeTab === 'social' && (
              <SocialTrading />
            )}
          </div>
        </div>
      )}

      <TestConnection />
    </main>
  );
}
