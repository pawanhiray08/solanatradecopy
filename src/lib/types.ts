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

export type UserSettings = {
  id: string;
  user_id: string;
  max_trade_size: number;
  stop_loss_percentage: number;
  take_profit_percentage: number;
  created_at: string;
  updated_at: string;
};

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
