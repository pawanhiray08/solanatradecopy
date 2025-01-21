'use client';

import { useState, useEffect } from 'react';
import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';
import { getConnection, getBalance } from '@/config/solana';
import { parseTransaction, ParsedTransactionData, isValidPublicKey } from '@/utils/transactionParser';
import { toast } from 'react-hot-toast';

// List of insider wallets to monitor
const INSIDER_WALLETS = [
  // Add your insider wallet addresses here
  "FUEatMybNTZZFAomqU8m1jgQXrCZ1zMFMZizuCc65X5R",  // Example wallet
  // Add more insider wallets below in the format:
  // "wallet_address",  // Wallet description or trader name
];

interface WalletStats {
  address: string;
  balance: number;
  transactions: ParsedTransactionData[];
  profitLoss: number;
  successRate: number;
}

interface InsiderWalletsProps {
  onSelectToken: (tokenAddress: string | null) => void;
}

export function InsiderWallets({ onSelectToken }: InsiderWalletsProps) {
  const [walletStats, setWalletStats] = useState<Record<string, WalletStats>>({});
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initConnection = async () => {
      try {
        const conn = await getConnection();
        setConnection(conn);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to connect to Solana network';
        setError(message);
        toast.error(message);
      }
    };

    initConnection();
  }, []);

  const fetchWalletStats = async (wallet: string) => {
    if (!connection || !isValidPublicKey(wallet)) return null;

    try {
      const publicKey = new PublicKey(wallet);
      const balance = await getBalance(connection, wallet);
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 20 });
      
      const transactions: ParsedTransactionData[] = [];
      let successCount = 0;
      let totalProfitLoss = 0;

      for (const sig of signatures) {
        const tx = await connection.getParsedTransaction(sig.signature);
        if (tx) {
          const parsedTx = parseTransaction(tx);
          if (parsedTx) {
            transactions.push(parsedTx);
            if (parsedTx.type === 'transfer' && parsedTx.tokenAmount) {
              totalProfitLoss += parsedTx.tokenAmount;
              successCount++;
            }
          }
        }
      }

      return {
        address: wallet,
        balance,
        transactions,
        profitLoss: totalProfitLoss,
        successRate: (successCount / transactions.length) * 100
      };
    } catch (err) {
      console.error(`Error fetching stats for wallet ${wallet}:`, err);
      return null;
    }
  };

  useEffect(() => {
    if (!connection) return;

    const fetchAllWalletStats = async () => {
      setLoading(true);
      try {
        const stats: Record<string, WalletStats> = {};
        
        for (const wallet of INSIDER_WALLETS) {
          const walletStats = await fetchWalletStats(wallet);
          if (walletStats) {
            stats[wallet] = walletStats;
          }
        }
        
        setWalletStats(stats);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch wallet stats';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllWalletStats();
    
    // Set up WebSocket subscriptions
    const subscriptions = INSIDER_WALLETS.map(wallet => {
      const publicKey = new PublicKey(wallet);
      return connection.onAccountChange(publicKey, () => {
        fetchWalletStats(wallet).then(stats => {
          if (stats) {
            setWalletStats(prev => ({
              ...prev,
              [wallet]: stats
            }));
          }
        });
      });
    });

    return () => {
      subscriptions.forEach(sub => {
        connection.removeAccountChangeListener(sub);
      });
    };
  }, [connection]);

  const handleTokenSelect = (tokenAddress: string) => {
    onSelectToken(tokenAddress);
    toast.success('Token selected for tracking');
  };

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (loading) {
    return <div>Loading wallet stats...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Insider Wallets</h2>
      {Object.values(walletStats).map((stats) => (
        <div key={stats.address} className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold">Wallet: {stats.address}</h3>
          <p>Balance: {stats.balance.toFixed(4)} SOL</p>
          <p>Profit/Loss: {stats.profitLoss.toFixed(4)}</p>
          <p>Success Rate: {stats.successRate.toFixed(2)}%</p>
          
          <div className="mt-2">
            <h4 className="font-medium">Recent Transactions</h4>
            <div className="max-h-40 overflow-y-auto">
              {stats.transactions.map((tx) => (
                <div key={tx.signature} className="text-sm py-1">
                  <span>{new Date(tx.timestamp).toLocaleString()}</span>
                  {tx.tokenAddress && (
                    <button
                      onClick={() => handleTokenSelect(tx.tokenAddress!)}
                      className="ml-2 text-blue-500 hover:underline"
                    >
                      Track Token
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
