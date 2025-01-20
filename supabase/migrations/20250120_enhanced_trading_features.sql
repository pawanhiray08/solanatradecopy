-- Enhanced trading features migration

-- Update insider_wallets table with additional tracking metrics
ALTER TABLE insider_wallets
ADD COLUMN IF NOT EXISTS win_rate DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_profit_loss DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_trade_size DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS favorite_dex VARCHAR,
ADD COLUMN IF NOT EXISTS rank INTEGER DEFAULT 0;

-- Create table for trade settings and risk management
CREATE TABLE IF NOT EXISTS trade_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT REFERENCES insider_wallets(address),
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
    wallet_address TEXT REFERENCES insider_wallets(address),
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
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create table for trade alerts
CREATE TABLE IF NOT EXISTS trade_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    wallet_address TEXT REFERENCES insider_wallets(address),
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wallet_trades ON dex_trades(wallet_address);
CREATE INDEX IF NOT EXISTS idx_trade_timestamp ON dex_trades(created_at);
CREATE INDEX IF NOT EXISTS idx_coordinated_trades_token ON coordinated_trades(token_address);
CREATE INDEX IF NOT EXISTS idx_wallet_settings ON trade_settings(wallet_address);
