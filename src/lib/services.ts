import { Connection, PublicKey } from '@solana/web3.js';
import { DexService } from './dex';
import { TradingService } from './trading-service';
import { WalletMonitor } from './wallet-monitor';

// Initialize services
export function initializeServices(
  connection: Connection,
  userWallet: PublicKey,
  settings: any
) {
  const dexService = new DexService(connection);
  const tradingService = new TradingService(connection, dexService, userWallet, settings);
  const walletMonitor = new WalletMonitor(connection, dexService, tradingService);

  return {
    dexService,
    tradingService,
    walletMonitor,
  };
}
