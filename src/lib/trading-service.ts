import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { DexService, SwapParams } from './dex';
import { supabase } from './supabase';
import DecimalJS from 'decimal.js';

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

    // Verify API endpoints and check for necessary tables in the Supabase database
    this.verifyApiEndpoints();
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
      // Check if this is a swap instruction and has the required properties
      if ('programId' in instruction && 
          instruction.programId.toString() === process.env.NEXT_PUBLIC_RAYDIUM_SWAP_PROGRAM_ID &&
          'data' in instruction &&
          'accounts' in instruction) {
        
        const accounts = instruction.accounts;
        if (accounts.length < 2) continue;

        // Parse the instruction data to get swap details
        const buffer = Buffer.from(instruction.data);
        const hexData = buffer.subarray(8, 16).toString('hex');
        return {
          fromToken: accounts[0].toString(), // Extract from instruction
          toToken: accounts[1].toString(),   // Extract from instruction
          amount: new DecimalJS(parseInt(hexData, 16)), // Extract from instruction
          slippage: new DecimalJS(0),         // Calculate from amounts
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
      amount: DecimalJS;
      slippage: DecimalJS;
    }
  ) {
    const { error } = await supabase
      .from('trades')
      .insert({
        signature,
        wallet_address: insiderWallet,
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
    amount: DecimalJS;
    slippage: DecimalJS;
  }) {
    try {
      // Calculate trade size based on settings
      const tradeSize = this.calculateTradeSize(swapDetails.amount);
      
      const swapParams: SwapParams = {
        fromToken: swapDetails.fromToken,
        toToken: swapDetails.toToken,
        amount: tradeSize,
        slippage: swapDetails.slippage
      };

      // Check if we have enough balance
      const balance = await this.dexService.getTokenBalance(
        this.userWallet.toString(),
        swapDetails.fromToken
      );

      if (balance.lt(tradeSize)) {
        console.error('Insufficient balance for copy trade');
        return;
      }

      // Execute the swap
      await this.dexService.swapTokens(
        swapParams.fromToken,
        swapParams.toToken,
        swapParams.amount,
        swapParams.slippage,
        this.userWallet.toString()
      );
    } catch (error) {
      console.error('Error executing copy trade:', error);
    }
  }

  async executeTrade(fromToken: string, toToken: string, amount: DecimalJS): Promise<{
    amountIn: DecimalJS;
    amountOut: DecimalJS;
    priceImpact: DecimalJS;
  }> {
    try {
      const swapParams: SwapParams = {
        fromToken,
        toToken,
        amount,
        slippage: new DecimalJS(this.settings.slippageTolerance)
      };

      // Execute the swap through DexService
      const result = await this.dexService.swapTokens(
        swapParams.fromToken,
        swapParams.toToken,
        swapParams.amount,
        swapParams.slippage,
        this.userWallet.toString()
      );
      return result;
    } catch (error) {
      console.error('Error executing trade:', error);
      throw error;
    }
  }

  private calculateTradeSize(insiderAmount: DecimalJS): DecimalJS {
    // Convert max trade size from SOL to lamports
    const maxSize = new DecimalJS(this.settings.maxTradeSize).mul(new DecimalJS(10).pow(9));
    const minSize = new DecimalJS(this.settings.minTradeSize).mul(new DecimalJS(10).pow(9));
    
    // First get the minimum between insiderAmount and maxSize
    const minResult = insiderAmount.lt(maxSize) ? insiderAmount : maxSize;
    // Then ensure it's not less than minSize
    return minResult.gt(minSize) ? minResult : minSize;
  }

  private async verifyApiEndpoints() {
    try {
      // Verify API endpoints and check for necessary tables in the Supabase database
      const endpoints = [
        '/rest/v1/traders',
        '/rest/v1/trader_follows',
        '/rest/v1/trades',
        '/rest/v1/positions',
      ];

      for (const endpoint of endpoints) {
        const response = await supabase.from(endpoint).select('id');
        if (response.error) {
          console.error(`Error verifying API endpoint ${endpoint}:`, response.error);
        }
      }

      // Check for necessary tables in the Supabase database
      const tables = ['trades'];
      for (const table of tables) {
        const response = await supabase.from(table).select('id');
        if (response.error) {
          console.error(`Error verifying table ${table}:`, response.error);
        }
      }
    } catch (error) {
      console.error('Error verifying API endpoints:', error);
    }
  }

  updateSettings(newSettings: TradeSettings) {
    this.settings = newSettings;
  }
}
