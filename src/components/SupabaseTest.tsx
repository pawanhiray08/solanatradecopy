'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'error'>('testing');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    async function testConnection() {
      try {
        // Log debug information
        const debug = `Testing Supabase connection...
URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}
Key present: ${Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)}`;
        
        console.log(debug);
        setDebugInfo(debug);

        // Simple auth check
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError) {
          throw new Error(`Auth error: ${authError.message}`);
        }

        // Test if we can make a simple query
        const { data, error: dbError } = await supabase
          .from('wallets')
          .select('id')
          .limit(1)
          .maybeSingle();

        if (dbError && dbError.code !== 'PGRST116') { // PGRST116 means no rows found, which is OK
          throw new Error(`Database error: ${dbError.message} (${dbError.code})`);
        }

        setConnectionStatus('success');
        setDebugInfo(prev => `${prev}\nConnection successful!`);
      } catch (err) {
        console.error('Connection error:', err);
        setConnectionStatus('error');
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        setDebugInfo(prev => `${prev}\nError: ${errorMessage}`);
      }
    }

    testConnection();
  }, []);

  return (
    <div className="p-4 rounded-lg border">
      <h2 className="text-lg font-semibold mb-2">Supabase Connection Test</h2>
      <div className="space-y-2">
        <p>
          Status:{' '}
          {connectionStatus === 'testing' && 'Testing connection...'}
          {connectionStatus === 'success' && (
            <span className="text-green-600">Connected successfully! ✅</span>
          )}
          {connectionStatus === 'error' && (
            <span className="text-red-600">Connection failed! ❌</span>
          )}
        </p>
        {error && (
          <div className="text-red-600">
            <p>Error: {error}</p>
            <p className="text-sm mt-2">
              Please check:
              1. Your .env.local file has correct credentials
              2. Your Supabase project is active
              3. You have proper table permissions
            </p>
          </div>
        )}
        <div className="text-sm mt-2">
          <p>Environment Check:</p>
          <p>SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set'}</p>
          <p>SUPABASE_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set'}</p>
        </div>
        <div className="text-xs mt-2 p-2 bg-gray-100 rounded whitespace-pre-wrap font-mono">
          {debugInfo}
        </div>
      </div>
    </div>
  );
}
