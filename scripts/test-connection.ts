const { Connection } = require('@solana/web3.js');
require('dotenv').config();

async function testConnection() {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (!rpcUrl) {
    throw new Error('NEXT_PUBLIC_SOLANA_RPC_URL not found in environment variables');
  }

  console.log('Testing connection to:', rpcUrl);
  
  const connection = new Connection(rpcUrl, 'confirmed');
  
  try {
    const version = await connection.getVersion();
    console.log('Connected successfully!');
    console.log('Solana version:', version);
    
    const slot = await connection.getSlot();
    console.log('Current slot:', slot);
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

testConnection();
