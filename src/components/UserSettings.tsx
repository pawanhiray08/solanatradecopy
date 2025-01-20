'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/lib/supabase';

interface UserSettings {
  maxTradeSize: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  autoTradingEnabled: boolean;
}

export function UserSettings() {
  const { publicKey } = useWallet();
  const [settings, setSettings] = useState<UserSettings>({
    maxTradeSize: 1,
    stopLossPercentage: 10,
    takeProfitPercentage: 20,
    autoTradingEnabled: false,
  });

  useEffect(() => {
    if (publicKey) {
      loadUserSettings();
    }
  }, [publicKey]);

  async function loadUserSettings() {
    if (!publicKey) return;

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', publicKey.toString())
      .single();

    if (error) {
      console.error('Error loading user settings:', error);
      return;
    }

    if (data) {
      setSettings({
        maxTradeSize: data.max_trade_size,
        stopLossPercentage: data.stop_loss_percentage,
        takeProfitPercentage: data.take_profit_percentage,
        autoTradingEnabled: data.auto_trading_enabled,
      });
    }
  }

  async function saveSettings() {
    if (!publicKey) return;

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: publicKey.toString(),
        max_trade_size: settings.maxTradeSize,
        stop_loss_percentage: settings.stopLossPercentage,
        take_profit_percentage: settings.takeProfitPercentage,
        auto_trading_enabled: settings.autoTradingEnabled,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error saving settings:', error);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Trading Settings</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Max Trade Size (SOL)
          </label>
          <input
            type="number"
            value={settings.maxTradeSize}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              maxTradeSize: Number(e.target.value)
            }))}
            min="0.1"
            step="0.1"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Stop Loss (%)
          </label>
          <input
            type="number"
            value={settings.stopLossPercentage}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              stopLossPercentage: Number(e.target.value)
            }))}
            min="1"
            max="100"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Take Profit (%)
          </label>
          <input
            type="number"
            value={settings.takeProfitPercentage}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              takeProfitPercentage: Number(e.target.value)
            }))}
            min="1"
            max="1000"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={settings.autoTradingEnabled}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                autoTradingEnabled: e.target.checked
              }))}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label className="ml-2 block text-sm text-gray-900">
              Enable Auto Trading
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
