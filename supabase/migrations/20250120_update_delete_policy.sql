-- Drop existing policies
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON insider_wallets;
DROP POLICY IF EXISTS "Enable delete for all users" ON insider_wallets;

-- Temporarily disable RLS
ALTER TABLE insider_wallets DISABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Enable delete for all users"
ON insider_wallets
FOR DELETE
USING (true);

-- Enable RLS again
ALTER TABLE insider_wallets ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT DELETE ON insider_wallets TO anon;
GRANT DELETE ON insider_wallets TO authenticated;
GRANT DELETE ON insider_wallets TO service_role;
