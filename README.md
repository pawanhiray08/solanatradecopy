# Solana Copy Trading Tool

A real-time Solana copy trading tool that monitors and replicates trades from specified wallet addresses on the Solana Testnet.

## Features

- Monitor insider wallet transactions in real-time
- Track SPL token swaps on DEX platforms (Raydium, Orca)
- Automatic trade replication on Testnet
- Wallet connection support (Phantom)
- Customizable trading parameters
- Real-time transaction dashboard
- Testnet support for risk-free testing

### Advanced Analytics
- Real-time transaction feeds from insider wallets
- Insider wallet rankings by win rate
- Coordinated trade detection
- Portfolio performance tracking
- Risk metrics and alerts
- Token liquidity analysis

### Risk Management
- Customizable trade size limits
- Stop-loss and take-profit automation
- Low liquidity warnings
- Portfolio diversification metrics
- Real-time risk scoring

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SOLANA_RPC_URL=your_solana_rpc_url
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testnet Guide

### Setting Up Your Testnet Wallet

1. Install Phantom Wallet from [phantom.app](https://phantom.app)
2. Create a new wallet or import existing
3. Switch to Testnet:
   - Open Phantom
   - Click Settings (gear icon)
   - Select "Change Network"
   - Choose "Testnet"

### Getting Testnet SOL

1. Get free Testnet SOL from these faucets:
   - [Solana Faucet](https://solfaucet.com)
   - [QuickNode Faucet](https://quicknode.com/faucet/sol)
   - [SolDev Faucet](https://sol-faucet.project-serum.com)

2. Request limits:
   - Most faucets provide 1-2 SOL per request
   - Wait 24 hours between requests
   - Use multiple faucets if needed

### Testing Your Setup

1. Start with small test trades (0.1 SOL)
2. Verify trade execution and monitoring
3. Test stop-loss and take-profit features
4. Monitor transaction fees

### Best Practices

1. Always test new strategies on Testnet first
2. Keep separate wallets for Testnet and Mainnet
3. Regularly check wallet balances
4. Monitor transaction history for debugging

## Technology Stack

- Next.js 14
- React 18
- Solana Web3.js
- SPL Token
- Supabase
- TailwindCSS
- TypeScript

## License

MIT
