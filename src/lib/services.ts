import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { DexService } from './dex';
import { TradingService } from './trading-service';
import { WalletMonitor } from './wallet-monitor';
import { AnalyticsService } from './analytics-service';
import { TradeReplicationConfig, UserSettings, convertUserSettingsToTradeSettings } from './types';

// Raydium Devnet Swap V2 Program ID
const DEX_PROGRAM_ID = new PublicKey(process.env.RAYDIUM_SWAP_V2_PROGRAM_ID || '');

// Use Devnet endpoint
const DEVNET_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet');

// Initialize services
export function initializeServices(
  connection: Connection = new Connection(DEVNET_ENDPOINT),
  userWallet: PublicKey,
  settings: UserSettings,
  userId: string
) {
  // Create trade replication config from user settings
  const tradeConfig: TradeReplicationConfig = {
    maxTradeSize: settings.trade_settings.maxTradeSize,
    stopLossPercentage: settings.trade_settings.stopLossPercentage,
    takeProfitPercentage: settings.trade_settings.takeProfitPercentage,
    slippageTolerance: settings.trade_settings.slippageTolerance,
    enabledTokens: new Set(settings.enabled_tokens)
  };

  const dexService = new DexService(connection, DEX_PROGRAM_ID);
  const tradingService = new TradingService(
    connection,
    dexService,
    userWallet,
    convertUserSettingsToTradeSettings(settings)
  );
  const walletMonitor = new WalletMonitor(
    connection,
    dexService,
    tradingService,
    userWallet,
    tradeConfig
  );
  const analyticsService = new AnalyticsService(connection, dexService, userId);

  return {
    dexService,
    tradingService,
    walletMonitor,
    analyticsService,
  };
}

// Helper function to check if we're on devnet
export function isDevnet(connection: Connection): boolean {
  return connection.rpcEndpoint === DEVNET_ENDPOINT || 
         connection.rpcEndpoint.includes('devnet');
}

// Helper function to validate devnet configuration
export async function validateDevnetConfig(connection: Connection): Promise<boolean> {
  try {
    if (!isDevnet(connection)) {
      console.error('Error: Application must run on Devnet');
      return false;
    }

    // Verify connection
    const version = await connection.getVersion();
    console.log('Connected to Solana Devnet:', version);

    return true;
  } catch (error) {
    console.error('Error validating devnet configuration:', error);
    return false;
  }
}
