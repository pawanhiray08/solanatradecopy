'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestConnection() {
  const [status, setStatus] = useState('Checking connection...');
  const [realtimeStatus, setRealtimeStatus] = useState('Testing realtime...');

  useEffect(() => {
    async function testConnection() {
      try {
        // Test database connection
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .limit(1);

        if (error) {
          setStatus(`Database Error: ${error.message}`);
          return;
        }
        
        setStatus('Database connected successfully! ✅');

        // Test realtime
        const channel = supabase.channel('test-channel');
        
        channel
          .on('presence', { event: 'sync' }, () => {
            setRealtimeStatus('Realtime connected successfully! ✅');
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setRealtimeStatus('Realtime subscription active ✅');
            } else {
              setRealtimeStatus(`Realtime status: ${status}`);
            }
          });

      } catch (err) {
        setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    testConnection();
  }, []);

  return (
    <div className="p-4 m-4 border rounded-lg">
      <h2 className="text-xl font-bold mb-4">Supabase Connection Test</h2>
      <div className="space-y-2">
        <p>Database Status: {status}</p>
        <p>Realtime Status: {realtimeStatus}</p>
      </div>
    </div>
  );
}
