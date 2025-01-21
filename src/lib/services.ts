import { Connection, PublicKey } from '@solana/web3.js';
import { DexService } from './dex';
import { TradingService } from './trading-service';
import { WalletMonitor } from './wallet-monitor';

// Raydium Swap V2 Program ID
const DEX_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');

// Initialize services
export function initializeServices(
  connection: Connection,
  userWallet: PublicKey,
  settings: any
) {
  const dexService = new DexService(connection, DEX_PROGRAM_ID);
  const tradingService = new TradingService(connection, dexService, userWallet, settings);
  const walletMonitor = new WalletMonitor(connection, dexService, tradingService);

  return {
    dexService,
    tradingService,
    walletMonitor,
  };
}
