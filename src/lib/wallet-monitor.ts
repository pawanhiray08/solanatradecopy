import { Connection, PublicKey, ParsedTransactionWithMeta, TransactionSignature } from '@solana/web3.js';
import { DexService } from './dex';
import { TradingService } from './trading-service';
import { TradeReplicator } from './trade-replicator';
import { TradeInstruction, TradeReplicationConfig } from './types';
import Decimal from 'decimal.js';
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
  private tradeReplicator: TradeReplicator;
  private trackedWallets: Map<string, WalletConfig>;
  private subscriptionIds?: number[];
  private config: TradeReplicationConfig;

  constructor(
    connection: Connection,
    dexService: DexService,
    tradingService: TradingService,
    userWallet: PublicKey,
    config: TradeReplicationConfig
  ) {
    this.connection = connection;
    this.dexService = dexService;
    this.tradingService = tradingService;
    this.trackedWallets = new Map();
    this.config = config;
    this.tradeReplicator = new TradeReplicator(
      connection,
      dexService,
      tradingService,
      userWallet,
      config
    );
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

      // Convert tracked wallet addresses to PublicKeys
      const walletAddresses = Array.from(this.trackedWallets.keys()).map(
        (address) => new PublicKey(address)
      );

      // Subscribe to each wallet's account changes
      const subscriptionPromises = walletAddresses.map(async (address) => {
        return this.connection.onAccountChange(
          address,
          async (accountInfo) => {
            try {
              // Get recent signatures for this account
              const signatures = await this.connection.getSignaturesForAddress(address, { limit: 1 });
              if (signatures.length > 0) {
                const signature = signatures[0].signature;
                const transaction = await this.connection.getParsedTransaction(signature, 'confirmed');
                if (transaction) {
                  await this.handleTransaction(transaction, address.toBase58());
                }
              }
            } catch (error) {
              console.error('Error processing account change:', error);
            }
          },
          'confirmed'
        );
      });

      // Store all subscription IDs
      this.subscriptionIds = await Promise.all(subscriptionPromises);
      console.log('Started monitoring wallets');
    } catch (error) {
      console.error('Error in startMonitoring:', error);
    }
  }

  stopMonitoring(): void {
    if (this.subscriptionIds !== undefined) {
      this.subscriptionIds.forEach((id) => {
        this.connection.removeAccountChangeListener(id);
      });
      this.subscriptionIds = undefined;
      console.log('Stopped monitoring wallets');
    }
  }

  private async handleTransaction(
    transaction: ParsedTransactionWithMeta,
    walletAddress: string
  ): Promise<void> {
    try {
      const swapInfo = await this.dexService.decodeSwapTransaction(transaction);
      if (!swapInfo) return;

      const { fromToken, toToken, amount } = swapInfo;
      
      // Skip if token is not in enabled list
      if (!this.config.enabledTokens.has(fromToken) && !this.config.enabledTokens.has(toToken)) {
        return;
      }

      // Convert amount to Decimal for calculations
      const tradeAmount = new Decimal(amount);
      
      // Skip if amount is zero
      if (tradeAmount.equals(new Decimal(0))) {
        return;
      }

      // Check if trade size is within limits
      const maxTradeSize = new Decimal(this.config.maxTradeSize);
      if (tradeAmount.gt(maxTradeSize)) {
        console.log('Trade size exceeds maximum limit');
        return;
      }

      // Store trade in database
      await this.storeTrade({
        wallet_address: walletAddress,
        from_token: fromToken,
        to_token: toToken,
        amount: amount,
        timestamp: new Date(),
        transaction_signature: transaction.transaction.signatures[0]
      });

      // Execute the trade
      await this.tradingService.executeTrade(fromToken, toToken, tradeAmount);

    } catch (error) {
      console.error('Error handling transaction:', error);
    }
  }

  private async storeTrade(tradeDetails: {
    wallet_address: string;
    from_token: string;
    to_token: string;
    amount: string;
    timestamp: Date;
    transaction_signature: string;
  }): Promise<void> {
    try {
      const { error } = await supabase.from('trades').insert([
        {
          wallet_address: tradeDetails.wallet_address,
          from_token: tradeDetails.from_token,
          to_token: tradeDetails.to_token,
          amount: tradeDetails.amount,
          timestamp: tradeDetails.timestamp.toISOString(),
          transaction_signature: tradeDetails.transaction_signature,
        },
      ]);

      if (error) {
        console.error('Error saving trade:', error);
      }
    } catch (error) {
      console.error('Error in storeTrade:', error);
    }
  }
}
