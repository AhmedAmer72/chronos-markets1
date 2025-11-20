# Chronos Markets - Decentralized Prediction Markets

A decentralized prediction market platform built on the Linera blockchain protocol, enabling users to trade on real-world events with speed and transparency.

## 🚀 Features

- **AMM-Based Pricing**: Automated Market Maker using constant product formula (k = x * y)
- **Real-time Trading**: Instant market creation and share trading
- **Modern UI**: Beautiful, responsive interface built with React 19 + TailwindCSS
- **Blockchain-Powered**: Secured by Linera protocol's microchain architecture

## 📋 Prerequisites

- Node.js 18+ and npm
- Rust and Cargo (for smart contracts)
- Linera CLI v0.15.6+

## 🏃 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:3007`

### 3. Deploy Smart Contracts (Optional)

```bash
# Start Linera local devnet and deploy contracts
./quick-start.sh
```

This will:
- Start a local Linera devnet
- Deploy the prediction market contracts
- Start the GraphQL service on port 8080

## 📁 Project Structure

```
chronos-markets1/
├── components/          # React components
│   ├── HomePage.tsx
│   ├── MarketsPage.tsx
│   ├── MarketPage.tsx
│   ├── CreateMarketPage.tsx
│   ├── PortfolioPage.tsx
│   └── AgentHubPage.tsx
├── contexts/           # React contexts
│   └── WalletContext.tsx
├── services/           # API services
│   ├── chronosContract.ts  # Blockchain integration
│   └── mockApi.ts         # Mock data
├── linera-app/         # Smart contracts
│   ├── contract/       # Core contract logic
│   ├── service/        # GraphQL service
│   └── src/           # Shared types
└── quick-start.sh      # Automated setup script
```

## 🔧 Configuration

### Chain & Application IDs

**Default Chain ID:**
```
51804de22a3c25a48edbf5bdad4b3efe82fb1201b22e031c4e2a5be24f76288d
```

**Application ID:**
```
b891a74bfa28c13c2305ad493c1706defa3990a5f8fe239cf3b3963860250d4c
```

Update these in:
- `contexts/WalletContext.tsx`
- `services/chronosContract.ts`

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Smart Contract Development

```bash
cd linera-app
cargo build --release --target wasm32-unknown-unknown
```

## 📚 Documentation

- [Integration Guide](./INTEGRATION_GUIDE.md) - Detailed integration documentation
- [Testing Guide](./TESTING_GUIDE.md) - How to test the platform

## 🎯 Core Operations

### Creating a Market

Markets are created with:
- Question (e.g., "Will Bitcoin reach $100k in 2025?")
- End date/time
- Initial liquidity
- Oracle source

### Trading Shares

- Buy YES or NO shares
- AMM calculates fair pricing
- Instant settlement on blockchain

### Resolving Markets

- Markets resolve at end time
- Winners claim proportional winnings
- Automated through smart contracts

## 🔗 Technology Stack

- **Frontend**: React 19, TypeScript, TailwindCSS, Vite
- **Blockchain**: Linera Protocol
- **Smart Contracts**: Rust, WebAssembly
- **API**: GraphQL

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines first.

## 📞 Support

For issues and questions, please open a GitHub issue.

---

Built with ❤️ for the decentralized future
