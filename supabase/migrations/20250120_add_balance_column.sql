-- Migration to add 'balance' column to 'insider_wallets' table
ALTER TABLE insider_wallets
ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
