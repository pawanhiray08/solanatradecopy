-- Update insider_wallets table to ensure all required columns exist
ALTER TABLE insider_wallets
ADD COLUMN IF NOT EXISTS success_rate DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_trades INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS successful_trades INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_trade_at TIMESTAMPTZ;
