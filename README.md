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

## Technology Stack

- Next.js 14
- React 18
- Solana Web3.js
- SPL Token
- Supabase
- TailwindCSS
- TypeScript

## Testing

The application runs on Solana Testnet by default. Get test SOL from [Solana Faucet](https://solfaucet.com/).

## License

MIT
