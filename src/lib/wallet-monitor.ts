import { Connection, PublicKey, ParsedTransactionWithMeta, TransactionSignature } from '@solana/web3.js';
import { DexService } from './dex';
import { TradingService } from './trading-service';
import { supabase } from './supabase';

export interface WalletConfig {
  address: string;
  name?: string;
  type: 'insider' | 'whale';
  isActive: boolean;
}

export class WalletMonitor {
  private connection: Connection;
  private dexService: DexService;
  private tradingService: TradingService;
  private trackedWallets: Map<string, WalletConfig>;
  private subscriptionId?: number;

  constructor(
    connection: Connection,
    dexService: DexService,
    tradingService: TradingService
  ) {
    this.connection = connection;
    this.dexService = dexService;
    this.tradingService = tradingService;
    this.trackedWallets = new Map();
  }

  async loadWallets(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('tracked_wallets')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Error loading wallets:', error);
        return;
      }

      this.trackedWallets.clear();
      data.forEach((wallet) => {
        this.trackedWallets.set(wallet.address, {
          address: wallet.address,
          name: wallet.name,
          type: wallet.type,
          isActive: wallet.is_active,
        });
      });

      console.log(`Loaded ${this.trackedWallets.size} wallets for tracking`);
    } catch (error) {
      console.error('Error in loadWallets:', error);
    }
  }

  async startMonitoring(): Promise<void> {
    try {
      // Load wallets before starting monitoring
      await this.loadWallets();

      // Create an array of PublicKeys for all tracked wallets
      const walletAddresses = Array.from(this.trackedWallets.keys()).map(
        (address) => new PublicKey(address)
      );

      // Subscribe to transaction notifications for all tracked wallets
      this.subscriptionId = this.connection.onLogs(
        walletAddresses,
        'confirmed',
        async (logs) => {
          if (logs.err) {
            console.error('Transaction error:', logs.err);
            return;
          }

          try {
            const signature = logs.signature;
            const transaction = await this.connection.getParsedTransaction(
              signature,
              'confirmed'
            );

            if (transaction) {
              await this.handleTransaction(signature, transaction);
            }
          } catch (error) {
            console.error('Error processing transaction:', error);
          }
        }
      );

      console.log('Started monitoring wallets');
    } catch (error) {
      console.error('Error in startMonitoring:', error);
    }
  }

  stopMonitoring(): void {
    if (this.subscriptionId !== undefined) {
      this.connection.removeOnLogsListener(this.subscriptionId);
      this.subscriptionId = undefined;
      console.log('Stopped monitoring wallets');
    }
  }

  private async handleTransaction(
    signature: TransactionSignature,
    transaction: ParsedTransactionWithMeta
  ): Promise<void> {
    try {
      // Get the wallet address from the transaction
      const walletAddress = transaction.transaction.message.accountKeys[0].pubkey.toString();
      const walletConfig = this.trackedWallets.get(walletAddress);

      if (!walletConfig) {
        return;
      }

      // Check if this is a DEX swap transaction
      const swapDetails = await this.dexService.decodeSwapTransaction(transaction);
      
      if (swapDetails) {
        console.log(`Detected swap transaction from ${walletConfig.name || walletAddress}:`, {
          signature,
          ...swapDetails,
        });

        // Save the transaction to the database
        await this.saveTrade({
          signature,
          walletAddress,
          walletType: walletConfig.type,
          ...swapDetails,
        });

        // If this is an insider wallet, execute copy trade
        if (walletConfig.type === 'insider') {
          await this.tradingService.handleInsiderTransaction(transaction, walletAddress);
        }
      }
    } catch (error) {
      console.error('Error handling transaction:', error);
    }
  }

  private async saveTrade(tradeDetails: {
    signature: string;
    walletAddress: string;
    walletType: string;
    fromToken: string;
    toToken: string;
    amount: string;
    platform?: string;
  }): Promise<void> {
    try {
      const { error } = await supabase.from('trades').insert([
        {
          signature: tradeDetails.signature,
          wallet_address: tradeDetails.walletAddress,
          wallet_type: tradeDetails.walletType,
          from_token: tradeDetails.fromToken,
          to_token: tradeDetails.toToken,
          amount: tradeDetails.amount,
          platform: tradeDetails.platform || 'unknown',
          timestamp: new Date().toISOString(),
        },
      ]);

      if (error) {
        console.error('Error saving trade:', error);
      }
    } catch (error) {
      console.error('Error in saveTrade:', error);
    }
  }
}
