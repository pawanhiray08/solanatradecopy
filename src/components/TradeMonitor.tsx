'use client';

import { useEffect } from 'react';
import { TradeService } from '@/lib/tradeService';
import { supabase } from '@/lib/supabase';

export function TradeMonitor() {
  useEffect(() => {
    const initializeTradeMonitoring = async () => {
      try {
        // Get all insider wallets
        const { data: wallets, error } = await supabase
          .from('insider_wallets')
          .select('address');

        if (error) throw error;

        // Initialize trade service and start monitoring
        const tradeService = new TradeService();
        const walletAddresses = wallets?.map(w => w.address) || [];
        await tradeService.monitorWallets(walletAddresses);

        console.log('Trade monitoring initialized for', walletAddresses.length, 'wallets');
      } catch (error) {
        console.error('Failed to initialize trade monitoring:', error);
      }
    };

    initializeTradeMonitoring();
  }, []);

  // This component doesn't render anything
  return null;
}
