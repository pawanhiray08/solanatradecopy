'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';
import type { InsiderWallet, Transaction } from '@/lib/types';

export function InsiderWalletManager() {
  const { publicKey } = useWallet();
  const [wallets, setWallets] = useState<InsiderWallet[]>([]);
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletLabel, setNewWalletLabel] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<InsiderWallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (publicKey) {
      loadWallets();
    }
  }, [publicKey]);

  useEffect(() => {
    if (selectedWallet) {
      loadTransactions(selectedWallet.address);
    }
  }, [selectedWallet]);

  async function loadWallets() {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('insider_wallets')
        .select('*')
        .order('success_rate', { ascending: false });

      if (error) throw error;
      setWallets(data || []);
    } catch (error) {
      console.error('Error loading wallets:', error);
      setError('Failed to load wallets. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function addWallet() {
    if (!newWalletAddress || !newWalletLabel) {
      setError('Please provide both wallet address and label');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Validate Solana address
      try {
        new PublicKey(newWalletAddress);
      } catch {
        throw new Error('Invalid Solana wallet address');
      }

      // Check if wallet already exists
      const { data: existing } = await supabase
        .from('insider_wallets')
        .select('id')
        .eq('address', newWalletAddress)
        .single();

      if (existing) {
        throw new Error('This wallet is already being tracked');
      }

      const { error } = await supabase
        .from('insider_wallets')
        .insert([
          {
            address: newWalletAddress,
            label: newWalletLabel,
            success_rate: 0,
            total_trades: 0,
            successful_trades: 0,
          }
        ]);

      if (error) throw error;

      setNewWalletAddress('');
      setNewWalletLabel('');
      loadWallets();
    } catch (error) {
      console.error('Error adding wallet:', error);
      setError(error instanceof Error ? error.message : 'Failed to add wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function removeWallet(id: string) {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase
        .from('insider_wallets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      if (selectedWallet?.id === id) {
        setSelectedWallet(null);
        setTransactions([]);
      }
      
      loadWallets();
    } catch (error) {
      console.error('Error removing wallet:', error);
      setError('Failed to remove wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function loadTransactions(address: string) {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_address', address)
        .order('timestamp', { ascending: false })
        .limit(5);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setError('Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold mb-4">Add Insider Wallet</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Wallet Address</label>
            <input
              type="text"
              value={newWalletAddress}
              onChange={(e) => setNewWalletAddress(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400
                focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Enter Solana wallet address"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Label</label>
            <input
              type="text"
              value={newWalletLabel}
              onChange={(e) => setNewWalletLabel(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400
                focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Enter a label for this wallet"
              disabled={loading}
            />
          </div>
          <button
            onClick={addWallet}
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
              ${loading 
                ? 'bg-indigo-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
          >
            {loading ? 'Adding...' : 'Add Wallet'}
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold mb-4">Insider Wallets</h2>
        <div className="space-y-4">
          {wallets.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No insider wallets added yet</p>
          ) : (
            wallets.map((wallet) => (
              <div
                key={wallet.id}
                className={`border rounded-lg transition-all duration-200 ${
                  selectedWallet?.id === wallet.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                }`}
              >
                <button
                  className="w-full p-4 text-left"
                  onClick={() => setSelectedWallet(wallet)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-gray-900">{wallet.label}</h3>
                      <p className="text-sm text-gray-500 font-mono">{wallet.address}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        wallet.success_rate >= 90 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {wallet.success_rate.toFixed(1)}% Success
                      </p>
                      <p className="text-sm text-gray-500">
                        {wallet.successful_trades}/{wallet.total_trades} trades
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWallet(wallet.id);
                      }}
                      className="ml-4 p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      disabled={loading}
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedWallet && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Recent Transactions - {selectedWallet.label}</h2>
            {loading && <p className="text-sm text-gray-500">Loading...</p>}
          </div>
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No transactions found</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.signature} className="border border-gray-200 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {tx.token_symbol || tx.token_address}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {tx.type.toUpperCase()} - {tx.amount.toLocaleString()} tokens @ ${tx.price.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-1">
                        {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                      </p>
                    </div>
                    {tx.profit_loss !== null && (
                      <div className={`text-right ${tx.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <p className="text-lg font-bold">
                          {tx.profit_loss >= 0 ? '+' : ''}{tx.profit_loss.toFixed(2)}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
