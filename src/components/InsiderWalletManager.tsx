'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';
import type { InsiderWallet, Transaction } from '@/lib/types';

const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!);

export function InsiderWalletManager() {
  const { publicKey } = useWallet();
  const [wallets, setWallets] = useState<InsiderWallet[]>([]);
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletLabel, setNewWalletLabel] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<InsiderWallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccess('Address copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy address:', err);
      setError('Failed to copy address. Please try again.');
    });
  };

  async function fetchWalletBalance(walletAddress: string): Promise<number> {
    try {
      const pubKey = new PublicKey(walletAddress);
      const balance = await connection.getBalance(pubKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      return 0;
    }
  }

  async function updateWalletStats(walletAddress: string) {
    try {
      const balance = await fetchWalletBalance(walletAddress);

      // Get recent transactions
      const pubKey = new PublicKey(walletAddress);
      const signatures = await connection.getSignaturesForAddress(pubKey, { limit: 100 });
      
      let successfulTrades = 0;
      let totalTrades = 0;
      let lastTradeAt: Date | null = null;
      const processedTransactions: Transaction[] = [];

      for (const sig of signatures) {
        if (sig.err) continue; // Skip failed transactions
        
        const tx = await connection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });
        if (!tx || !tx.meta) continue;

        // Check for token swaps/trades
        const logs = tx.meta.logMessages || [];
        const isSwap = logs.some(log => 
          log.includes('Instruction: Swap') || 
          log.includes('Program log: Swap') ||
          log.includes('Program log: Exchange')
        );

        if (isSwap) {
          totalTrades++;
          
          // Look for token transfers in the transaction
          const preTokenBalances = tx.meta.preTokenBalances || [];
          const postTokenBalances = tx.meta.postTokenBalances || [];
          
          // A successful trade should have both pre and post balances
          if (preTokenBalances.length > 0 && postTokenBalances.length > 0) {
            successfulTrades++;
            
            // Update last trade timestamp
            if (tx.blockTime) {
              const tradeTime = new Date(tx.blockTime * 1000);
              if (!lastTradeAt || tradeTime > lastTradeAt) {
                lastTradeAt = tradeTime;
              }
            }

            // Store transaction details
            const tokenAddress = postTokenBalances[0]?.mint || '';
            if (tokenAddress) {
              processedTransactions.push({
                id: sig.signature,
                wallet_address: walletAddress,
                signature: sig.signature,
                token_address: tokenAddress,
                token_symbol: '', // We could fetch this from token registry if needed
                type: 'buy', // We could determine this by comparing pre/post balances
                amount: 0, // Calculate from balance changes
                price: 0, // Would need price feed to determine this
                created_at: new Date(tx.blockTime! * 1000).toISOString(),
                success: true,
                profit_loss: null, // Placeholder for profit/loss calculation
                timestamp: new Date(tx.blockTime! * 1000).toISOString() // Use block time for timestamp
              });
            }
          }
        }
      }

      // Update wallet stats in database
      const { error: updateError } = await supabase
        .from('insider_wallets')
        .update({
          success_rate: totalTrades > 0 ? successfulTrades / totalTrades : 0,
          total_trades: totalTrades,
          successful_trades: successfulTrades,
          last_trade_at: lastTradeAt?.toISOString() || null,
          updated_at: new Date().toISOString(),
          balance: balance // Add balance to the update
        })
        .eq('address', walletAddress);

      if (updateError) {
        console.error('Error updating wallet stats:', updateError);
      }

      // Store processed transactions
      if (processedTransactions.length > 0) {
        const { error: txError } = await supabase
          .from('transactions')
          .upsert(processedTransactions, {
            onConflict: 'signature',
            ignoreDuplicates: true
          });

        if (txError) {
          console.error('Error storing transactions:', txError);
        }
      }

      return { 
        totalTrades, 
        successfulTrades, 
        lastTradeAt,
        transactions: processedTransactions 
      };
    } catch (error) {
      console.error('Error updating wallet stats:', error);
      return null;
    }
  }

  async function loadWallets() {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading wallets...');
      
      const { data, error: dbError } = await supabase
        .from('insider_wallets')
        .select('*')
        .order('success_rate', { ascending: false });

      if (dbError) {
        console.error('Database error loading wallets:', dbError);
        throw dbError;
      }

      // Update stats for each wallet
      const updatedWallets = await Promise.all(
        (data || []).map(async (wallet) => {
          const stats = await updateWalletStats(wallet.address);
          return stats ? {
            ...wallet,
            success_rate: stats.totalTrades > 0 ? stats.successfulTrades / stats.totalTrades : 0,
            total_trades: stats.totalTrades,
            successful_trades: stats.successfulTrades,
            last_trade_at: stats.lastTradeAt?.toISOString() || null,
          } : wallet;
        })
      );

      console.log('Loaded wallets:', updatedWallets);
      setWallets(updatedWallets);
    } catch (error) {
      console.error('Error loading wallets:', error);
      setError('Failed to load wallets. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function addWallet() {
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    if (!newWalletAddress || !newWalletLabel) {
      setError('Please provide both wallet address and label');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      console.log('Adding wallet:', { address: newWalletAddress, label: newWalletLabel });

      // Validate Solana address
      let publicKeyObj: PublicKey;
      try {
        publicKeyObj = new PublicKey(newWalletAddress);
        if (!PublicKey.isOnCurve(publicKeyObj.toBuffer())) {
          throw new Error('Invalid Solana wallet address');
        }
      } catch (err) {
        console.error('Invalid wallet address:', err);
        throw new Error('Invalid Solana wallet address format');
      }

      // Check if wallet already exists
      console.log('Checking if wallet exists...');
      const { data: existing, error: checkError } = await supabase
        .from('insider_wallets')
        .select('id')
        .eq('address', newWalletAddress)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing wallet:', checkError);
        throw checkError;
      }

      if (existing) {
        throw new Error('This wallet is already being tracked');
      }

      // Insert new wallet
      console.log('Inserting new wallet...');
      try {
        const { data: insertedData, error: insertError } = await supabase
          .from('insider_wallets')
          .insert([
            {
              address: newWalletAddress,
              label: newWalletLabel,
              success_rate: 0,
              total_trades: 0,
              successful_trades: 0,
              last_trade_at: null,
              balance: await fetchWalletBalance(newWalletAddress)
            }
          ])
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting wallet:', insertError);
          if (insertError.code === '23505') { // Unique violation
            throw new Error('This wallet is already being tracked');
          } else if (insertError.code === '401') {
            console.error('Full error details:', insertError);
            throw new Error('Authentication error. Please check your Supabase configuration.');
          } else if (insertError.code === '403') {
            throw new Error('Permission denied. Please check the RLS policies.');
          } else {
            throw new Error(`Database error: ${insertError.message}`);
          }
        }

        if (!insertedData) {
          throw new Error('Failed to insert wallet - no data returned');
        }

        console.log('Successfully added wallet:', insertedData);
        setSuccess('Wallet added successfully!');
        setNewWalletAddress('');
        setNewWalletLabel('');
        await loadWallets();
      } catch (error) {
        console.error('Error in try-catch:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error adding wallet:', error);
      setError(error instanceof Error ? error.message : 'Failed to add wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function loadTransactions(walletAddress: string) {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading transactions for wallet:', walletAddress);
      
      const { data, error: dbError } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(50);

      if (dbError) {
        console.error('Error loading transactions:', dbError);
        throw dbError;
      }

      console.log('Loaded transactions:', data);
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setError('Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteWallet(walletAddress: string) {
    try {
      setLoading(true);
      setError(null);
      console.log('Attempting to delete wallet:', walletAddress);

      // Check if the wallet exists in the database
      const { data: existingWallet, error: fetchError } = await supabase
        .from('insider_wallets')
        .select('address')
        .eq('address', walletAddress);

      if (fetchError) {
        console.error('Error fetching wallet:', fetchError);
        throw fetchError;
      }

      if (!existingWallet || existingWallet.length === 0) {
        console.warn('Wallet does not exist in the database:', walletAddress);
        setError('Wallet does not exist. Cannot delete.');
        return;
      }

      const { data, error: deleteError } = await supabase
        .from('insider_wallets')
        .delete()
        .eq('address', walletAddress)
        .select();

      if (deleteError) {
        console.error('Error deleting wallet:', deleteError);
        throw deleteError;
      }

      if (data && data.length > 0) {
        console.log('Wallet deleted successfully from database:', data);
      } else {
        console.warn('No wallet deleted. It may not exist in the database:', walletAddress);
      }

      // Remove the wallet from the local state
      setWallets((prevWallets) => prevWallets.filter(wallet => wallet.address !== walletAddress));
      setSuccess('Wallet deleted successfully!');
    } catch (error) {
      console.error('Error deleting wallet:', error);
      setError('Failed to delete wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Add Insider Wallet</h2>
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
          <div>
            <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700">
              Wallet Address
            </label>
            <input
              type="text"
              id="walletAddress"
              value={newWalletAddress}
              onChange={(e) => {
                setError(null);
                setNewWalletAddress(e.target.value.trim());
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter Solana wallet address"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="walletLabel" className="block text-sm font-medium text-gray-700">
              Label
            </label>
            <input
              type="text"
              id="walletLabel"
              value={newWalletLabel}
              onChange={(e) => {
                setError(null);
                setNewWalletLabel(e.target.value.trim());
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter a label for this wallet"
              disabled={loading}
            />
          </div>
          <button
            onClick={addWallet}
            disabled={loading || !newWalletAddress || !newWalletLabel}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              loading || !newWalletAddress || !newWalletLabel
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
            }`}
          >
            {loading ? 'Adding...' : 'Add Wallet'}
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Tracked Wallets</h2>
        {wallets.length === 0 ? (
          <p className="text-gray-500">No wallets are being tracked yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Label
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Trades
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Trade
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {wallets.map((wallet) => (
                  <tr
                    key={wallet.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedWallet(wallet)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {wallet.label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className="cursor-pointer text-blue-600 hover:text-blue-800"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click
                          copyToClipboard(wallet.address);
                        }}
                      >
                        {wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(wallet.balance ?? 0).toFixed(2)} SOL
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(wallet.success_rate * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {wallet.total_trades}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {wallet.last_trade_at
                        ? new Date(wallet.last_trade_at).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click
                          deleteWallet(wallet.address);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
