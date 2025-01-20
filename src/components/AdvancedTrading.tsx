'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/lib/supabase';

interface AdvancedSettings {
  wallet_percentage: number;
  max_slippage: number;
  min_liquidity: number;
  max_trades_per_day: number;
  min_market_cap: number;
  auto_compound: boolean;
  trailing_stop_loss: number;
  risk_level: 'low' | 'medium' | 'high';
}

export function AdvancedTrading() {
  const { publicKey } = useWallet();
  const [settings, setSettings] = useState<AdvancedSettings>({
    wallet_percentage: 10,
    max_slippage: 1,
    min_liquidity: 100000,
    max_trades_per_day: 5,
    min_market_cap: 1000000,
    auto_compound: false,
    trailing_stop_loss: 5,
    risk_level: 'medium',
  });

  useEffect(() => {
    if (publicKey) {
      loadSettings();
    }
  }, [publicKey]);

  async function loadSettings() {
    if (!publicKey) return;

    try {
      const { data, error } = await supabase
        .from('advanced_settings')
        .select('*')
        .eq('wallet_address', publicKey.toString())
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading advanced settings:', error);
    }
  }

  async function saveSettings() {
    if (!publicKey) return;

    try {
      const { error } = await supabase
        .from('advanced_settings')
        .upsert({
          wallet_address: publicKey.toString(),
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving advanced settings:', error);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6">Advanced Trading Settings</h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Position Size (% of Wallet)
          </label>
          <input
            type="range"
            min="1"
            max="100"
            value={settings.wallet_percentage}
            onChange={(e) =>
              setSettings(prev => ({
                ...prev,
                wallet_percentage: Number(e.target.value)
              }))
            }
            className="w-full"
          />
          <div className="text-sm text-gray-500 mt-1">
            {settings.wallet_percentage}% per trade
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Max Slippage (%)
            </label>
            <input
              type="number"
              value={settings.max_slippage}
              onChange={(e) =>
                setSettings(prev => ({
                  ...prev,
                  max_slippage: Number(e.target.value)
                }))
              }
              min="0.1"
              step="0.1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Min Liquidity (USD)
            </label>
            <input
              type="number"
              value={settings.min_liquidity}
              onChange={(e) =>
                setSettings(prev => ({
                  ...prev,
                  min_liquidity: Number(e.target.value)
                }))
              }
              min="0"
              step="1000"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Max Trades per Day
            </label>
            <input
              type="number"
              value={settings.max_trades_per_day}
              onChange={(e) =>
                setSettings(prev => ({
                  ...prev,
                  max_trades_per_day: Number(e.target.value)
                }))
              }
              min="1"
              max="100"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Min Market Cap (USD)
            </label>
            <input
              type="number"
              value={settings.min_market_cap}
              onChange={(e) =>
                setSettings(prev => ({
                  ...prev,
                  min_market_cap: Number(e.target.value)
                }))
              }
              min="0"
              step="10000"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Trailing Stop Loss (%)
            </label>
            <input
              type="number"
              value={settings.trailing_stop_loss}
              onChange={(e) =>
                setSettings(prev => ({
                  ...prev,
                  trailing_stop_loss: Number(e.target.value)
                }))
              }
              min="0.1"
              step="0.1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Risk Level
            </label>
            <select
              value={settings.risk_level}
              onChange={(e) =>
                setSettings(prev => ({
                  ...prev,
                  risk_level: e.target.value as 'low' | 'medium' | 'high'
                }))
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={settings.auto_compound}
              onChange={(e) =>
                setSettings(prev => ({
                  ...prev,
                  auto_compound: e.target.checked
                }))
              }
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label className="ml-2 block text-sm text-gray-900">
              Auto-compound Profits
            </label>
          </div>

          <button
            onClick={saveSettings}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
