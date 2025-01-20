'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestConnection() {
  const [status, setStatus] = useState<{ message: string; isError: boolean }>({
    message: 'Checking connection...',
    isError: false,
  });
  const [realtimeStatus, setRealtimeStatus] = useState<{ message: string; isError: boolean }>({
    message: 'Testing realtime...',
    isError: false,
  });

  useEffect(() => {
    let mounted = true;
    let channel: any = null;

    async function testConnection() {
      try {
        // Test database connection
        const { data, error } = await supabase
          .from('transactions')
          .select('count')
          .single();

        if (!mounted) return;

        if (error) {
          setStatus({
            message: `Database Error: ${error.message}`,
            isError: true,
          });
          return;
        }
        
        setStatus({
          message: 'Database connected successfully! ',
          isError: false,
        });

        // Test realtime
        channel = supabase.channel('test-channel');
        
        channel
          .on('presence', { event: 'sync' }, () => {
            if (!mounted) return;
            setRealtimeStatus({
              message: 'Realtime connected successfully! ',
              isError: false,
            });
          })
          .subscribe((status: string) => {
            if (!mounted) return;
            if (status === 'SUBSCRIBED') {
              setRealtimeStatus({
                message: 'Realtime subscription active ',
                isError: false,
              });
            } else {
              setRealtimeStatus({
                message: `Realtime status: ${status}`,
                isError: status !== 'SUBSCRIBED',
              });
            }
          });

      } catch (err) {
        if (!mounted) return;
        setStatus({
          message: `Error: ${err instanceof Error ? err.message : String(err)}`,
          isError: true,
        });
      }
    }

    testConnection();

    return () => {
      mounted = false;
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, []);

  return (
    <div className="p-4 m-4 border rounded-lg bg-white shadow-sm">
      <h2 className="text-xl font-bold mb-4">Connection Status</h2>
      <div className="space-y-2">
        <div className={`p-3 rounded ${status.isError ? 'bg-red-50' : 'bg-green-50'}`}>
          <p className={status.isError ? 'text-red-700' : 'text-green-700'}>
            Database: {status.message}
          </p>
        </div>
        <div className={`p-3 rounded ${realtimeStatus.isError ? 'bg-red-50' : 'bg-green-50'}`}>
          <p className={realtimeStatus.isError ? 'text-red-700' : 'text-green-700'}>
            Realtime: {realtimeStatus.message}
          </p>
        </div>
      </div>
    </div>
  );
}
