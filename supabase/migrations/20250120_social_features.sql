-- Create portfolio history table
CREATE TABLE portfolio_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    total_value DECIMAL NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create traders table
CREATE TABLE traders (
    wallet_address TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    total_followers INTEGER DEFAULT 0,
    win_rate DECIMAL DEFAULT 0,
    monthly_roi DECIMAL DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create trader follows table
CREATE TABLE trader_follows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    follower TEXT NOT NULL,
    followed_trader TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(follower, followed_trader),
    FOREIGN KEY (followed_trader) REFERENCES traders(wallet_address)
);

-- Create trades table
CREATE TABLE trades (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trader TEXT NOT NULL,
    token_address TEXT NOT NULL,
    token_symbol TEXT NOT NULL,
    type TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    price DECIMAL NOT NULL,
    pnl_percentage DECIMAL,
    timestamp TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (trader) REFERENCES traders(wallet_address)
);

-- Create trader statistics table
CREATE TABLE trader_statistics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trader TEXT NOT NULL,
    period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    total_volume DECIMAL DEFAULT 0,
    profit_loss DECIMAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(trader, period, start_date),
    FOREIGN KEY (trader) REFERENCES traders(wallet_address)
);

-- Add indexes
CREATE INDEX idx_portfolio_history_wallet ON portfolio_history(wallet_address);
CREATE INDEX idx_trader_follows_follower ON trader_follows(follower);
CREATE INDEX idx_trader_follows_followed ON trader_follows(followed_trader);
CREATE INDEX idx_trades_trader ON trades(trader);
CREATE INDEX idx_trades_timestamp ON trades(timestamp);
CREATE INDEX idx_trader_statistics_trader ON trader_statistics(trader);
CREATE INDEX idx_trader_statistics_period ON trader_statistics(period, start_date);

-- Add RLS policies
ALTER TABLE portfolio_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE traders ENABLE ROW LEVEL SECURITY;
ALTER TABLE trader_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trader_statistics ENABLE ROW LEVEL SECURITY;

-- Portfolio history policies
CREATE POLICY "Users can view their own portfolio history"
    ON portfolio_history FOR SELECT
    USING (wallet_address = auth.uid());

CREATE POLICY "Users can insert their own portfolio history"
    ON portfolio_history FOR INSERT
    WITH CHECK (wallet_address = auth.uid());

-- Traders policies
CREATE POLICY "Traders are publicly viewable"
    ON traders FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Users can update their own trader profile"
    ON traders FOR UPDATE
    USING (wallet_address = auth.uid());

CREATE POLICY "Users can insert their trader profile"
    ON traders FOR INSERT
    WITH CHECK (wallet_address = auth.uid());

-- Trader follows policies
CREATE POLICY "Users can view their follows"
    ON trader_follows FOR SELECT
    USING (follower = auth.uid());

CREATE POLICY "Users can manage their follows"
    ON trader_follows FOR ALL
    USING (follower = auth.uid());

-- Trades policies
CREATE POLICY "Trades are publicly viewable"
    ON trades FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Users can insert their own trades"
    ON trades FOR INSERT
    WITH CHECK (trader = auth.uid());

-- Trader statistics policies
CREATE POLICY "Statistics are publicly viewable"
    ON trader_statistics FOR SELECT
    TO public
    USING (true);

-- Functions to update statistics
CREATE OR REPLACE FUNCTION update_trader_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update daily statistics
    INSERT INTO trader_statistics (
        trader,
        period,
        start_date,
        end_date,
        total_trades,
        winning_trades,
        total_volume,
        profit_loss
    )
    SELECT
        NEW.trader,
        'daily',
        DATE_TRUNC('day', NEW.timestamp),
        DATE_TRUNC('day', NEW.timestamp) + INTERVAL '1 day',
        COUNT(*),
        COUNT(*) FILTER (WHERE pnl_percentage > 0),
        SUM(amount * price),
        SUM(amount * price * pnl_percentage / 100)
    FROM trades
    WHERE trader = NEW.trader
    AND timestamp >= DATE_TRUNC('day', NEW.timestamp)
    AND timestamp < DATE_TRUNC('day', NEW.timestamp) + INTERVAL '1 day'
    GROUP BY trader
    ON CONFLICT (trader, period, start_date)
    DO UPDATE SET
        total_trades = EXCLUDED.total_trades,
        winning_trades = EXCLUDED.winning_trades,
        total_volume = EXCLUDED.total_volume,
        profit_loss = EXCLUDED.profit_loss,
        updated_at = now();

    -- Update monthly ROI and win rate in traders table
    UPDATE traders
    SET
        monthly_roi = (
            SELECT COALESCE(SUM(profit_loss) / NULLIF(SUM(total_volume), 0) * 100, 0)
            FROM trader_statistics
            WHERE trader = NEW.trader
            AND period = 'daily'
            AND start_date >= DATE_TRUNC('month', NEW.timestamp)
        ),
        win_rate = (
            SELECT COALESCE(SUM(winning_trades)::DECIMAL / NULLIF(SUM(total_trades), 0) * 100, 0)
            FROM trader_statistics
            WHERE trader = NEW.trader
            AND period = 'daily'
            AND start_date >= DATE_TRUNC('month', NEW.timestamp)
        ),
        total_trades = (
            SELECT COUNT(*)
            FROM trades
            WHERE trader = NEW.trader
        ),
        updated_at = now()
    WHERE wallet_address = NEW.trader;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_statistics_after_trade
    AFTER INSERT ON trades
    FOR EACH ROW
    EXECUTE FUNCTION update_trader_statistics();

-- Function to update follower count
CREATE OR REPLACE FUNCTION update_follower_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE traders
        SET total_followers = total_followers + 1
        WHERE wallet_address = NEW.followed_trader;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE traders
        SET total_followers = total_followers - 1
        WHERE wallet_address = OLD.followed_trader;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_followers_after_follow
    AFTER INSERT OR DELETE ON trader_follows
    FOR EACH ROW
    EXECUTE FUNCTION update_follower_count();

-- Enable realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE portfolio_history;
ALTER PUBLICATION supabase_realtime ADD TABLE traders;
ALTER PUBLICATION supabase_realtime ADD TABLE trader_follows;
ALTER PUBLICATION supabase_realtime ADD TABLE trades;
ALTER PUBLICATION supabase_realtime ADD TABLE trader_statistics;
