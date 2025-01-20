import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { DexService, SwapParams } from './dex';
import { supabase } from './supabase';
import Decimal from 'decimal.js';

export interface TradeSettings {
  maxTradeSize: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  autoTradingEnabled: boolean;
}

export class TradingService {
  private connection: Connection;
  private dexService: DexService;
  private userWallet: PublicKey;
  private settings: TradeSettings;

  constructor(
    connection: Connection,
    dexService: DexService,
    userWallet: PublicKey,
    settings: TradeSettings
  ) {
    this.connection = connection;
    this.dexService = dexService;
    this.userWallet = userWallet;
    this.settings = settings;
  }

  async handleInsiderTransaction(transaction: ParsedTransactionWithMeta, insiderWallet: string) {
    try {
      // Extract swap details from the transaction
      const swapDetails = await this.decodeSwapTransaction(transaction);
      if (!swapDetails) return;

      // Save transaction to database
      await this.saveTransaction(transaction.transaction.signatures[0], insiderWallet, swapDetails);

      // Check if auto-trading is enabled and execute the trade
      if (this.settings.autoTradingEnabled) {
        await this.executeCopyTrade(swapDetails);
      }
    } catch (error) {
      console.error('Error handling insider transaction:', error);
    }
  }

  private async decodeSwapTransaction(transaction: ParsedTransactionWithMeta) {
    // This is a placeholder for actual transaction decoding logic
    // You'll need to implement specific DEX protocol transaction parsing
    const instructions = transaction.transaction.message.instructions;
    
    for (const instruction of instructions) {
      // Check if this is a swap instruction
      if (instruction.programId.toString() === process.env.NEXT_PUBLIC_RAYDIUM_SWAP_PROGRAM_ID) {
        // Parse the instruction data to get swap details
        // This is simplified, you'll need to implement actual parsing logic
        return {
          fromToken: new PublicKey("..."), // Extract from instruction
          toToken: new PublicKey("..."),   // Extract from instruction
          amount: new Decimal(0),          // Extract from instruction
          price: new Decimal(0),           // Calculate from amounts
        };
      }
    }

    return null;
  }

  private async saveTransaction(
    signature: string,
    insiderWallet: string,
    swapDetails: any
  ) {
    const { error } = await supabase
      .from('transactions')
      .insert({
        signature,
        wallet_address: insiderWallet,
        type: 'swap',
        token_in: swapDetails.fromToken.toString(),
        token_out: swapDetails.toToken.toString(),
        amount_in: swapDetails.amount.toString(),
        amount_out: swapDetails.amount.mul(swapDetails.price).toString(),
        dex: 'raydium',
        status: 'completed'
      });

    if (error) {
      console.error('Error saving transaction:', error);
    }
  }

  private async executeCopyTrade(swapDetails: any) {
    try {
      // Calculate trade size based on settings
      const tradeSize = this.calculateTradeSize(swapDetails.amount);

      // Prepare swap parameters
      const swapParams: SwapParams = {
        fromToken: swapDetails.fromToken,
        toToken: swapDetails.toToken,
        amount: tradeSize,
        slippage: 1, // 1% slippage tolerance
      };

      // Check if we have enough balance
      const balance = await this.dexService.getTokenBalance(
        this.userWallet,
        swapParams.fromToken
      );

      if (balance.lt(tradeSize)) {
        console.error('Insufficient balance for trade');
        return;
      }

      // Execute the swap
      const result = await this.dexService.executeSwap(
        this.userWallet,
        swapParams,
        async (tx) => tx // Replace with actual transaction signing logic
      );

      console.log('Copy trade executed:', result);
    } catch (error) {
      console.error('Error executing copy trade:', error);
    }
  }

  private calculateTradeSize(insiderAmount: Decimal): Decimal {
    // Convert max trade size from SOL to lamports
    const maxSize = new Decimal(this.settings.maxTradeSize).mul(1e9);
    
    // Use the smaller of insider's trade size or our max size
    return Decimal.min(insiderAmount, maxSize);
  }

  updateSettings(newSettings: TradeSettings) {
    this.settings = newSettings;
  }
}
