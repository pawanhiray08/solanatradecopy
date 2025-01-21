-- Create table for wallet performance metrics
CREATE TABLE wallet_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL,
    total_trades INTEGER NOT NULL DEFAULT 0,
    winning_trades INTEGER NOT NULL DEFAULT 0,
    total_profit_loss DECIMAL NOT NULL DEFAULT 0,
    win_rate DECIMAL GENERATED ALWAYS AS (
        CASE 
            WHEN total_trades > 0 THEN (winning_trades::DECIMAL / total_trades::DECIMAL) * 100 
            ELSE 0 
        END
    ) STORED,
    average_roi DECIMAL NOT NULL DEFAULT 0,
    last_trade_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for token risk metrics
CREATE TABLE token_risk_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_address TEXT NOT NULL,
    token_symbol TEXT,
    liquidity_score DECIMAL NOT NULL DEFAULT 0, -- 0-100 scale
    volume_24h DECIMAL NOT NULL DEFAULT 0,
    price_volatility_24h DECIMAL NOT NULL DEFAULT 0,
    risk_level TEXT NOT NULL DEFAULT 'medium',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for coordinated trades detection
CREATE TABLE coordinated_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_address TEXT NOT NULL,
    token_symbol TEXT,
    trade_time TIMESTAMP WITH TIME ZONE NOT NULL,
    number_of_wallets INTEGER NOT NULL,
    wallet_addresses TEXT[] NOT NULL,
    trade_type TEXT NOT NULL, -- 'buy' or 'sell'
    price_impact DECIMAL,
    total_volume DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for user portfolio snapshots
CREATE TABLE portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    snapshot_time TIMESTAMP WITH TIME ZONE NOT NULL,
    total_value_sol DECIMAL NOT NULL,
    total_pnl_sol DECIMAL NOT NULL,
    total_pnl_percentage DECIMAL NOT NULL,
    token_holdings JSONB NOT NULL, -- Array of {token_address, amount, value_sol}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_wallet_performance_address ON wallet_performance(wallet_address);
CREATE INDEX idx_token_risk_address ON token_risk_metrics(token_address);
CREATE INDEX idx_coordinated_trades_token ON coordinated_trades(token_address, trade_time);
CREATE INDEX idx_portfolio_snapshots_user_time ON portfolio_snapshots(user_id, snapshot_time);

-- Create function to update wallet performance
CREATE OR REPLACE FUNCTION update_wallet_performance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO wallet_performance (wallet_address, total_trades, winning_trades, total_profit_loss, last_trade_at)
    VALUES (
        NEW.wallet_address,
        1,
        CASE WHEN NEW.profit_loss > 0 THEN 1 ELSE 0 END,
        NEW.profit_loss,
        NEW.created_at
    )
    ON CONFLICT (wallet_address) DO UPDATE SET
        total_trades = wallet_performance.total_trades + 1,
        winning_trades = wallet_performance.winning_trades + CASE WHEN NEW.profit_loss > 0 THEN 1 ELSE 0 END,
        total_profit_loss = wallet_performance.total_profit_loss + NEW.profit_loss,
        last_trade_at = NEW.created_at,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating wallet performance
CREATE TRIGGER update_wallet_performance_trigger
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_performance();

-- Function to detect coordinated trades
CREATE OR REPLACE FUNCTION detect_coordinated_trades()
RETURNS TRIGGER AS $$
DECLARE
    time_window INTERVAL = '5 minutes';
    min_wallets INT = 2;
    related_trades RECORD;
BEGIN
    -- Find related trades within the time window
    SELECT 
        COUNT(DISTINCT wallet_address) as wallet_count,
        ARRAY_AGG(DISTINCT wallet_address) as wallets,
        SUM(amount::DECIMAL) as total_amount
    INTO related_trades
    FROM transactions
    WHERE 
        token_address = NEW.token_address
        AND type = NEW.type
        AND created_at BETWEEN NEW.created_at - time_window AND NEW.created_at + time_window;

    -- If we found coordinated trading activity
    IF related_trades.wallet_count >= min_wallets THEN
        INSERT INTO coordinated_trades (
            token_address,
            token_symbol,
            trade_time,
            number_of_wallets,
            wallet_addresses,
            trade_type,
            total_volume
        ) VALUES (
            NEW.token_address,
            NEW.token_symbol,
            NEW.created_at,
            related_trades.wallet_count,
            related_trades.wallets,
            NEW.type,
            related_trades.total_amount
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for detecting coordinated trades
CREATE TRIGGER detect_coordinated_trades_trigger
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION detect_coordinated_trades();
