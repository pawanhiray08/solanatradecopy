'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';

const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!);

interface TradeSettings {
  id: string;
  wallet_address: string;
  max_trade_cap: number;
  stop_loss_percentage: number;
  take_profit_percentage: number;
  enabled: boolean;
}

export function TradeManager() {
  const { publicKey } = useWallet();
  const [settings, setSettings] = useState<TradeSettings[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (publicKey) {
      loadTradeSettings();
    }
  }, [publicKey]);

  async function loadTradeSettings() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('trade_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setSettings(data || []);
    } catch (error) {
      console.error('Error loading trade settings:', error);
      setError('Failed to load trade settings');
    } finally {
      setLoading(false);
    }
  }

  async function updateTradeSettings(walletAddress: string, newSettings: Partial<TradeSettings>) {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('trade_settings')
        .upsert({
          wallet_address: walletAddress,
          ...newSettings,
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        throw updateError;
      }

      setSuccess('Trade settings updated successfully');
      await loadTradeSettings();
    } catch (error) {
      console.error('Error updating trade settings:', error);
      setError('Failed to update trade settings');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Trade Settings</h2>
        {error && (
          <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 text-green-700 bg-green-100 rounded-md">
            {success}
          </div>
        )}
        <div className="space-y-4">
          {settings.map((setting) => (
            <div key={setting.id} className="border p-4 rounded-lg">
              <h3 className="font-medium mb-2">Wallet: {setting.wallet_address.slice(0, 4)}...{setting.wallet_address.slice(-4)}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Max Trade Cap (SOL)
                  </label>
                  <input
                    type="number"
                    value={setting.max_trade_cap}
                    onChange={(e) => updateTradeSettings(setting.wallet_address, {
                      max_trade_cap: parseFloat(e.target.value)
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Stop Loss (%)
                  </label>
                  <input
                    type="number"
                    value={setting.stop_loss_percentage}
                    onChange={(e) => updateTradeSettings(setting.wallet_address, {
                      stop_loss_percentage: parseFloat(e.target.value)
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Take Profit (%)
                  </label>
                  <input
                    type="number"
                    value={setting.take_profit_percentage}
                    onChange={(e) => updateTradeSettings(setting.wallet_address, {
                      take_profit_percentage: parseFloat(e.target.value)
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={setting.enabled}
                      onChange={(e) => updateTradeSettings(setting.wallet_address, {
                        enabled: e.target.checked
                      })}
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Enable Trading</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
