-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON wallets;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON wallets;
DROP POLICY IF EXISTS "Enable access to own settings" ON user_settings;
DROP POLICY IF EXISTS "Enable insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Enable access to own trades" ON trades;
DROP POLICY IF EXISTS "Enable insert own trades" ON trades;

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    address TEXT NOT NULL,
    label TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    max_trade_size DECIMAL NOT NULL DEFAULT 0,
    stop_loss_percentage DECIMAL NOT NULL DEFAULT 0,
    take_profit_percentage DECIMAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    token_address TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    price DECIMAL NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON wallets FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON wallets FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable access to own settings" ON user_settings USING (auth.uid() = user_id);
CREATE POLICY "Enable insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable access to own trades" ON trades USING (auth.uid() = user_id);
CREATE POLICY "Enable insert own trades" ON trades FOR INSERT WITH CHECK (auth.uid() = user_id);
