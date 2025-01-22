import { Commitment, Connection, ConnectionConfig, PublicKey } from '@solana/web3.js';

const config: ConnectionConfig = {
  commitment: 'confirmed' as Commitment,
  wsEndpoint: process.env.NEXT_PUBLIC_SOLANA_WS_URL,
  disableRetryOnRateLimit: false,
  confirmTransactionInitialTimeout: 120000,
};

export const getConnection = async () => {
  const primaryRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  const backupRpc = process.env.NEXT_PUBLIC_SOLANA_BACKUP_RPC_URL;
  
  if (!primaryRpc) {
    throw new Error('Primary RPC URL not configured');
  }

  try {
    const connection = new Connection(primaryRpc, config);
    await connection.getVersion(); // Test the connection
    return connection;
  } catch (error) {
    console.warn('Primary RPC failed, falling back to backup:', error);
    if (!backupRpc) throw new Error('No backup RPC configured');
    
    try {
      const backupConnection = new Connection(backupRpc, config);
      await backupConnection.getVersion();
      return backupConnection;
    } catch (backupError) {
      console.error('Backup RPC failed:', backupError);
      throw new Error('All RPC endpoints failed');
    }
  }
};

export const getBalance = async (connection: Connection, publicKey: string) => {
  try {
    const balance = await connection.getBalance(new PublicKey(publicKey));
    console.log(`Balance for ${publicKey}: ${balance / 10 ** 9} SOL`); // Log balance
    return balance / 10 ** 9; // Convert lamports to SOL
  } catch (error) {
    console.error('Failed to fetch balance:', error);
    throw error;
  }
};

export const getTokenBalance = async (connection: Connection, tokenAccount: string) => {
  try {
    const balance = await connection.getTokenAccountBalance(new PublicKey(tokenAccount));
    return balance.value;
  } catch (error) {
    console.error('Failed to fetch token balance:', error);
    throw error;
  }
};
