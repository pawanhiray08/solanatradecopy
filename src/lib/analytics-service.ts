import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from './supabase';
import { DexService } from './dex';
import Decimal from 'decimal.js';

export interface WalletPerformance {
  wallet_address: string;
  total_trades: number;
  winning_trades: number;
  total_profit_loss: number;
  win_rate: number;
  average_roi: number;
  last_trade_at: string;
}

export interface TokenRiskMetrics {
  token_address: string;
  token_symbol: string;
  liquidity_score: number;
  volume_24h: number;
  price_volatility_24h: number;
  risk_level: 'low' | 'medium' | 'high';
  last_updated: string;
}

export interface PortfolioSnapshot {
  total_value_sol: number;
  total_pnl_sol: number;
  total_pnl_percentage: number;
  token_holdings: Array<{
    token_address: string;
    symbol: string;
    amount: number;
    value_sol: number;
  }>;
}

export class AnalyticsService {
  private connection: Connection;
  private dexService: DexService;
  private userId: string;

  constructor(connection: Connection, dexService: DexService, userId: string) {
    this.connection = connection;
    this.dexService = dexService;
    this.userId = userId;
  }

  // Get top performing wallets
  async getTopWallets(limit: number = 10): Promise<WalletPerformance[]> {
    const { data, error } = await supabase
      .from('wallet_performance')
      .select('*')
      .order('win_rate', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // Get recent coordinated trades
  async getCoordinatedTrades(hours: number = 24): Promise<any[]> {
    const { data, error } = await supabase
      .from('coordinated_trades')
      .select('*')
      .gt('trade_time', new Date(Date.now() - hours * 3600000).toISOString())
      .order('trade_time', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Calculate and store token risk metrics
  async updateTokenRiskMetrics(tokenAddress: string): Promise<TokenRiskMetrics> {
    try {
      // Get token data from DEX
      const volume24h = await this.dexService.get24HourVolume(tokenAddress);
      const price = await this.dexService.getPrice(tokenAddress);
      const liquidity = await this.dexService.getLiquidity(tokenAddress);

      // Calculate risk metrics
      const liquidityScore = this.calculateLiquidityScore(liquidity);
      const volatility = await this.calculateVolatility(tokenAddress);
      const riskLevel = this.determineRiskLevel(liquidityScore, volume24h, volatility);

      const tokenSymbol = await this.dexService.getTokenSymbol(tokenAddress);
      const metrics: TokenRiskMetrics = {
        token_address: tokenAddress,
        token_symbol: tokenSymbol,
        liquidity_score: liquidityScore,
        volume_24h: volume24h.toNumber(),
        price_volatility_24h: volatility,
        risk_level: riskLevel,
        last_updated: new Date().toISOString()
      };

      // Store metrics in database
      const { error } = await supabase
        .from('token_risk_metrics')
        .upsert(metrics);

      if (error) throw error;
      return metrics;
    } catch (error) {
      console.error('Error updating token risk metrics:', error);
      throw error;
    }
  }

  // Take portfolio snapshot
  async takePortfolioSnapshot(): Promise<PortfolioSnapshot> {
    try {
      // Get user's token holdings
      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', this.userId);

      if (error) throw error;
      if (!trades) return this.createEmptySnapshot();

      const holdings = new Map<string, Decimal>();
      let totalValue = new Decimal(0);
      let totalPnL = new Decimal(0);

      // Calculate holdings and values
      for (const trade of trades) {
        const amount = new Decimal(trade.amount);
        const currentBalance = holdings.get(trade.token_address) || new Decimal(0);
        
        if (trade.type === 'buy') {
          holdings.set(trade.token_address, currentBalance.plus(amount));
        } else {
          holdings.set(trade.token_address, currentBalance.minus(amount));
        }
      }

      // Calculate current values
      const tokenHoldings = await Promise.all(
        Array.from(holdings.entries()).map(async ([address, amount]) => {
          const price = await this.dexService.getPrice(address);
          const value = amount.mul(price);
          totalValue = totalValue.plus(value);
          const symbol = await this.dexService.getTokenSymbol(address);

          return {
            token_address: address,
            symbol,
            amount: amount.toNumber(),
            value_sol: value.toNumber()
          };
        })
      );

      // Calculate PnL
      const { data: lastSnapshot } = await supabase
        .from('portfolio_snapshots')
        .select('total_value_sol')
        .eq('user_id', this.userId)
        .order('snapshot_time', { ascending: false })
        .limit(1)
        .single();

      const pnlPercentage = lastSnapshot
        ? totalValue.sub(lastSnapshot.total_value_sol).div(lastSnapshot.total_value_sol).mul(100)
        : new Decimal(0);

      const snapshot: PortfolioSnapshot = {
        total_value_sol: totalValue.toNumber(),
        total_pnl_sol: totalValue.sub(lastSnapshot?.total_value_sol || 0).toNumber(),
        total_pnl_percentage: pnlPercentage.toNumber(),
        token_holdings: tokenHoldings
      };

      // Store snapshot
      await supabase
        .from('portfolio_snapshots')
        .insert({
          user_id: this.userId,
          snapshot_time: new Date().toISOString(),
          ...snapshot
        });

      return snapshot;
    } catch (error) {
      console.error('Error taking portfolio snapshot:', error);
      throw error;
    }
  }

  private createEmptySnapshot(): PortfolioSnapshot {
    return {
      total_value_sol: 0,
      total_pnl_sol: 0,
      total_pnl_percentage: 0,
      token_holdings: []
    };
  }

  private calculateLiquidityScore(liquidity: Decimal): number {
    const minLiquidity = new Decimal(1000);
    const maxLiquidity = new Decimal(100000);
    
    if (liquidity.lt(minLiquidity)) return 0;
    if (liquidity.gt(maxLiquidity)) return 100;
    
    return liquidity.sub(minLiquidity)
      .div(maxLiquidity.sub(minLiquidity))
      .mul(100)
      .toNumber();
  }

  private async calculateVolatility(tokenAddress: string): Promise<number> {
    const priceHistory = await this.dexService.getPriceHistory(tokenAddress, 24);
    const prices = priceHistory.map((p: Decimal) => new Decimal(p));
    
    if (prices.length < 2) return 0;
    
    const mean = prices.reduce((a: Decimal, b: Decimal) => a.plus(b), new Decimal(0))
      .div(prices.length);
    
    const variance = prices.reduce((a: Decimal, b: Decimal) => 
      a.plus(b.minus(mean).pow(2)), new Decimal(0))
      .div(prices.length - 1);
    
    return Math.sqrt(variance.toNumber());
  }

  private determineRiskLevel(
    liquidityScore: number,
    volume24h: Decimal,
    volatility: number
  ): 'low' | 'medium' | 'high' {
    let riskScore = 0;
    
    // Liquidity factor
    if (liquidityScore < 30) riskScore += 3;
    else if (liquidityScore < 70) riskScore += 2;
    else riskScore += 1;
    
    // Volume factor
    if (volume24h.lt(new Decimal(1000))) riskScore += 3;
    else if (volume24h.lt(new Decimal(10000))) riskScore += 2;
    else riskScore += 1;
    
    // Volatility factor
    if (volatility > 0.2) riskScore += 3;
    else if (volatility > 0.1) riskScore += 2;
    else riskScore += 1;
    
    return riskScore >= 7 ? 'high' : riskScore >= 5 ? 'medium' : 'low';
  }
}
