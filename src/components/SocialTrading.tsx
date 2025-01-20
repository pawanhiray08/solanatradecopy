'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/lib/supabase';

interface Trader {
  wallet_address: string;
  username: string;
  avatar_url: string;
  total_followers: number;
  win_rate: number;
  monthly_roi: number;
  is_followed: boolean;
}

interface TradeHistory {
  id: string;
  trader: string;
  token_symbol: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: string;
  pnl_percentage?: number;
}

export function SocialTrading() {
  const { publicKey } = useWallet();
  const [topTraders, setTopTraders] = useState<Trader[]>([]);
  const [followedTraders, setFollowedTraders] = useState<Trader[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);

  useEffect(() => {
    if (publicKey) {
      loadTraders();
      const subscription = supabase
        .channel('traders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, 
          () => loadTradeHistory())
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [publicKey]);

  async function loadTraders() {
    try {
      setLoading(true);

      // Load top traders
      const { data: topTradersData } = await supabase
        .from('traders')
        .select('*')
        .order('monthly_roi', { ascending: false })
        .limit(10);

      // Load followed traders
      const { data: followedData } = await supabase
        .from('trader_follows')
        .select('followed_trader')
        .eq('follower', publicKey?.toString());

      const followedIds = (followedData || []).map((f: { followed_trader: string }) => f.followed_trader);

      // Mark followed traders
      const traders = (topTradersData || []).map(trader => ({
        ...trader,
        is_followed: followedIds.includes(trader.wallet_address),
      }));

      setTopTraders(traders);

      // Load followed traders' details
      if (followedIds.length > 0) {
        const { data: followedTradersData } = await supabase
          .from('traders')
          .select('*')
          .in('wallet_address', followedIds);

        setFollowedTraders(followedTradersData || []);
      }

      await loadTradeHistory();
    } catch (error) {
      console.error('Error loading traders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTradeHistory() {
    try {
      const { data } = await supabase
        .from('trades')
        .select('*')
        .in('trader', followedTraders.map((t: Trader) => t.wallet_address))
        .order('timestamp', { ascending: false })
        .limit(50);

      setTradeHistory(data || []);
    } catch (error) {
      console.error('Error loading trade history:', error);
    }
  }

  async function toggleFollow(trader: Trader) {
    if (!publicKey) return;

    try {
      if (trader.is_followed) {
        // Unfollow
        await supabase
          .from('trader_follows')
          .delete()
          .eq('follower', publicKey.toString())
          .eq('followed_trader', trader.wallet_address);
      } else {
        // Follow
        await supabase
          .from('trader_follows')
          .insert({
            follower: publicKey.toString(),
            followed_trader: trader.wallet_address,
            created_at: new Date().toISOString(),
          });
      }

      // Reload traders to update UI
      await loadTraders();
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  }

  function formatAddress(address: string): string {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  const filteredTraders = topTraders.filter(trader =>
    trader.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trader.wallet_address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Social Trading</h2>
        <input
          type="text"
          placeholder="Search traders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-4">Loading traders...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Traders */}
          <div>
            <h3 className="text-lg font-medium mb-4">Top Traders</h3>
            <div className="space-y-4">
              {filteredTraders.map(trader => (
                <div
                  key={trader.wallet_address}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedTrader(trader)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <img
                        src={trader.avatar_url || '/default-avatar.png'}
                        alt={trader.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="ml-3">
                        <div className="font-medium">{trader.username}</div>
                        <div className="text-sm text-gray-500">
                          {formatAddress(trader.wallet_address)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFollow(trader);
                      }}
                      className={`px-4 py-1 rounded ${
                        trader.is_followed
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {trader.is_followed ? 'Following' : 'Follow'}
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Win Rate</div>
                      <div className="font-medium">{trader.win_rate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Monthly ROI</div>
                      <div className="font-medium">{trader.monthly_roi.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Followers</div>
                      <div className="font-medium">{trader.total_followers}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trade History */}
          <div>
            <h3 className="text-lg font-medium mb-4">Recent Trades</h3>
            <div className="space-y-4">
              {tradeHistory.map(trade => (
                <div key={trade.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        {formatAddress(trade.trader)}
                      </div>
                      <div className="text-sm">
                        {trade.type === 'buy' ? 'Bought' : 'Sold'} {trade.token_symbol}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        ${trade.price.toFixed(6)}
                      </div>
                      {trade.pnl_percentage && (
                        <div className={`text-sm ${
                          trade.pnl_percentage >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {trade.pnl_percentage.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {new Date(trade.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trader Details Modal */}
      {selectedTrader && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <img
                  src={selectedTrader.avatar_url || '/default-avatar.png'}
                  alt={selectedTrader.username}
                  className="w-16 h-16 rounded-full"
                />
                <div className="ml-4">
                  <h3 className="text-xl font-semibold">{selectedTrader.username}</h3>
                  <div className="text-gray-500">
                    {formatAddress(selectedTrader.wallet_address)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTrader(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Win Rate</div>
                <div className="text-xl font-semibold">
                  {selectedTrader.win_rate.toFixed(1)}%
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Monthly ROI</div>
                <div className="text-xl font-semibold">
                  {selectedTrader.monthly_roi.toFixed(1)}%
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Followers</div>
                <div className="text-xl font-semibold">
                  {selectedTrader.total_followers}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => toggleFollow(selectedTrader)}
                className={`px-6 py-2 rounded ${
                  selectedTrader.is_followed
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {selectedTrader.is_followed ? 'Unfollow' : 'Follow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
