-- Enhanced trading features migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create traders table
CREATE TABLE IF NOT EXISTS traders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL UNIQUE,
    name TEXT,
    description TEXT,
    performance_score DECIMAL DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    successful_trades INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create trader_follows table
CREATE TABLE IF NOT EXISTS trader_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_address TEXT NOT NULL,
    trader_address TEXT NOT NULL REFERENCES traders(wallet_address),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(follower_address, trader_address)
);

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trader_address TEXT NOT NULL REFERENCES traders(wallet_address),
    token_address TEXT NOT NULL,
    token_symbol TEXT,
    amount DECIMAL NOT NULL,
    price DECIMAL NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    transaction_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create positions table
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trader_address TEXT NOT NULL REFERENCES traders(wallet_address),
    token_address TEXT NOT NULL,
    token_symbol TEXT,
    amount DECIMAL NOT NULL DEFAULT 0,
    average_entry_price DECIMAL,
    current_price DECIMAL,
    pnl DECIMAL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(trader_address, token_address)
);

-- Create insider_wallets table
CREATE TABLE IF NOT EXISTS insider_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL UNIQUE,
    label TEXT,
    win_rate DECIMAL DEFAULT 0,
    total_profit_loss DECIMAL DEFAULT 0,
    current_balance DECIMAL DEFAULT 0,
    rank INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_traders_wallet ON traders(wallet_address);
CREATE INDEX IF NOT EXISTS idx_trades_trader ON trades(trader_address);
CREATE INDEX IF NOT EXISTS idx_trades_token ON trades(token_address);
CREATE INDEX IF NOT EXISTS idx_positions_trader ON positions(trader_address);
CREATE INDEX IF NOT EXISTS idx_positions_token ON positions(token_address);
CREATE INDEX IF NOT EXISTS idx_trader_follows_follower ON trader_follows(follower_address);
CREATE INDEX IF NOT EXISTS idx_trader_follows_trader ON trader_follows(trader_address);
CREATE INDEX IF NOT EXISTS idx_insider_wallets_address ON insider_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_insider_wallets_rank ON insider_wallets(rank);

-- Add triggers for updated_at columns
CREATE TRIGGER set_traders_timestamp
    BEFORE UPDATE ON traders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_trader_follows_timestamp
    BEFORE UPDATE ON trader_follows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_trades_timestamp
    BEFORE UPDATE ON trades
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_positions_timestamp
    BEFORE UPDATE ON positions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_insider_wallets_timestamp
    BEFORE UPDATE ON insider_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wallet_trades ON dex_trades(wallet_address);
CREATE INDEX IF NOT EXISTS idx_trade_timestamp ON dex_trades(created_at);
CREATE INDEX IF NOT EXISTS idx_coordinated_trades_token ON coordinated_trades(token_address);
CREATE INDEX IF NOT EXISTS idx_wallet_settings ON trade_settings(wallet_address);

-- Create table for trade settings and risk management
CREATE TABLE IF NOT EXISTS trade_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT REFERENCES insider_wallets(wallet_address),
    max_trade_cap DECIMAL NOT NULL DEFAULT 1,
    stop_loss_percentage DECIMAL DEFAULT 5,
    take_profit_percentage DECIMAL DEFAULT 10,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create table for DEX trades
CREATE TABLE IF NOT EXISTS dex_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT REFERENCES insider_wallets(wallet_address),
    token_address TEXT NOT NULL,
    token_symbol TEXT,
    amount DECIMAL NOT NULL,
    price DECIMAL NOT NULL,
    dex_platform TEXT NOT NULL,
    trade_type TEXT NOT NULL,
    transaction_signature TEXT UNIQUE NOT NULL,
    profit_loss DECIMAL,
    success BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create table for coordinated trades
CREATE TABLE IF NOT EXISTS coordinated_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_address TEXT NOT NULL,
    token_symbol TEXT,
    number_of_wallets INTEGER DEFAULT 1,
    total_volume DECIMAL DEFAULT 0,
    average_price DECIMAL,
    dex_platform TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create table for trade alerts
CREATE TABLE IF NOT EXISTS trade_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    wallet_address TEXT REFERENCES insider_wallets(wallet_address),
    message TEXT NOT NULL,
    importance TEXT DEFAULT 'medium',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add policies
ALTER TABLE trade_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dex_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordinated_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON trade_settings FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON dex_trades FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON coordinated_trades FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON trade_alerts FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON trade_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON dex_trades FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON coordinated_trades FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON trade_alerts FOR INSERT WITH CHECK (true);

-- Add trigger to automatically update updated_at
CREATE TRIGGER update_coordinated_trades_updated_at
    BEFORE UPDATE ON coordinated_trades
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Rename address column if it exists (for existing tables)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'insider_wallets' 
        AND column_name = 'address'
    ) THEN
        ALTER TABLE insider_wallets RENAME COLUMN address TO wallet_address;
    END IF;
END $$;

-- Update insider_wallets table with additional tracking metrics
ALTER TABLE insider_wallets
ADD COLUMN IF NOT EXISTS avg_trade_size DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS favorite_dex VARCHAR;
