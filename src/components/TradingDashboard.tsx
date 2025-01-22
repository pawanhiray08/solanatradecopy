'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/lib/supabase';
import { getConnection, getBalance } from '@/config/solana';
import Link from 'next/link';

interface WalletRanking {
  wallet_address: string;
  total_trades: number;
  success_rate: number;
  total_volume: number;
  average_return: number;
  detected_at: string;
}

interface TradeData {
  id: number;
  wallet_address: string;
  transaction_hash: string;
  token_address: string;
  trade_type: string;
  amount: number;
  price: number;
  detected_at: string;
  status: string;
}

export function TradingDashboard() {
  const { publicKey } = useWallet();
  const [rankings, setRankings] = useState<WalletRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [insiderWallets, setInsiderWallets] = useState<{ address: string; balance: number }[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [coordinatedTrades, setCoordinatedTrades] = useState<any[]>([]);
  const [lastTrades, setLastTrades] = useState<any[]>([]);
  const [futureTrades, setFutureTrades] = useState<any[]>([]);
  const [insiderPortfolio, setInsiderPortfolio] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const connection = await getConnection();

      // Fetch insider wallets from your database
      const { data: walletsData, error: walletsError } = await supabase
        .from('insider_wallets')
        .select('wallet_address')
        .order('created_at', { ascending: false });

      if (walletsError) throw walletsError;

      // Fetch balances for each wallet
      const walletsWithBalances = await Promise.all(
        (walletsData || []).map(async (wallet) => {
          try {
            const balance = await getBalance(connection, wallet.wallet_address);
            return {
              address: wallet.wallet_address,
              balance
            };
          } catch (error) {
            console.error(`Error fetching balance for wallet ${wallet.wallet_address}:`, error);
            return {
              address: wallet.wallet_address,
              balance: 0
            };
          }
        })
      );

      setInsiderWallets(walletsWithBalances);

      // Fetch trade data
      const { data: tradesData, error: tradesError } = await supabase
        .from('coordinated_trades')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(50);

      if (tradesError) throw tradesError;
      setTrades(tradesData || []);

      // Fetch rankings
      const { data: rankingsData, error: rankingsError } = await supabase
        .from('wallet_rankings')
        .select('*')
        .order('success_rate', { ascending: false })
        .limit(10);

      if (rankingsError) throw rankingsError;
      setRankings(rankingsData || []);

      // Fetch alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('trade_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (alertsError) throw alertsError;
      setAlerts(alertsData || []);

      // Fetch coordinated trades
      const { data: coordinatedData, error: coordinatedError } = await supabase
        .from('coordinated_trades')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(5);

      if (coordinatedError) throw coordinatedError;
      setCoordinatedTrades(coordinatedData || []);

      // Fetch last trades
      const { data: lastTradesData, error: lastTradesError } = await supabase
        .from('trades')
        .select('coin_invested, amount, price, profit_loss, timestamp')
        .order('timestamp', { ascending: false })
        .limit(5);

      if (lastTradesError) throw lastTradesError;
      setLastTrades(lastTradesData || []);

      // Fetch future trades
      const { data: futureTradesData, error: futureTradesError } = await supabase
        .from('future_trades')
        .select('coin_invested, action, amount, target_price, scheduled_time')
        .order('scheduled_time', { ascending: true });

      if (futureTradesError) throw futureTradesError;
      setFutureTrades(futureTradesData || []);

      // Fetch insider portfolio
      const { data: insiderPortfolioData, error: insiderPortfolioError } = await supabase
        .from('insider_wallets')
        .select('address, win_rate, total_profit_loss, current_balance')
        .order('rank', { ascending: true });

      if (insiderPortfolioError) throw insiderPortfolioError;
      setInsiderPortfolio(insiderPortfolioData || []);

      setError(null);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading dashboard...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-6">
      {/* Insider Wallets Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Insider Wallets</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-4 py-2">Wallet Address</th>
                <th className="px-4 py-2">Balance (SOL)</th>
              </tr>
            </thead>
            <tbody>
              {insiderWallets.map((wallet) => (
                <tr key={wallet.address}>
                  <td className="px-4 py-2">
                    <Link
                      href={`https://explorer.solana.com/address/${wallet.address}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600"
                    >
                      {wallet.address.slice(0, 8)}...{wallet.address.slice(-4)}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{wallet.balance.toFixed(4)}</td>
                </tr>
              ))}
              {insiderWallets.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-2 text-center">
                    No insider wallets found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trades Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Recent Trades</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Wallet</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Token</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Price</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id}>
                  <td className="px-4 py-2">
                    {new Date(trade.detected_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`https://explorer.solana.com/address/${trade.wallet_address}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600"
                    >
                      {trade.wallet_address.slice(0, 8)}...
                    </Link>
                  </td>
                  <td className="px-4 py-2">{trade.trade_type}</td>
                  <td className="px-4 py-2">{trade.token_address.slice(0, 8)}...</td>
                  <td className="px-4 py-2">{trade.amount}</td>
                  <td className="px-4 py-2">{trade.price}</td>
                  <td className="px-4 py-2">{trade.status}</td>
                </tr>
              ))}
              {trades.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-2 text-center">
                    No trades found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rankings Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Top Wallets</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-4 py-2">Wallet</th>
                <th className="px-4 py-2">Total Trades</th>
                <th className="px-4 py-2">Success Rate</th>
                <th className="px-4 py-2">Volume</th>
                <th className="px-4 py-2">Avg Return</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((ranking) => (
                <tr key={ranking.wallet_address}>
                  <td className="px-4 py-2">
                    <Link
                      href={`https://explorer.solana.com/address/${ranking.wallet_address}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600"
                    >
                      {ranking.wallet_address.slice(0, 8)}...
                    </Link>
                  </td>
                  <td className="px-4 py-2">{ranking.total_trades}</td>
                  <td className="px-4 py-2">{(ranking.success_rate * 100).toFixed(1)}%</td>
                  <td className="px-4 py-2">{ranking.total_volume.toFixed(2)} SOL</td>
                  <td className="px-4 py-2">{(ranking.average_return * 100).toFixed(1)}%</td>
                </tr>
              ))}
              {rankings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-center">
                    No rankings found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Recent Alerts</h2>
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg ${
                alert.importance === 'high'
                  ? 'bg-red-50 border-red-200'
                  : alert.importance === 'medium'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{alert.type}</p>
                  <p className="text-sm text-gray-600">{alert.message}</p>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(alert.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coordinated Trades Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Recent Coordinated Trades</h2>
        <div className="space-y-4">
          {coordinatedTrades.map((trade) => (
            <div key={trade.id} className="border p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{trade.token_symbol}</h3>
                  <p className="text-sm text-gray-500">
                    {trade.number_of_wallets} wallets • {trade.dex_platform}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{trade.total_volume.toFixed(2)} SOL</p>
                  <p className="text-sm text-gray-500">
                    Avg. Price: {trade.average_price.toFixed(4)} SOL
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insider Portfolio Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Insider Portfolio</h2>
        <table>
          <thead>
            <tr>
              <th>Address</th>
              <th>Win Rate</th>
              <th>Total Profit/Loss</th>
              <th>Current Balance</th>
            </tr>
          </thead>
          <tbody>
            {insiderPortfolio.map((wallet) => (
              <tr key={wallet.address}>
                <td>{wallet.address}</td>
                <td>{(wallet.win_rate ?? 0).toFixed(2)}%</td>
                <td>{(wallet.total_profit_loss ?? 0).toFixed(2)} SOL</td>
                <td>{(wallet.current_balance ?? 0).toFixed(2)} SOL</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Last Trades Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Last Trades</h2>
        <table>
          <thead>
            <tr>
              <th>Coin Invested</th>
              <th>Amount</th>
              <th>Price</th>
              <th>Profit/Loss</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {lastTrades.map((trade) => (
              <tr key={trade.timestamp}>
                <td>{trade.coin_invested}</td>
                <td>{trade.amount}</td>
                <td>{trade.price}</td>
                <td>{trade.profit_loss}</td>
                <td>{new Date(trade.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Future Trades Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Future Trades</h2>
        <table>
          <thead>
            <tr>
              <th>Coin Invested</th>
              <th>Action</th>
              <th>Amount</th>
              <th>Target Price</th>
              <th>Scheduled Time</th>
            </tr>
          </thead>
          <tbody>
            {futureTrades.map((trade) => (
              <tr key={trade.scheduled_time}>
                <td>{trade.coin_invested}</td>
                <td>{trade.action}</td>
                <td>{trade.amount}</td>
                <td>{trade.target_price}</td>
                <td>{new Date(trade.scheduled_time).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
