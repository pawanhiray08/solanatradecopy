import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { supabase } from './supabase';

export class TradeService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!);
  }

  async monitorWallets(walletAddresses: string[]) {
    try {
      // Subscribe to transaction signatures for each wallet
      walletAddresses.forEach(async (address) => {
        this.connection.onLogs(
          new PublicKey(address),
          async (logs) => {
            await this.processTransaction(logs.signature);
          },
          'confirmed'
        );
      });
    } catch (error) {
      console.error('Error monitoring wallets:', error);
      throw error;
    }
  }

  async processTransaction(signature: string) {
    try {
      const transaction = await this.connection.getParsedTransaction(signature, 'confirmed');
      if (!transaction) return;

      const tradeInfo = await this.decodeTrade(transaction);
      if (!tradeInfo) return;

      // Store trade information
      await this.storeTrade(tradeInfo);

      // Check for coordinated trades
      await this.checkCoordinatedTrades(tradeInfo);

      // Execute copy trade if conditions are met
      await this.executeCopyTrade(tradeInfo);
    } catch (error) {
      console.error('Error processing transaction:', error);
    }
  }

  private async decodeTrade(transaction: ParsedTransactionWithMeta) {
    try {
      // Extract relevant information from the transaction
      const instructions = transaction.transaction.message.instructions;
      const accounts = transaction.transaction.message.accountKeys;

      // Look for Raydium or Orca swap instructions
      const swapInstruction = instructions.find((ix: any) => {
        // Add logic to identify DEX swap instructions
        return ix.programId.toString() === process.env.NEXT_PUBLIC_RAYDIUM_PROGRAM_ID || 
               ix.programId.toString() === process.env.NEXT_PUBLIC_ORCA_PROGRAM_ID;
      });

      if (!swapInstruction) return null;

      // Extract token information and amounts
      const tokenAddress = ''; // Extract from instruction
      const amount = 0; // Extract from instruction
      const price = 0; // Calculate from amounts
      const dexPlatform = swapInstruction.programId.toString() === process.env.NEXT_PUBLIC_RAYDIUM_PROGRAM_ID ? 'raydium' : 'orca';

      return {
        wallet_address: accounts[0].pubkey.toString(),
        token_address: tokenAddress,
        amount,
        price,
        dex_platform: dexPlatform,
        transaction_signature: transaction.transaction.signatures[0],
      };
    } catch (error) {
      console.error('Error decoding trade:', error);
      return null;
    }
  }

  private async storeTrade(tradeInfo: any) {
    try {
      // Verify API endpoints and check for necessary tables in the Supabase database
      await this.verifyApiEndpoints();

      const { error } = await supabase.from('dex_trades').insert([tradeInfo]);
      if (error) throw error;

      // Update wallet statistics
      await this.updateWalletStats(tradeInfo.wallet_address);
    } catch (error) {
      console.error('Error storing trade:', error);
    }
  }

  private async verifyApiEndpoints() {
    try {
      // Ensure that the following endpoints are correct:
      // - /rest/v1/traders
      // - /rest/v1/trader_follows
      // - /rest/v1/trades
      // - /rest/v1/positions

      const endpoints = [
        '/rest/v1/traders',
        '/rest/v1/trader_follows',
        '/rest/v1/trades',
        '/rest/v1/positions',
      ];

      for (const endpoint of endpoints) {
        const response = await supabase.from(endpoint).select('*').limit(1);
        if (response.error && response.error.status === 404) {
          console.error(`Error: ${endpoint} endpoint not found`);
          throw new Error(`Endpoint not found: ${endpoint}`);
        }
      }

      // Check for necessary tables in the Supabase database
      const tables = ['dex_trades', 'insider_wallets', 'trade_settings', 'trade_alerts'];
      for (const table of tables) {
        const response = await supabase.from(table).select('*').limit(1);
        if (response.error && response.error.status === 404) {
          console.error(`Error: ${table} table not found`);
          throw new Error(`Table not found: ${table}`);
        }
      }
    } catch (error) {
      console.error('Error verifying API endpoints:', error);
      throw error;
    }
  }

  private async checkCoordinatedTrades(tradeInfo: any) {
    try {
      // Look for similar trades within a time window
      const { data: recentTrades } = await supabase
        .from('dex_trades')
        .select('wallet_address, amount')
        .eq('token_address', tradeInfo.token_address)
        .gt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if (recentTrades && recentTrades.length >= 3) {
        // Create coordinated trade alert
        const totalVolume = recentTrades.reduce((sum, trade) => sum + trade.amount, 0);
        await supabase.from('coordinated_trades').insert([{
          token_address: tradeInfo.token_address,
          number_of_wallets: recentTrades.length,
          total_volume: totalVolume,
          average_price: tradeInfo.price,
          dex_platform: tradeInfo.dex_platform
        }]);

        // Create alert
        await this.createAlert({
          type: 'Coordinated Trade',
          message: `Detected ${recentTrades.length} wallets trading ${tradeInfo.token_address}`,
          importance: 'high'
        });
      }
    } catch (error) {
      console.error('Error checking coordinated trades:', error);
    }
  }

  private async updateWalletStats(walletAddress: string) {
    try {
      // Calculate win rate and total profit/loss
      const { data: trades } = await supabase
        .from('dex_trades')
        .select('profit_loss')
        .eq('wallet_address', walletAddress);

      if (!trades) return;

      const totalTrades = trades.length;
      const winningTrades = trades.filter(trade => trade.profit_loss > 0).length;
      const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
      const totalProfitLoss = trades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0);

      // Update wallet statistics
      await supabase
        .from('insider_wallets')
        .update({
          win_rate: winRate,
          total_profit_loss: totalProfitLoss
        })
        .eq('address', walletAddress);

      // Update wallet ranking
      await this.updateWalletRankings();
    } catch (error) {
      console.error('Error updating wallet stats:', error);
    }
  }

  private async updateWalletRankings() {
    try {
      // Get all wallets sorted by profit/loss
      const { data: wallets } = await supabase
        .from('insider_wallets')
        .select('address, total_profit_loss')
        .order('total_profit_loss', { ascending: false });

      if (!wallets) return;

      // Update ranks
      for (let i = 0; i < wallets.length; i++) {
        await supabase
          .from('insider_wallets')
          .update({ rank: i + 1 })
          .eq('address', wallets[i].address);
      }
    } catch (error) {
      console.error('Error updating wallet rankings:', error);
    }
  }

  private async createAlert(alert: { type: string; message: string; importance: string }) {
    try {
      await supabase.from('trade_alerts').insert([alert]);
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  }

  private async executeCopyTrade(tradeInfo: any) {
    try {
      // Get trade settings
      const { data: settings } = await supabase
        .from('trade_settings')
        .select('*')
        .eq('wallet_address', tradeInfo.wallet_address)
        .single();

      if (!settings || !settings.enabled) return;

      // Check trade cap
      if (tradeInfo.amount > settings.max_trade_cap) {
        await this.createAlert({
          type: 'Trade Rejected',
          message: `Trade amount exceeds max cap for wallet ${tradeInfo.wallet_address}`,
          importance: 'medium'
        });
        return;
      }

      // TODO: Implement actual trade execution using Raydium/Orca SDK
      // This would include:
      // 1. Creating the swap transaction
      // 2. Setting up stop-loss and take-profit orders
      // 3. Executing the transaction
      // 4. Monitoring the trade status

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error executing copy trade:', error);
      await this.createAlert({
        type: 'Trade Error',
        message: `Failed to execute copy trade: ${errorMessage}`,
        importance: 'high'
      });
    }
  }
}
