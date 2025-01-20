'use client';

import { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';

interface Transaction {
  id: string;
  signature: string;
  wallet_address: string;
  type: string;
  token_in: string;
  token_out: string;
  amount_in: string;
  amount_out: string;
  dex: string;
  status: string;
  timestamp: string;
}

interface TransactionPayload {
  signature: string;
  wallet: string;
  timestamp: string;
  type: string;
  token_address: string;
  amount?: number;
  price?: number;
}

export function TransactionDetails() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useEffect(() => {
    loadTransactions();
    // Subscribe to new transactions
    const subscription = supabase
      .channel('transactions')
      .on('INSERT', (payload: TransactionPayload) => {
        setTransactions(prev => [payload as Transaction, ...prev]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadTransactions() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatAmount(amount: string): string {
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  }

  function shortenAddress(address: string): string {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
      
      {loading ? (
        <div className="text-center py-4">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No transactions found</div>
      ) : (
        <div className="space-y-4">
          {transactions.map(tx => (
            <div
              key={tx.id}
              className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => setSelectedTx(tx === selectedTx ? null : tx)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">
                    {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {shortenAddress(tx.wallet_address)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {formatAmount(tx.amount_in)} → {formatAmount(tx.amount_out)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(tx.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>

              {selectedTx?.id === tx.id && (
                <div className="mt-4 pt-4 border-t text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="font-medium">From Token</div>
                      <div className="text-gray-500">{shortenAddress(tx.token_in)}</div>
                    </div>
                    <div>
                      <div className="font-medium">To Token</div>
                      <div className="text-gray-500">{shortenAddress(tx.token_out)}</div>
                    </div>
                    <div>
                      <div className="font-medium">DEX</div>
                      <div className="text-gray-500">{tx.dex}</div>
                    </div>
                    <div>
                      <div className="font-medium">Status</div>
                      <div className={`${
                        tx.status === 'completed' ? 'text-green-500' : 'text-yellow-500'
                      }`}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="font-medium">Transaction Signature</div>
                    <a
                      href={`https://explorer.solana.com/tx/${tx.signature}?cluster=testnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600"
                    >
                      {shortenAddress(tx.signature)}
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
