import { ParsedTransactionWithMeta, ParsedInstruction, PartiallyDecodedInstruction, PublicKey } from '@solana/web3.js';

export interface ParsedTransactionData {
  signature: string;
  timestamp: number;
  tokenAddress?: string;
  tokenAmount?: number;
  type?: string;
  fee: number;
}

export const parseTransaction = (transaction: ParsedTransactionWithMeta): ParsedTransactionData | null => {
  if (!transaction.meta || !transaction.blockTime) return null;

  const result: ParsedTransactionData = {
    signature: transaction.transaction.signatures[0],
    timestamp: transaction.blockTime * 1000, // Convert to milliseconds
    fee: transaction.meta.fee / 10 ** 9, // Convert lamports to SOL
  };

  // Handle both ParsedInstruction and PartiallyDecodedInstruction
  const instructions = transaction.transaction.message.instructions;
  for (const ix of instructions) {
    if ('parsed' in ix) {
      const parsedIx = ix as ParsedInstruction;
      if (parsedIx.parsed && typeof parsedIx.parsed === 'object' && 'type' in parsedIx.parsed) {
        result.type = parsedIx.parsed.type;
        
        // Handle token transfers
        if (parsedIx.parsed.type === 'transfer' && 'info' in parsedIx.parsed) {
          const info = parsedIx.parsed.info as any;
          if (info.amount) {
            result.tokenAmount = parseFloat(info.amount);
          }
          if (info.mint) {
            result.tokenAddress = info.mint;
          }
        }
      }
    } else {
      // Handle PartiallyDecodedInstruction
      const decodedIx = ix as PartiallyDecodedInstruction;
      result.type = 'unknown';
      // Add additional parsing logic for specific program IDs if needed
    }
  }

  return result;
};

export const isValidPublicKey = (key: string): boolean => {
  try {
    new PublicKey(key);
    return true;
  } catch {
    return false;
  }
};
