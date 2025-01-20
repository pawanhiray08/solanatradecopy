import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { DexService, SwapParams } from './dex';
import { supabase } from './supabase';
import Decimal from 'decimal.js';

export interface TradeSettings {
  maxTradeSize: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  autoTradingEnabled: boolean;
  minTradeSize: number;
  slippageTolerance: number;
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

  private async decodeSwapTransaction(transaction: ParsedTransactionWithMeta): Promise<any> {
    // This is a placeholder for actual transaction decoding logic
    // You'll need to implement specific DEX protocol transaction parsing
    const instructions = transaction.transaction.message.instructions;
    
    for (const instruction of instructions) {
      // Check if this is a swap instruction
      if (instruction.programId.toString() === process.env.NEXT_PUBLIC_RAYDIUM_SWAP_PROGRAM_ID) {
        // Parse the instruction data to get swap details
        // This is simplified, you'll need to implement actual parsing logic
        return {
          fromToken: new PublicKey("...").toString(), // Extract from instruction
          toToken: new PublicKey("...").toString(),   // Extract from instruction
          amount: new Decimal(0),          // Extract from instruction
          slippage: new Decimal(0),           // Calculate from amounts
        };
      }
    }

    return null;
  }

  private async saveTransaction(
    signature: string,
    insiderWallet: string,
    swapDetails: {
      fromToken: string;
      toToken: string;
      amount: typeof Decimal;
      slippage: typeof Decimal;
    }
  ) {
    const { error } = await supabase
      .from('transactions')
      .insert({
        signature,
        wallet_address: insiderWallet,
        type: 'swap',
        token_in: swapDetails.fromToken,
        token_out: swapDetails.toToken,
        amount_in: swapDetails.amount.toString(),
        amount_out: swapDetails.amount.mul(swapDetails.slippage).toString(),
        dex: 'raydium',
        status: 'completed'
      });

    if (error) {
      console.error('Error saving transaction:', error);
    }
  }

  private async executeCopyTrade(swapDetails: {
    fromToken: string;
    toToken: string;
    amount: typeof Decimal;
    slippage: typeof Decimal;
  }) {
    try {
      // Calculate trade size based on settings
      const tradeSize = this.calculateTradeSize(swapDetails.amount);
      
      const swapParams: SwapParams = {
        fromToken: new PublicKey(swapDetails.fromToken),
        toToken: new PublicKey(swapDetails.toToken),
        amount: tradeSize,
        slippage: swapDetails.slippage
      };

      // Check if we have enough balance
      const balance = await this.dexService.getTokenBalance(
        this.userWallet.toString(),
        swapParams.fromToken
      );

      if (balance.lessThan(tradeSize)) {
        console.error('Insufficient balance for trade');
        return;
      }

      // Execute the swap
      const result = await this.dexService.swapTokens(
        swapParams.fromToken,
        swapParams.toToken,
        swapParams.amount,
        swapParams.slippage,
        this.userWallet.toString()
      );

      console.log('Copy trade executed:', result);
    } catch (error) {
      console.error('Error executing copy trade:', error);
    }
  }

  private calculateTradeSize(insiderAmount: typeof Decimal): typeof Decimal {
    // Convert max trade size from SOL to lamports
    const maxSize = new Decimal(this.settings.maxTradeSize).mul(new Decimal(10).pow(9));
    const minSize = new Decimal(this.settings.minTradeSize).mul(new Decimal(10).pow(9));
    
    // Use the smaller of insider's trade size or our max size, but not less than min size
    return Decimal.max(Decimal.min(insiderAmount, maxSize), minSize);
  }

  updateSettings(newSettings: TradeSettings) {
    this.settings = newSettings;
  }
}
