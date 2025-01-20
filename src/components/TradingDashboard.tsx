'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';

const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!);

interface WalletRanking {
  address: string;
  label: string;
  win_rate: number;
  total_profit_loss: number;
  rank: number;
}

interface TradeAlert {
  id: string;
  type: string;
  wallet_address: string;
  message: string;
  importance: string;
  created_at: string;
}

interface CoordinatedTrade {
  id: string;
  token_address: string;
  token_symbol: string;
  number_of_wallets: number;
  total_volume: number;
  average_price: number;
  dex_platform: string;
  detected_at: string;
}

export function TradingDashboard() {
  const { publicKey } = useWallet();
  const [rankings, setRankings] = useState<WalletRanking[]>([]);
  const [alerts, setAlerts] = useState<TradeAlert[]>([]);
  const [coordinatedTrades, setCoordinatedTrades] = useState<CoordinatedTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insiderPortfolio, setInsiderPortfolio] = useState<any[]>([]);
  const [lastTrades, setLastTrades] = useState<any[]>([]);
  const [futureTrades, setFutureTrades] = useState<any[]>([]);

  useEffect(() => {
    if (publicKey) {
      loadDashboardData();
      fetchInsiderPortfolio();
      fetchLastTrades();
      fetchFutureTrades();
    }
  }, [publicKey]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError(null);

      // Load wallet rankings
      const { data: rankingsData, error: rankingsError } = await supabase
        .from('insider_wallets')
        .select('address, label, win_rate, total_profit_loss, rank')
        .order('rank', { ascending: true });

      if (rankingsError) throw rankingsError;

      // Load recent alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('trade_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (alertsError) throw alertsError;

      // Load coordinated trades
      const { data: coordinatedData, error: coordinatedError } = await supabase
        .from('coordinated_trades')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(5);

      if (coordinatedError) throw coordinatedError;

      setRankings(rankingsData || []);
      setAlerts(alertsData || []);
      setCoordinatedTrades(coordinatedData || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const fetchInsiderPortfolio = async () => {
    try {
      const { data, error } = await supabase
        .from('insider_wallets')
        .select('address, win_rate, total_profit_loss, current_balance')
        .order('rank', { ascending: true });

      if (error) {
        console.error('Error fetching insider portfolio:', error.message);
        return;
      }

      setInsiderPortfolio(data);
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  const fetchLastTrades = async () => {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('coin_invested, amount, price, profit_loss, timestamp')
        .order('timestamp', { ascending: false })
        .limit(5); // Fetch last 5 trades

      if (error) {
        console.error('Error fetching last trades:', error.message);
        return;
      }

      console.log('Last Trades:', data); // Log the fetched data
      setLastTrades(data);
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  const fetchFutureTrades = async () => {
    try {
      const { data, error } = await supabase
        .from('future_trades')
        .select('coin_invested, action, amount, target_price, scheduled_time')
        .order('scheduled_time', { ascending: true });

      if (error) {
        console.error('Error fetching future trades:', error.message);
        return;
      }

      console.log('Future Trades:', data); // Log the fetched data
      setFutureTrades(data);
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      {/* Wallet Rankings */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Top Wallets</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wallet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Win Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit/Loss
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rankings.map((wallet) => (
                <tr key={wallet.address}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    #{wallet.rank}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{wallet.label}</div>
                    <div className="text-sm text-gray-500">{wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(wallet.win_rate * 100).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={wallet.total_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {(wallet.total_profit_loss ?? 0).toFixed(2)} SOL
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coordinated Trades */}
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

      {/* Trade Alerts */}
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

      {/* Insider Portfolio */}
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

      {/* Last Trades */}
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

      {/* Future Trades */}
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
