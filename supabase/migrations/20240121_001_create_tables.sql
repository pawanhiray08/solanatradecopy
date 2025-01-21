-- Create extension in public schema if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set search path
SET search_path TO public;

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
    wallet_address TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
    id BIGSERIAL PRIMARY KEY,
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
    id BIGSERIAL PRIMARY KEY,
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
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    wallet_id BIGINT REFERENCES public.tracked_wallets(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, wallet_id)
);

-- Create token risk metrics table
CREATE TABLE IF NOT EXISTS public.token_risk_metrics (
    id BIGSERIAL PRIMARY KEY,
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

-- Create wallet performance table
CREATE TABLE IF NOT EXISTS public.wallet_performance (
    id BIGSERIAL PRIMARY KEY,
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
CREATE TABLE IF NOT EXISTS public.trades (
    id BIGSERIAL PRIMARY KEY,
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

-- Create coordinated trades table
CREATE TABLE IF NOT EXISTS public.coordinated_trades (
    id BIGSERIAL PRIMARY KEY,
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
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    total_value_sol DECIMAL DEFAULT 0,
    total_pnl_sol DECIMAL DEFAULT 0,
    total_pnl_percentage DECIMAL DEFAULT 0,
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create portfolio holdings table
CREATE TABLE IF NOT EXISTS public.portfolio_holdings (
    id BIGSERIAL PRIMARY KEY,
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
