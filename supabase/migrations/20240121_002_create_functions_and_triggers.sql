-- Set search path to public schema
SET search_path TO public;

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
BEGIN
    -- Insert or update performance record
    INSERT INTO public.wallet_performance (
        wallet_address,
        total_trades,
        winning_trades,
        last_trade_at,
        created_at,
        updated_at
    )
    VALUES (
        NEW.wallet_address,
        1,
        CASE WHEN NEW.status = 'completed' AND COALESCE(NEW.price_at_trade, 0) > 0 THEN 1 ELSE 0 END,
        NEW.timestamp,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
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
    UPDATE public.wallet_performance
    SET win_rate = (winning_trades::DECIMAL / NULLIF(total_trades, 0)::DECIMAL) * 100
    WHERE wallet_address = NEW.wallet_address
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
BEGIN
    -- Look for similar trades within the time window
    INSERT INTO public.coordinated_trades (
        token_address,
        token_symbol,
        number_of_wallets,
        total_volume,
        average_trade_size,
        trade_time,
        created_at
    )
    SELECT 
        NEW.from_token as token_address,
        (SELECT token_symbol FROM public.token_risk_metrics WHERE token_address = NEW.from_token) as token_symbol,
        COUNT(DISTINCT t.wallet_address) as number_of_wallets,
        SUM(t.amount::DECIMAL) as total_volume,
        AVG(t.amount::DECIMAL) as average_trade_size,
        NEW.timestamp as trade_time,
        CURRENT_TIMESTAMP as created_at
    FROM public.trades t
    WHERE (t.from_token = NEW.from_token OR t.to_token = NEW.from_token)
    AND t.timestamp BETWEEN NEW.timestamp - trade_window AND NEW.timestamp
    GROUP BY NEW.from_token
    HAVING COUNT(DISTINCT t.wallet_address) >= min_wallets;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DO $$ 
BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS trigger_update_wallet_performance ON public.trades;
    DROP TRIGGER IF EXISTS trigger_detect_coordinated_trades ON public.trades;
    DROP TRIGGER IF EXISTS set_timestamp ON public.users;
    DROP TRIGGER IF EXISTS set_timestamp ON public.user_settings;
    DROP TRIGGER IF EXISTS set_timestamp ON public.tracked_wallets;
    DROP TRIGGER IF EXISTS set_timestamp ON public.trades;
    DROP TRIGGER IF EXISTS set_timestamp ON public.wallet_performance;
    DROP TRIGGER IF EXISTS set_timestamp ON public.token_risk_metrics;

    -- Create new triggers
    CREATE TRIGGER trigger_update_wallet_performance
        AFTER INSERT ON public.trades
        FOR EACH ROW
        EXECUTE FUNCTION public.update_wallet_performance();

    CREATE TRIGGER trigger_detect_coordinated_trades
        AFTER INSERT ON public.trades
        FOR EACH ROW
        EXECUTE FUNCTION public.detect_coordinated_trades();

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
END $$;

-- Create RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_holdings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own data"
    ON public.users FOR SELECT
    USING (auth.uid()::BIGINT = id);

CREATE POLICY "Users can update their own data"
    ON public.users FOR UPDATE
    USING (auth.uid()::BIGINT = id);

CREATE POLICY "Users can view their own settings"
    ON public.user_settings FOR SELECT
    USING (auth.uid()::BIGINT = user_id);

CREATE POLICY "Users can update their own settings"
    ON public.user_settings FOR UPDATE
    USING (auth.uid()::BIGINT = user_id);

CREATE POLICY "Users can view their own trades"
    ON public.trades FOR SELECT
    USING (auth.uid()::BIGINT = user_id);

CREATE POLICY "Users can view their own portfolio snapshots"
    ON public.portfolio_snapshots FOR SELECT
    USING (auth.uid()::BIGINT = user_id);

CREATE POLICY "Users can view their own portfolio holdings"
    ON public.portfolio_holdings FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.portfolio_snapshots ps
        WHERE ps.id = portfolio_holdings.snapshot_id
        AND ps.user_id = auth.uid()::BIGINT
    ));
