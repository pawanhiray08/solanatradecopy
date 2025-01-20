-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update insider_wallets table to include current_balance
ALTER TABLE insider_wallets 
ADD COLUMN IF NOT EXISTS current_balance DECIMAL;

-- Create trades table if not exists
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(255) NOT NULL,
    coin_invested VARCHAR(50) NOT NULL,
    amount DECIMAL NOT NULL,
    price DECIMAL NOT NULL,
    profit_loss DECIMAL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create future_trades table if you want to track future trades
CREATE TABLE IF NOT EXISTS future_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(255) NOT NULL,
    coin_invested VARCHAR(50) NOT NULL,
    action VARCHAR(10) NOT NULL, -- 'buy' or 'sell'
    amount DECIMAL NOT NULL,
    target_price DECIMAL NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
