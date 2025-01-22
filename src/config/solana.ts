import { Commitment, Connection, ConnectionConfig, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

const config: ConnectionConfig = {
  commitment: 'confirmed' as Commitment,
  wsEndpoint: process.env.NEXT_PUBLIC_SOLANA_WS_URL,
  disableRetryOnRateLimit: false,
  confirmTransactionInitialTimeout: 120000,
};

export const getConnection = async () => {
  // First try configured RPC endpoint
  const configuredRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  
  // Fallback to public devnet endpoint
  const devnetRpc = clusterApiUrl('devnet');
  
  try {
    if (configuredRpc) {
      const connection = new Connection(configuredRpc, config);
      await connection.getVersion(); // Test the connection
      console.log('Using configured RPC endpoint');
      return connection;
    }
  } catch (error) {
    console.warn('Configured RPC failed:', error);
  }

  // Fallback to public devnet
  try {
    const connection = new Connection(devnetRpc, config);
    await connection.getVersion();
    console.log('Using public devnet endpoint');
    return connection;
  } catch (error) {
    console.error('Devnet connection failed:', error);
    throw new Error('Failed to connect to Solana devnet');
  }
};

export const getBalance = async (connection: Connection, publicKey: string) => {
  try {
    const pubKey = new PublicKey(publicKey);
    console.log('Fetching balance for address:', publicKey);
    const balance = await connection.getBalance(pubKey);
    const solBalance = balance / 10 ** 9;
    console.log(`Devnet balance for ${publicKey}: ${solBalance} SOL`);
    return solBalance;
  } catch (error) {
    console.error('Failed to fetch devnet balance:', error);
    throw error;
  }
};

export interface TokenBalanceInfo {
  mint: string;
  balance: number;
  decimals: number;
}

export const getTokenBalances = async (
  connection: Connection,
  walletAddress: string
): Promise<TokenBalanceInfo[]> => {
  try {
    const publicKey = new PublicKey(walletAddress);
    console.log('Fetching token accounts for address:', walletAddress);
    
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { programId: TOKEN_PROGRAM_ID }
    );

    console.log('Found token accounts:', tokenAccounts.value.length);

    return tokenAccounts.value.map((account) => {
      const parsedInfo = account.account.data.parsed.info;
      const balance = Number(parsedInfo.tokenAmount.amount) / (10 ** parsedInfo.tokenAmount.decimals);
      console.log(`Token ${parsedInfo.mint}: ${balance}`);
      return {
        mint: parsedInfo.mint,
        balance,
        decimals: parsedInfo.tokenAmount.decimals
      };
    });
  } catch (error) {
    console.error('Failed to fetch token balances:', error);
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
