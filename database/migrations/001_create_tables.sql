-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create trade_alerts table
CREATE TABLE IF NOT EXISTS trade_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    importance VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create coordinated_trades table
CREATE TABLE IF NOT EXISTS coordinated_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_address VARCHAR(255) NOT NULL,
    token_symbol VARCHAR(50) NOT NULL,
    number_of_wallets INTEGER NOT NULL,
    total_volume DECIMAL NOT NULL,
    average_price DECIMAL NOT NULL,
    dex_platform VARCHAR(100) NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create or modify insider_wallets table
CREATE TABLE IF NOT EXISTS insider_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address VARCHAR(255) NOT NULL UNIQUE,
    label VARCHAR(255),
    win_rate DECIMAL,
    total_profit_loss DECIMAL,
    rank INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trade_settings table
CREATE TABLE IF NOT EXISTS trade_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_name VARCHAR(255) NOT NULL,
    setting_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create positions table
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(255) NOT NULL,
    amount DECIMAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create traders table
CREATE TABLE IF NOT EXISTS traders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    monthly_roi DECIMAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trader_follows table
CREATE TABLE IF NOT EXISTS trader_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower VARCHAR(255) NOT NULL,
    followed_trader VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trader VARCHAR(255) NOT NULL,
    amount DECIMAL NOT NULL,
    price DECIMAL NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
