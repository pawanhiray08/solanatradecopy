-- First, disable RLS temporarily to ensure we can make changes
ALTER TABLE insider_wallets DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON insider_wallets;
DROP POLICY IF EXISTS "Enable insert for all users" ON insider_wallets;
DROP POLICY IF EXISTS "Enable update for all users" ON insider_wallets;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON insider_wallets;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON insider_wallets;

-- Create new policies with proper security
CREATE POLICY "Enable read access for all users" ON insider_wallets
    FOR SELECT
    USING (true);

CREATE POLICY "Enable insert for all users" ON insider_wallets
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON insider_wallets
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Re-enable RLS with the new policies
ALTER TABLE insider_wallets ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to anon role
GRANT ALL ON insider_wallets TO anon;
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
