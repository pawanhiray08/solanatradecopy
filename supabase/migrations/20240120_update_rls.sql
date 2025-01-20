-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON insider_wallets;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON insider_wallets;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON insider_wallets;

-- Create new policies that allow public access
CREATE POLICY "Enable read access for all users" ON insider_wallets
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON insider_wallets
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON insider_wallets
    FOR UPDATE USING (true);

-- Make sure RLS is enabled
ALTER TABLE insider_wallets ENABLE ROW LEVEL SECURITY;
