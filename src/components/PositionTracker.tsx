'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';

interface Position {
  id: string;
  token_address: string;
  token_symbol: string;
  entry_price: number;
  current_price: number;
  amount: number;
  value_usd: number;
  pnl_percentage: number;
  pnl_usd: number;
  timestamp: string;
}

export function PositionTracker() {
  const { publicKey } = useWallet();
  const [positions, setPositions] = useState<Position[]>([]);
  const [totalPnL, setTotalPnL] = useState({ usd: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (publicKey) {
      loadPositions();
      const interval = setInterval(updatePositions, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [publicKey]);

  async function loadPositions() {
    if (!publicKey) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('wallet_address', publicKey.toString());

      if (error) throw error;

      const updatedPositions = await Promise.all(
        (data || []).map(async position => {
          const currentPrice = await fetchTokenPrice(position.token_address);
          const value = position.amount * currentPrice;
          const pnlUsd = value - position.amount * position.entry_price;
          const pnlPercentage = ((currentPrice - position.entry_price) / position.entry_price) * 100;

          return {
            ...position,
            current_price: currentPrice,
            value_usd: value,
            pnl_usd: pnlUsd,
            pnl_percentage: pnlPercentage,
          };
        })
      );

      setPositions(updatedPositions);
      calculateTotalPnL(updatedPositions);
    } catch (error) {
      console.error('Error loading positions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTokenPrice(tokenAddress: string): Promise<number> {
    try {
      const response = await fetch(`https://api.jupiter.so/price/${tokenAddress}`);
      const data = await response.json();
      return data.price;
    } catch (error) {
      console.error('Error fetching token price:', error);
      return 0;
    }
  }

  function calculateTotalPnL(positions: Position[]) {
    const totalPnLUsd = positions.reduce((sum, pos) => sum + pos.pnl_usd, 0);
    const totalValue = positions.reduce((sum, pos) => sum + pos.value_usd, 0);
    const totalPnLPercentage = totalValue > 0 ? (totalPnLUsd / totalValue) * 100 : 0;

    setTotalPnL({
      usd: totalPnLUsd,
      percentage: totalPnLPercentage,
    });
  }

  async function updatePositions() {
    const updatedPositions = await Promise.all(
      positions.map(async position => {
        const currentPrice = await fetchTokenPrice(position.token_address);
        const value = position.amount * currentPrice;
        const pnlUsd = value - position.amount * position.entry_price;
        const pnlPercentage = ((currentPrice - position.entry_price) / position.entry_price) * 100;

        return {
          ...position,
          current_price: currentPrice,
          value_usd: value,
          pnl_usd: pnlUsd,
          pnl_percentage: pnlPercentage,
        };
      })
    );

    setPositions(updatedPositions);
    calculateTotalPnL(updatedPositions);
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Positions</h2>
        <div className="text-right">
          <div className="text-sm text-gray-500">Total P&L</div>
          <div className={`font-semibold ${totalPnL.usd >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ${totalPnL.usd.toFixed(2)} ({totalPnL.percentage.toFixed(2)}%)
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">Loading positions...</div>
      ) : positions.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No active positions</div>
      ) : (
        <div className="space-y-4">
          {positions.map(position => (
            <div key={position.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{position.token_symbol}</div>
                  <div className="text-sm text-gray-500">
                    {position.amount.toFixed(6)} tokens
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${
                    position.pnl_usd >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    ${position.pnl_usd.toFixed(2)}
                  </div>
                  <div className={`text-sm ${
                    position.pnl_percentage >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {position.pnl_percentage.toFixed(2)}%
                  </div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Entry Price</div>
                  <div>${position.entry_price.toFixed(6)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Current Price</div>
                  <div>${position.current_price.toFixed(6)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Value</div>
                  <div>${position.value_usd.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Last Updated</div>
                  <div>{new Date(position.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
