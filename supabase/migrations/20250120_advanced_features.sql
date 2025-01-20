-- Create positions table
CREATE TABLE positions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    token_address TEXT NOT NULL,
    token_symbol TEXT NOT NULL,
    entry_price DECIMAL NOT NULL,
    amount DECIMAL NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create advanced settings table
CREATE TABLE advanced_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address TEXT NOT NULL UNIQUE,
    wallet_percentage INTEGER NOT NULL,
    max_slippage DECIMAL NOT NULL,
    min_liquidity DECIMAL NOT NULL,
    max_trades_per_day INTEGER NOT NULL,
    min_market_cap DECIMAL NOT NULL,
    auto_compound BOOLEAN NOT NULL DEFAULT false,
    trailing_stop_loss DECIMAL NOT NULL,
    risk_level TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create price history table
CREATE TABLE price_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    token_address TEXT NOT NULL,
    price DECIMAL NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX idx_positions_wallet ON positions(wallet_address);
CREATE INDEX idx_positions_token ON positions(token_address);
CREATE INDEX idx_price_history_token_time ON price_history(token_address, timestamp);

-- Add RLS policies
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE advanced_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Positions policies
CREATE POLICY "Users can view their own positions"
    ON positions FOR SELECT
    USING (wallet_address = auth.uid());

CREATE POLICY "Users can insert their own positions"
    ON positions FOR INSERT
    WITH CHECK (wallet_address = auth.uid());

CREATE POLICY "Users can update their own positions"
    ON positions FOR UPDATE
    USING (wallet_address = auth.uid());

-- Advanced settings policies
CREATE POLICY "Users can view their own settings"
    ON advanced_settings FOR SELECT
    USING (wallet_address = auth.uid());

CREATE POLICY "Users can insert their own settings"
    ON advanced_settings FOR INSERT
    WITH CHECK (wallet_address = auth.uid());

CREATE POLICY "Users can update their own settings"
    ON advanced_settings FOR UPDATE
    USING (wallet_address = auth.uid());

-- Price history is public read-only
CREATE POLICY "Price history is public"
    ON price_history FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Only authenticated users can insert price history"
    ON price_history FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Enable realtime subscriptions for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE positions;
ALTER PUBLICATION supabase_realtime ADD TABLE advanced_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE price_history;
