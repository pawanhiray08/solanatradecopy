'use client';

import { useState, Dispatch, SetStateAction } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, Transaction, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { getConnection } from '@/config/solana';
import { toast } from 'react-hot-toast';

interface TradeExecutorProps {
  onTokenSelect: Dispatch<SetStateAction<string | null>>;
}

export function TradeExecutor({ onTokenSelect }: TradeExecutorProps) {
  const { publicKey, signTransaction } = useWallet();
  const [maxTradeSize, setMaxTradeSize] = useState<number>(1); // in SOL
  const [stopLoss, setStopLoss] = useState<number>(10); // percentage
  const [takeProfit, setTakeProfit] = useState<number>(20); // percentage
  const [isAutoTrading, setIsAutoTrading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function executeSwap(
    tokenInMint: PublicKey,
    tokenOutMint: PublicKey,
    amount: number
  ) {
    if (!publicKey || !signTransaction) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get connection with failover support
      const connection = await getConnection();

      // Get token accounts
      const tokenInAccount = await getAssociatedTokenAddress(
        tokenInMint,
        publicKey
      );

      const tokenOutAccount = await getAssociatedTokenAddress(
        tokenOutMint,
        publicKey
      );

      // Create transaction
      const transaction = new Transaction();

      // Add your swap instruction here
      // This is a placeholder - you'll need to implement the actual swap logic
      // based on your chosen DEX (e.g., Raydium, Orca, etc.)

      // Sign and send transaction
      transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;
      transaction.feePayer = publicKey;

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      
      await connection.confirmTransaction(signature);
      
      toast.success('Swap executed successfully!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to execute swap';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Trade Executor</h2>
      
      <div className="space-y-2">
        <label className="block">
          <span>Max Trade Size (SOL)</span>
          <input
            type="number"
            value={maxTradeSize}
            onChange={(e) => setMaxTradeSize(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            min={0.1}
            step={0.1}
          />
        </label>

        <label className="block">
          <span>Stop Loss (%)</span>
          <input
            type="number"
            value={stopLoss}
            onChange={(e) => setStopLoss(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            min={1}
            max={100}
          />
        </label>

        <label className="block">
          <span>Take Profit (%)</span>
          <input
            type="number"
            value={takeProfit}
            onChange={(e) => setTakeProfit(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            min={1}
            max={1000}
          />
        </label>

        <div className="flex items-center space-x-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isAutoTrading}
              onChange={(e) => setIsAutoTrading(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm"
            />
            <span className="ml-2">Enable Auto-Trading</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      {!publicKey ? (
        <div className="text-amber-500">Please connect your wallet to start trading</div>
      ) : (
        <button
          onClick={() => {/* Implement your trading logic */}}
          disabled={loading || !isAutoTrading}
          className={`w-full py-2 px-4 rounded-md ${
            loading || !isAutoTrading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading ? 'Processing...' : 'Start Trading'}
        </button>
      )}
    </div>
  );
}
