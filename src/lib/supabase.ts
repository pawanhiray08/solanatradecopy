import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false, // Don't persist session for anonymous access
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey, // Add the anon key to headers
    }
  }
});

// Verify API endpoints and check for necessary tables in the Supabase database
async function verifyApiEndpoints() {
  try {
    // Ensure that the following endpoints are correct:
    // - /rest/v1/traders
    // - /rest/v1/trader_follows
    // - /rest/v1/trades
    // - /rest/v1/positions
    const endpoints = [
      '/rest/v1/traders',
      '/rest/v1/trader_follows',
      '/rest/v1/trades',
      '/rest/v1/positions',
    ];

    for (const endpoint of endpoints) {
      const response = await supabase.from(endpoint).select('id');
      if (response.error) {
        console.error(`Error verifying endpoint ${endpoint}: ${response.error.message}`);
      } else {
        console.log(`Verified endpoint ${endpoint}`);
      }
    }
  } catch (error) {
    console.error('Error verifying API endpoints:', error);
  }
}

verifyApiEndpoints();

// Add error logging
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Supabase auth event:', event);
  if (event === 'SIGNED_OUT') {
    console.log('User signed out');
  } else if (event === 'SIGNED_IN') {
    console.log('User signed in:', session?.user?.id);
  }
});

export type { Database, Trade, Wallet, UserSettings, InsiderWallet, Transaction } from './types';
