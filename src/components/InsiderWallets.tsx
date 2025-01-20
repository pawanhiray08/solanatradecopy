'use client';

import { useState, useEffect } from 'react';
import { Connection, PublicKey, ParsedTransactionWithMeta, ParsedInstruction, PartiallyDecodedInstruction } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';

// List of insider wallets to monitor
const INSIDER_WALLETS = [
  // Add your insider wallet addresses here
  "5KKsLVU6TcbVDK4BS6K1DGDxnh4Q9xjYJ8XaDCG5t8ht",  // Example wallet
];

interface InsiderWalletsProps {
  onTokenSelect?: (tokenAddress: string) => void;
}

export function InsiderWallets({ onTokenSelect }: InsiderWalletsProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const conn = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.testnet.solana.com',
      'confirmed'
    );
    setConnection(conn);
  }, []);

  useEffect(() => {
    if (!connection) return;

    const subscriptions = INSIDER_WALLETS.map(wallet => {
      const publicKey = new PublicKey(wallet);
      
      // Subscribe to account changes
      const subscriptionId = connection.onAccountChange(
        publicKey,
        async (accountInfo) => {
          try {
            setLoading(true);
            // Get recent transactions
            const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 1 });
            
            if (signatures.length > 0) {
              const transaction = await connection.getParsedTransaction(signatures[0].signature);
              if (transaction) {
                await processTransaction(transaction, wallet);
              }
            }
          } catch (error) {
            console.error('Error processing transaction:', error);
          } finally {
            setLoading(false);
          }
        }
      );

      return subscriptionId;
    });

    return () => {
      // Cleanup subscriptions
      subscriptions.forEach(subId => {
        if (subId) {
          connection.removeAccountChangeListener(subId);
        }
      });
    };
  }, [connection]);

  async function processTransaction(transaction: ParsedTransactionWithMeta, walletAddress: string) {
    // Extract transaction details
    const instructions = transaction.transaction.message.instructions;
    
    for (const instruction of instructions) {
      // Check if this is a token swap instruction
      if (instruction.programId.toString() === process.env.NEXT_PUBLIC_RAYDIUM_SWAP_PROGRAM_ID) {
        const accountKeys = 'keys' in instruction 
          ? instruction.keys 
          : (instruction as any).parsed?.info?.accounts || [];

        const newTx = {
          wallet: walletAddress,
          signature: transaction.transaction.signatures[0],
          timestamp: new Date().toISOString(),
          type: 'swap',
          token_address: accountKeys[0].pubkey.toString(), // Add token address
          // Add more transaction details as needed
        };

        setTransactions(prev => [newTx, ...prev].slice(0, 50)); // Keep last 50 transactions
        
        // Save to Supabase
        await supabase
          .from('transactions')
          .insert([newTx]);
      }
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Insider Wallet Activity</h2>
      
      {loading ? (
        <div className="text-center py-4">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No recent transactions</div>
      ) : (
        <div className="space-y-4">
          {transactions.map(tx => (
            <div
              key={tx.signature}
              className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => onTokenSelect?.(tx.token_address)}
            >
              <div className="font-medium">Wallet: {tx.wallet.slice(0, 4)}...{tx.wallet.slice(-4)}</div>
              <div className="text-sm">
                Transaction: {tx.signature.slice(0, 8)}...
              </div>
              <div className="text-xs text-gray-500">
                {new Date(tx.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
