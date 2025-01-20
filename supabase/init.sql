-- Create tables
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    token_address TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    price NUMERIC NOT NULL,
    type TEXT CHECK (type IN ('buy', 'sell')),
    status TEXT CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address TEXT NOT NULL UNIQUE,
    label TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    max_trade_size NUMERIC NOT NULL DEFAULT 1,
    stop_loss_percentage NUMERIC NOT NULL DEFAULT 10,
    take_profit_percentage NUMERIC NOT NULL DEFAULT 20,
    auto_trade_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.insider_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    success_rate NUMERIC NOT NULL DEFAULT 0,
    total_trades INTEGER NOT NULL DEFAULT 0,
    successful_trades INTEGER NOT NULL DEFAULT 0,
    last_trade_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    signature TEXT NOT NULL UNIQUE,
    token_address TEXT NOT NULL,
    token_symbol TEXT,
    type TEXT CHECK (type IN ('buy', 'sell')),
    amount NUMERIC NOT NULL,
    price NUMERIC NOT NULL,
    profit_loss NUMERIC,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insider_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.trades;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.wallets;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.insider_wallets;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.transactions;

-- Create policies (now safe to create since we dropped any existing ones)
CREATE POLICY "Enable read access for all users" ON public.trades FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.wallets FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.user_settings FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.insider_wallets FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.transactions FOR SELECT USING (true);

-- Enable realtime (this is idempotent, safe to run multiple times)
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.insider_wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
