-- List all policies for insider_wallets table
SELECT *
FROM pg_policies
WHERE tablename = 'insider_wallets';

-- List RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'insider_wallets';
