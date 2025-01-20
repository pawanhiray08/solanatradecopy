-- Create tracked_wallets table
create table public.tracked_wallets (
    id uuid default uuid_generate_v4() primary key,
    address text not null unique,
    label text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create transactions table
create table public.transactions (
    id uuid default uuid_generate_v4() primary key,
    wallet_address text not null references tracked_wallets(address),
    signature text not null unique,
    timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
    type text not null,
    token_in text,
    token_out text,
    amount_in numeric,
    amount_out numeric,
    dex text,
    status text default 'pending'
);

-- Create user_settings table
create table public.user_settings (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid not null unique,
    max_trade_size numeric default 1,
    stop_loss_percentage numeric default 10,
    take_profit_percentage numeric default 20,
    auto_trading_enabled boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create RLS policies
alter table public.tracked_wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.user_settings enable row level security;

-- Allow public read access to tracked_wallets
create policy "Allow public read access to tracked_wallets"
    on public.tracked_wallets for select
    using (true);

-- Allow authenticated users to read their own transactions
create policy "Allow users to read their transactions"
    on public.transactions for select
    using (auth.uid() = user_id);

-- Allow authenticated users to manage their settings
create policy "Allow users to manage their settings"
    on public.user_settings for all
    using (auth.uid() = user_id);
