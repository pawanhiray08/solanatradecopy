export type Trade = {
  id: string;
  user_id: string;
  token_address: string;
  amount: number;
  price: number;
  type: 'buy' | 'sell';
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
};

export type Wallet = {
  id: string;
  address: string;
  label: string | null;
  created_at: string;
  updated_at: string;
};

export type TradeSettings = {
  maxTradeSize: number;
  minTradeSize: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  autoTradingEnabled: boolean;
  slippageTolerance: number;
  minWalletBalance: number;
};

export type UserSettings = {
  id: string;
  user_id: string;
  trade_settings: TradeSettings;
  enabled_tokens: string[];  // Array of token addresses that are enabled for trading
  testnet_mode: boolean;  // Whether to use testnet for trades
  created_at: string;
  updated_at: string;
};

export function convertUserSettingsToTradeSettings(settings: UserSettings): TradeSettings {
  return {
    ...settings.trade_settings,
    minTradeSize: settings.trade_settings.maxTradeSize * 0.01,
  };
}

export type InsiderWallet = {
  id: string;
  address: string;
  label: string;
  success_rate: number;
  total_trades: number;
  successful_trades: number;
  last_trade_at: string | null;
  created_at: string;
  updated_at: string;
  balance: number;
};

export type Transaction = {
  id: string;
  wallet_address: string;
  signature: string;
  token_address: string;
  token_symbol: string | null;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  profit_loss: number | null;
  timestamp: string;
  created_at: string;
  success: boolean;
};

export type TradeReplicationConfig = {
  maxTradeSize: number;  // Maximum size of a single trade in SOL
  stopLossPercentage: number;  // Stop loss percentage
  takeProfitPercentage: number;  // Take profit percentage
  slippageTolerance: number;  // Maximum allowed slippage
  enabledTokens: Set<string>;  // Set of token addresses enabled for trading
};

export type TokenConfig = {
  address: string;
  symbol: string;
  decimals: number;
  enabled: boolean;
  maxTradeSize?: number;  // Optional override for specific token
  stopLoss?: number;  // Optional override for specific token
  takeProfit?: number;  // Optional override for specific token
};

export type TradeInstruction = {
  type: 'buy' | 'sell';
  tokenAddress: string;
  amount: number;
  price: number;
  walletAddress: string;  // Source wallet that executed the trade
  signature: string;  // Original transaction signature
  timestamp: number;
};

export interface Database {
  public: {
    Tables: {
      trades: {
        Row: Trade;
        Insert: Omit<Trade, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Trade, 'id'>>;
      };
      wallets: {
        Row: Wallet;
        Insert: Omit<Wallet, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Wallet, 'id'>>;
      };
      user_settings: {
        Row: UserSettings;
        Insert: Omit<UserSettings, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserSettings, 'id'>>;
      };
      insider_wallets: {
        Row: InsiderWallet;
        Insert: Omit<InsiderWallet, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<InsiderWallet, 'id'>>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at'>;
        Update: Partial<Omit<Transaction, 'id'>>;
      };
    };
  };
}
