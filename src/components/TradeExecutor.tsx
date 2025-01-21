'use client';

import { useState, Dispatch, SetStateAction } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, Transaction, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';

interface TradeExecutorProps {
  onTokenSelect: Dispatch<SetStateAction<string | null>>;
}

const getConnection = async () => {
  const primaryRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  const backupRpc = process.env.NEXT_PUBLIC_SOLANA_BACKUP_RPC_URL;
  
  try {
    const connection = new Connection(primaryRpc!, 'confirmed');
    await connection.getVersion(); // Test the connection
    return connection;
  } catch (error) {
    console.warn('Primary RPC failed, falling back to backup:', error);
    if (!backupRpc) throw new Error('No backup RPC configured');
    
    const backupConnection = new Connection(backupRpc, 'confirmed');
    try {
      await backupConnection.getVersion();
      return backupConnection;
    } catch (backupError) {
      throw new Error('All RPC endpoints failed');
    }
  }
};

export function TradeExecutor({ onTokenSelect }: TradeExecutorProps) {
  const { publicKey, signTransaction } = useWallet();
  const [maxTradeSize, setMaxTradeSize] = useState<number>(1); // in SOL
  const [stopLoss, setStopLoss] = useState<number>(10); // percentage
  const [takeProfit, setTakeProfit] = useState<number>(20); // percentage
  const [isAutoTrading, setIsAutoTrading] = useState(false);

  async function executeSwap(
    tokenInMint: PublicKey,
    tokenOutMint: PublicKey,
    amount: number
  ) {
    if (!publicKey || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    // Get connection with failover support
    const connection = await getConnection();

    try {
      // Check SOL balance first
      const balance = await connection.getBalance(publicKey);
      const minimumBalance = 0.05 * 1e9; // 0.05 SOL for fees
      if (balance < minimumBalance) {
        throw new Error(`Insufficient SOL balance. Minimum required: 0.05 SOL for fees. Current balance: ${balance / 1e9} SOL`);
      }

      // Check token balance if swapping tokens
      const tokenBalance = await connection.getTokenAccountBalance(
        await getAssociatedTokenAddress(tokenInMint, publicKey)
      ).catch(() => null);

      if (!tokenBalance) {
        throw new Error('Token account not found. Please check if you have the token in your wallet.');
      }

      if (Number(tokenBalance.value.amount) < amount) {
        throw new Error(`Insufficient token balance. Required: ${amount}, Available: ${tokenBalance.value.uiAmount}`);
      }

      // Create and prepare transaction
      const transaction = new Transaction();
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = publicKey;
      
      // Add your swap instruction here based on the DEX you're using
      // For example, with Raydium:
      // const swapInstruction = await createRaydiumSwapInstruction(...);
      // transaction.add(swapInstruction);

      // Sign and send transaction
      const signedTx = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      
      // Wait for confirmation with specific commitment
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: transaction.recentBlockhash,
        lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight
      }, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      console.log('Swap executed successfully:', signature);
      return signature;
    } catch (error) {
      console.error('Error executing swap:', error);
      throw error;
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Trade Settings</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Max Trade Size (SOL)
          </label>
          <input
            type="number"
            value={maxTradeSize}
            onChange={(e) => setMaxTradeSize(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Stop Loss (%)
          </label>
          <input
            type="number"
            value={stopLoss}
            onChange={(e) => setStopLoss(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Take Profit (%)
          </label>
          <input
            type="number"
            value={takeProfit}
            onChange={(e) => setTakeProfit(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div className="flex items-center">
          <button
            onClick={() => setIsAutoTrading(!isAutoTrading)}
            className={`px-4 py-2 rounded-md ${
              isAutoTrading 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-green-500 hover:bg-green-600'
            } text-white font-medium`}
          >
            {isAutoTrading ? 'Stop Auto Trading' : 'Start Auto Trading'}
          </button>
        </div>
      </div>
    </div>
  );
}
