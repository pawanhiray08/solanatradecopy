-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    max_trade_size DECIMAL NOT NULL DEFAULT 0.1, -- in SOL
    stop_loss_percentage DECIMAL NOT NULL DEFAULT 5.0,
    take_profit_percentage DECIMAL NOT NULL DEFAULT 10.0,
    enabled_tokens TEXT[] DEFAULT '{}',
    min_wallet_balance DECIMAL NOT NULL DEFAULT 0.05,
    slippage_tolerance DECIMAL NOT NULL DEFAULT 1.0,
    auto_trade_enabled BOOLEAN DEFAULT false,
    testnet_mode BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create tracked wallets table
CREATE TABLE IF NOT EXISTS tracked_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL,
    label TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wallet_address)
);

-- Create user tracked wallets table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_tracked_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES tracked_wallets(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, wallet_id)
);

-- Create token risk metrics table first (needed for coordinated trades)
CREATE TABLE IF NOT EXISTS token_risk_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_address TEXT NOT NULL,
    token_symbol TEXT NOT NULL,
    liquidity_score DECIMAL DEFAULT 0,
    volume_24h DECIMAL DEFAULT 0,
    price_volatility_24h DECIMAL DEFAULT 0,
    risk_level TEXT DEFAULT 'medium',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(token_address)
);

-- Create wallet performance table before trades (needed for trigger)
CREATE TABLE IF NOT EXISTS wallet_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    total_profit_loss DECIMAL DEFAULT 0,
    win_rate DECIMAL DEFAULT 0,
    average_roi DECIMAL DEFAULT 0,
    last_trade_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wallet_address)
);

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    from_token TEXT NOT NULL,
    to_token TEXT NOT NULL,
    amount TEXT NOT NULL,
    price_at_trade DECIMAL,
    transaction_signature TEXT UNIQUE,
    status TEXT DEFAULT 'pending',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create coordinated trades table
CREATE TABLE IF NOT EXISTS coordinated_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_address TEXT NOT NULL,
    token_symbol TEXT NOT NULL,
    number_of_wallets INTEGER DEFAULT 0,
    total_volume DECIMAL DEFAULT 0,
    average_trade_size DECIMAL DEFAULT 0,
    trade_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create portfolio snapshots table
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    total_value_sol DECIMAL DEFAULT 0,
    total_pnl_sol DECIMAL DEFAULT 0,
    total_pnl_percentage DECIMAL DEFAULT 0,
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create portfolio holdings table
CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id UUID REFERENCES portfolio_snapshots(id) ON DELETE CASCADE,
    token_address TEXT NOT NULL,
    token_symbol TEXT NOT NULL,
    amount DECIMAL DEFAULT 0,
    value_sol DECIMAL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create function to update wallet performance
CREATE OR REPLACE FUNCTION update_wallet_performance()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update performance record
    INSERT INTO wallet_performance (wallet_address, total_trades, winning_trades, last_trade_at)
    VALUES (
        NEW.wallet_address,
        1,
        CASE WHEN NEW.status = 'completed' AND COALESCE(NEW.price_at_trade, 0) > 0 THEN 1 ELSE 0 END,
        NEW.timestamp
    )
    ON CONFLICT (wallet_address) 
    DO UPDATE SET
        total_trades = wallet_performance.total_trades + 1,
        winning_trades = CASE 
            WHEN NEW.status = 'completed' AND COALESCE(NEW.price_at_trade, 0) > 0 
            THEN wallet_performance.winning_trades + 1
            ELSE wallet_performance.winning_trades
        END,
        last_trade_at = NEW.timestamp,
        updated_at = CURRENT_TIMESTAMP;
    
    -- Update win rate
    UPDATE wallet_performance
    SET win_rate = (winning_trades::DECIMAL / total_trades::DECIMAL) * 100
    WHERE wallet_address = NEW.wallet_address
    AND total_trades > 0;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for wallet performance updates
CREATE TRIGGER trigger_update_wallet_performance
AFTER INSERT ON trades
FOR EACH ROW
EXECUTE FUNCTION update_wallet_performance();

-- Create function to detect coordinated trades
CREATE OR REPLACE FUNCTION detect_coordinated_trades()
RETURNS TRIGGER AS $$
DECLARE
    trade_window INTERVAL := INTERVAL '5 minutes';
    min_wallets INTEGER := 3;
BEGIN
    -- Look for similar trades within the time window
    INSERT INTO coordinated_trades (
        token_address,
        token_symbol,
        number_of_wallets,
        total_volume,
        average_trade_size,
        trade_time
    )
    SELECT 
        NEW.from_token as token_address,
        (SELECT token_symbol FROM token_risk_metrics WHERE token_address = NEW.from_token) as token_symbol,
        COUNT(DISTINCT wallet_address) as number_of_wallets,
        SUM(amount::DECIMAL) as total_volume,
        AVG(amount::DECIMAL) as average_trade_size,
        NEW.timestamp as trade_time
    FROM trades
    WHERE (from_token = NEW.from_token OR to_token = NEW.from_token)
    AND timestamp BETWEEN NEW.timestamp - trade_window AND NEW.timestamp
    GROUP BY from_token
    HAVING COUNT(DISTINCT wallet_address) >= min_wallets;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for coordinated trades detection
CREATE TRIGGER trigger_detect_coordinated_trades
AFTER INSERT ON trades
FOR EACH ROW
EXECUTE FUNCTION detect_coordinated_trades();

-- Create indexes for better query performance
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_wallet_address ON trades(wallet_address);
CREATE INDEX idx_trades_timestamp ON trades(timestamp);
CREATE INDEX idx_wallet_performance_win_rate ON wallet_performance(win_rate DESC);
CREATE INDEX idx_token_risk_metrics_risk_level ON token_risk_metrics(risk_level);
CREATE INDEX idx_coordinated_trades_trade_time ON coordinated_trades(trade_time);
CREATE INDEX idx_portfolio_snapshots_user_id_time ON portfolio_snapshots(user_id, snapshot_time);

-- Create RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own data"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
    ON users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can view their own settings"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON user_settings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own trades"
    ON trades FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own portfolio snapshots"
    ON portfolio_snapshots FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own portfolio holdings"
    ON portfolio_holdings FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM portfolio_snapshots ps
        WHERE ps.id = portfolio_holdings.snapshot_id
        AND ps.user_id = auth.uid()
    ));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers for all tables
DO $$ 
BEGIN
    CREATE TRIGGER set_timestamp
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER set_timestamp
        BEFORE UPDATE ON user_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER set_timestamp
        BEFORE UPDATE ON tracked_wallets
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER set_timestamp
        BEFORE UPDATE ON trades
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER set_timestamp
        BEFORE UPDATE ON wallet_performance
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER set_timestamp
        BEFORE UPDATE ON token_risk_metrics
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
END $$;
