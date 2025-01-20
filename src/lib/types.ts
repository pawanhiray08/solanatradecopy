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

export type Database = {
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
    };
  };
};
