import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { DexService } from './dex';
import { TradingService } from './trading-service';
import { WalletMonitor } from './wallet-monitor';
import { AnalyticsService } from './analytics-service';
import { TradeReplicationConfig, UserSettings, convertUserSettingsToTradeSettings } from './types';

// Raydium Testnet Swap V2 Program ID
const DEX_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');

// Use Testnet endpoint
const TESTNET_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('testnet');

// Initialize services
export function initializeServices(
  connection: Connection = new Connection(TESTNET_ENDPOINT),
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

// Helper function to check if we're on testnet
export function isTestnet(connection: Connection): boolean {
  return connection.rpcEndpoint === TESTNET_ENDPOINT || 
         connection.rpcEndpoint.includes('testnet');
}

// Helper function to validate testnet configuration
export async function validateTestnetConfig(connection: Connection): Promise<boolean> {
  try {
    if (!isTestnet(connection)) {
      console.error('Error: Application must run on Testnet');
      return false;
    }

    // Verify connection
    const version = await connection.getVersion();
    console.log('Connected to Solana Testnet:', version);

    return true;
  } catch (error) {
    console.error('Error validating testnet configuration:', error);
    return false;
  }
}
