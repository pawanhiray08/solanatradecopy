-- Create insider_wallets table
CREATE TABLE IF NOT EXISTS insider_wallets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    address TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    success_rate DECIMAL DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    successful_trades INTEGER DEFAULT 0,
    last_trade_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address TEXT NOT NULL REFERENCES insider_wallets(address),
    signature TEXT NOT NULL UNIQUE,
    token_address TEXT NOT NULL,
    token_symbol TEXT,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    amount DECIMAL NOT NULL,
    price DECIMAL NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN DEFAULT FALSE
);

-- Create RLS policies
ALTER TABLE insider_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for insider_wallets
CREATE POLICY "Enable read access for all users" ON insider_wallets
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON insider_wallets
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON insider_wallets
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create policies for transactions
CREATE POLICY "Enable read access for all users" ON transactions
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON transactions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_insider_wallets_updated_at
    BEFORE UPDATE ON insider_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_insider_wallets_address ON insider_wallets(address);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_address ON transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_transactions_token_address ON transactions(token_address);
CREATE INDEX IF NOT EXISTS idx_transactions_signature ON transactions(signature);
