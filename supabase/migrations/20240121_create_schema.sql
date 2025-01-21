-- Set search path
SET search_path TO public;

-- Create UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
    DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
    DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
    DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
    DROP POLICY IF EXISTS "Users can view their own trades" ON public.trades;
    DROP POLICY IF EXISTS "Users can view their own portfolio snapshots" ON public.portfolio_snapshots;
    DROP POLICY IF EXISTS "Users can view their own portfolio holdings" ON public.portfolio_holdings;
EXCEPTION WHEN undefined_object THEN
    NULL;
END $$;

-- Drop existing tables
DROP TABLE IF EXISTS public.portfolio_holdings CASCADE;
DROP TABLE IF EXISTS public.portfolio_snapshots CASCADE;
DROP TABLE IF EXISTS public.coordinated_trades CASCADE;
DROP TABLE IF EXISTS public.wallet_performance CASCADE;
DROP TABLE IF EXISTS public.trades CASCADE;
DROP TABLE IF EXISTS public.token_risk_metrics CASCADE;
DROP TABLE IF EXISTS public.user_tracked_wallets CASCADE;
DROP TABLE IF EXISTS public.tracked_wallets CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Create tables first
-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id BIGINT PRIMARY KEY DEFAULT abs(hashtext(gen_random_uuid()::text))::BIGINT,
    wallet_address TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
    id BIGINT PRIMARY KEY DEFAULT abs(hashtext(gen_random_uuid()::text))::BIGINT,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    max_trade_size DECIMAL NOT NULL DEFAULT 0.1,
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
CREATE TABLE IF NOT EXISTS public.tracked_wallets (
    id BIGINT PRIMARY KEY DEFAULT abs(hashtext(gen_random_uuid()::text))::BIGINT,
    wallet_address TEXT NOT NULL,
    label TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wallet_address)
);

-- Create user tracked wallets table
CREATE TABLE IF NOT EXISTS public.user_tracked_wallets (
    id BIGINT PRIMARY KEY DEFAULT abs(hashtext(gen_random_uuid()::text))::BIGINT,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    wallet_id BIGINT REFERENCES public.tracked_wallets(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, wallet_id)
);

-- Create token risk metrics table
CREATE TABLE IF NOT EXISTS public.token_risk_metrics (
    id BIGINT PRIMARY KEY DEFAULT abs(hashtext(gen_random_uuid()::text))::BIGINT,
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

-- Create trades table
CREATE TABLE IF NOT EXISTS public.trades (
    id BIGINT PRIMARY KEY DEFAULT abs(hashtext(gen_random_uuid()::text))::BIGINT,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
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

-- Create wallet performance table
CREATE TABLE IF NOT EXISTS public.wallet_performance (
    id BIGINT PRIMARY KEY DEFAULT abs(hashtext(gen_random_uuid()::text))::BIGINT,
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

-- Create coordinated trades table
CREATE TABLE IF NOT EXISTS public.coordinated_trades (
    id BIGINT PRIMARY KEY DEFAULT abs(hashtext(gen_random_uuid()::text))::BIGINT,
    token_address TEXT NOT NULL,
    token_symbol TEXT NOT NULL,
    number_of_wallets INTEGER DEFAULT 0,
    total_volume DECIMAL DEFAULT 0,
    average_trade_size DECIMAL DEFAULT 0,
    trade_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create portfolio snapshots table
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
    id BIGINT PRIMARY KEY DEFAULT abs(hashtext(gen_random_uuid()::text))::BIGINT,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    total_value_sol DECIMAL DEFAULT 0,
    total_pnl_sol DECIMAL DEFAULT 0,
    total_pnl_percentage DECIMAL DEFAULT 0,
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create portfolio holdings table
CREATE TABLE IF NOT EXISTS public.portfolio_holdings (
    id BIGINT PRIMARY KEY DEFAULT abs(hashtext(gen_random_uuid()::text))::BIGINT,
    snapshot_id BIGINT REFERENCES public.portfolio_snapshots(id) ON DELETE CASCADE,
    token_address TEXT NOT NULL,
    token_symbol TEXT NOT NULL,
    amount DECIMAL DEFAULT 0,
    value_sol DECIMAL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_wallet_address ON public.trades(wallet_address);
CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON public.trades(timestamp);
CREATE INDEX IF NOT EXISTS idx_wallet_performance_win_rate ON public.wallet_performance(win_rate DESC);
CREATE INDEX IF NOT EXISTS idx_token_risk_metrics_risk_level ON public.token_risk_metrics(risk_level);
CREATE INDEX IF NOT EXISTS idx_coordinated_trades_trade_time ON public.coordinated_trades(trade_time);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_id_time ON public.portfolio_snapshots(user_id, snapshot_time);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update wallet performance
CREATE OR REPLACE FUNCTION public.update_wallet_performance()
RETURNS TRIGGER AS $$
DECLARE
    v_wallet_address TEXT;
    v_status TEXT;
    v_price_at_trade DECIMAL;
    v_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get values from NEW record
    v_wallet_address := NEW.wallet_address;
    v_status := NEW.status;
    v_price_at_trade := NEW.price_at_trade;
    v_timestamp := NEW.timestamp;

    -- Insert or update performance record
    INSERT INTO public.wallet_performance (
        id,
        wallet_address,
        total_trades,
        winning_trades,
        last_trade_at,
        created_at,
        updated_at
    )
    VALUES (
        abs(hashtext(gen_random_uuid()::text))::BIGINT,
        v_wallet_address,
        1,
        CASE WHEN v_status = 'completed' AND COALESCE(v_price_at_trade, 0) > 0 THEN 1 ELSE 0 END,
        v_timestamp,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (wallet_address) 
    DO UPDATE SET
        total_trades = wallet_performance.total_trades + 1,
        winning_trades = CASE 
            WHEN v_status = 'completed' AND COALESCE(v_price_at_trade, 0) > 0 
            THEN wallet_performance.winning_trades + 1
            ELSE wallet_performance.winning_trades
        END,
        last_trade_at = v_timestamp,
        updated_at = CURRENT_TIMESTAMP;
    
    -- Update win rate
    UPDATE public.wallet_performance
    SET win_rate = (winning_trades::DECIMAL / NULLIF(total_trades, 0)::DECIMAL) * 100
    WHERE wallet_address = v_wallet_address
    AND total_trades > 0;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to detect coordinated trades
CREATE OR REPLACE FUNCTION public.detect_coordinated_trades()
RETURNS TRIGGER AS $$
DECLARE
    trade_window INTERVAL := INTERVAL '5 minutes';
    min_wallets INTEGER := 3;
    v_from_token TEXT;
    v_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get values from NEW record
    v_from_token := NEW.from_token;
    v_timestamp := NEW.timestamp;

    -- Look for similar trades within the time window
    INSERT INTO public.coordinated_trades (
        id,
        token_address,
        token_symbol,
        number_of_wallets,
        total_volume,
        average_trade_size,
        trade_time,
        created_at
    )
    SELECT 
        abs(hashtext(gen_random_uuid()::text))::BIGINT,
        v_from_token as token_address,
        (SELECT token_symbol FROM public.token_risk_metrics WHERE token_address = v_from_token) as token_symbol,
        COUNT(DISTINCT t.wallet_address) as number_of_wallets,
        SUM(t.amount::DECIMAL) as total_volume,
        AVG(t.amount::DECIMAL) as average_trade_size,
        v_timestamp as trade_time,
        CURRENT_TIMESTAMP as created_at
    FROM public.trades t
    WHERE (t.from_token = v_from_token OR t.to_token = v_from_token)
    AND t.timestamp BETWEEN v_timestamp - trade_window AND v_timestamp
    GROUP BY v_from_token
    HAVING COUNT(DISTINCT t.wallet_address) >= min_wallets;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DO $$ 
BEGIN
    -- Create update timestamp triggers
    CREATE TRIGGER set_timestamp
        BEFORE UPDATE ON public.users
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();

    CREATE TRIGGER set_timestamp
        BEFORE UPDATE ON public.user_settings
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();

    CREATE TRIGGER set_timestamp
        BEFORE UPDATE ON public.tracked_wallets
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();

    CREATE TRIGGER set_timestamp
        BEFORE UPDATE ON public.trades
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();

    CREATE TRIGGER set_timestamp
        BEFORE UPDATE ON public.wallet_performance
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();

    CREATE TRIGGER set_timestamp
        BEFORE UPDATE ON public.token_risk_metrics
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();

    -- Create trade-specific triggers
    CREATE TRIGGER trigger_update_wallet_performance
        AFTER INSERT ON public.trades
        FOR EACH ROW
        EXECUTE FUNCTION public.update_wallet_performance();

    CREATE TRIGGER trigger_detect_coordinated_trades
        AFTER INSERT ON public.trades
        FOR EACH ROW
        EXECUTE FUNCTION public.detect_coordinated_trades();
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_holdings ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
    CREATE POLICY "Users can view their own data"
        ON public.users FOR SELECT
        USING (abs(hashtext(auth.uid()::text))::BIGINT = id);

    CREATE POLICY "Users can update their own data"
        ON public.users FOR UPDATE
        USING (abs(hashtext(auth.uid()::text))::BIGINT = id);

    CREATE POLICY "Users can view their own settings"
        ON public.user_settings FOR SELECT
        USING (abs(hashtext(auth.uid()::text))::BIGINT = user_id);

    CREATE POLICY "Users can update their own settings"
        ON public.user_settings FOR UPDATE
        USING (abs(hashtext(auth.uid()::text))::BIGINT = user_id);

    CREATE POLICY "Users can view their own trades"
        ON public.trades FOR SELECT
        USING (abs(hashtext(auth.uid()::text))::BIGINT = user_id);

    CREATE POLICY "Users can view their own portfolio snapshots"
        ON public.portfolio_snapshots FOR SELECT
        USING (abs(hashtext(auth.uid()::text))::BIGINT = user_id);

    CREATE POLICY "Users can view their own portfolio holdings"
        ON public.portfolio_holdings FOR SELECT
        USING (EXISTS (
            SELECT 1 FROM public.portfolio_snapshots ps
            WHERE ps.id = portfolio_holdings.snapshot_id
            AND abs(hashtext(auth.uid()::text))::BIGINT = ps.user_id
        ));
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;
