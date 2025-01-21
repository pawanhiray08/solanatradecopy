import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { DexService } from './dex';
import { TradingService } from './trading-service';
import { TradeInstruction, TradeReplicationConfig, TokenConfig } from './types';
import Decimal from 'decimal.js';

export class TradeReplicator {
  private connection: Connection;
  private dexService: DexService;
  private tradingService: TradingService;
  private config: TradeReplicationConfig;
  private tokenConfigs: Map<string, TokenConfig>;
  private userWallet: PublicKey;

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
    this.userWallet = userWallet;
    this.config = config;
    this.tokenConfigs = new Map();
  }

  public setConfig(config: TradeReplicationConfig) {
    this.config = config;
  }

  public setTokenConfig(config: TokenConfig) {
    this.tokenConfigs.set(config.address, config);
  }

  public isTokenEnabled(tokenAddress: string): boolean {
    const tokenConfig = this.tokenConfigs.get(tokenAddress);
    if (tokenConfig) {
      return tokenConfig.enabled;
    }
    return this.config.enabledTokens.has(tokenAddress);
  }

  private getTokenConfig(tokenAddress: string): TokenConfig | undefined {
    return this.tokenConfigs.get(tokenAddress);
  }

  private async validateTrade(instruction: TradeInstruction): Promise<boolean> {
    try {
      // Check if token is enabled
      if (!this.isTokenEnabled(instruction.tokenAddress)) {
        console.log(`Token ${instruction.tokenAddress} is not enabled for trading`);
        return false;
      }

      // Get token configuration
      const tokenConfig = this.getTokenConfig(instruction.tokenAddress);
      const maxTradeSize = tokenConfig?.maxTradeSize || this.config.maxTradeSize;

      // Check trade size
      if (instruction.amount > maxTradeSize) {
        console.log(`Trade size ${instruction.amount} exceeds maximum ${maxTradeSize}`);
        return false;
      }

      // Check wallet balance
      const balance = await this.connection.getBalance(this.userWallet);
      const balanceInSol = balance / 1e9; // Convert lamports to SOL
      if (balanceInSol < instruction.amount) {
        console.log(`Insufficient balance: ${balanceInSol} SOL`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating trade:', error);
      return false;
    }
  }

  public async replicateTrade(instruction: TradeInstruction): Promise<string | null> {
    try {
      // Validate the trade first
      const isValid = await this.validateTrade(instruction);
      if (!isValid) {
        return null;
      }

      // Calculate trade amount with slippage protection
      const amount = new Decimal(instruction.amount);
      const slippageMultiplier = new Decimal(1 - this.config.slippageTolerance / 100);
      const minAmountOut = amount.mul(slippageMultiplier);

      // Execute the trade
      if (instruction.type === 'buy') {
        const result = await this.tradingService.swapTokens(
          'SOL', // From SOL
          instruction.tokenAddress, // To target token
          amount,
          new Decimal(this.config.slippageTolerance),
          this.userWallet.toString()
        );
        
        console.log('Trade replicated successfully:', {
          type: 'buy',
          tokenAddress: instruction.tokenAddress,
          amountIn: result.amountIn.toString(),
          amountOut: result.amountOut.toString(),
          priceImpact: result.priceImpact.toString()
        });

        // TODO: Save trade to database
        return 'success';
      } else {
        // For sell trades
        const result = await this.tradingService.swapTokens(
          instruction.tokenAddress, // From target token
          'SOL', // Back to SOL
          amount,
          new Decimal(this.config.slippageTolerance),
          this.userWallet.toString()
        );

        console.log('Trade replicated successfully:', {
          type: 'sell',
          tokenAddress: instruction.tokenAddress,
          amountIn: result.amountIn.toString(),
          amountOut: result.amountOut.toString(),
          priceImpact: result.priceImpact.toString()
        });

        // TODO: Save trade to database
        return 'success';
      }
    } catch (error) {
      console.error('Error replicating trade:', error);
      return null;
    }
  }

  // Add stop loss and take profit monitoring
  public async checkPositions() {
    try {
      // Get all token balances
      for (const [tokenAddress, config] of this.tokenConfigs) {
        if (!config.enabled) continue;

        // Get token balance
        const balance = await this.dexService.getTokenBalance(
          tokenAddress,
          this.userWallet.toString()
        );

        if (balance.isZero()) continue;

        // Get current price
        const currentPrice = await this.dexService.getPrice(tokenAddress);
        
        // Check stop loss
        if (config.stopLoss) {
          const stopLossPrice = new Decimal(config.stopLoss);
          if (currentPrice.lessThanOrEqualTo(stopLossPrice)) {
            console.log(`Stop loss triggered for ${config.symbol}`);
            await this.replicateTrade({
              type: 'sell',
              tokenAddress,
              amount: balance.toNumber(),
              price: currentPrice.toNumber(),
              walletAddress: this.userWallet.toString(),
              signature: 'stop_loss',
              timestamp: Date.now()
            });
          }
        }

        // Check take profit
        if (config.takeProfit) {
          const takeProfitPrice = new Decimal(config.takeProfit);
          if (currentPrice.greaterThanOrEqualTo(takeProfitPrice)) {
            console.log(`Take profit triggered for ${config.symbol}`);
            await this.replicateTrade({
              type: 'sell',
              tokenAddress,
              amount: balance.toNumber(),
              price: currentPrice.toNumber(),
              walletAddress: this.userWallet.toString(),
              signature: 'take_profit',
              timestamp: Date.now()
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking positions:', error);
    }
  }
}
