# Chronos Markets
# High-Speed Prediction Markets on Linera

Chronos Markets is a decentralized prediction market platform powered by the Linera blockchain protocol, enabling users to trade on real-world events with unparalleled speed and scale.

## 🚀 Features

- **Lightning-Fast Trading**: Powered by Linera's parallel blockchain architecture
- **Autonomous Agents**: Deploy and manage AI trading bots
- **Real-Time Charts**: Interactive price history and market analytics
- **Multi-Category Markets**: Politics, Crypto, Sports, Science & Tech, Culture, Finance
- **Wallet Integration**: Seamless Linera wallet connectivity
- **Portfolio Management**: Track positions and P&L in real-time
- **Market Creation**: Create custom prediction markets
- **Responsive Design**: Optimized for desktop and mobile

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: TailwindCSS with custom dark theme
- **Charts**: Recharts for data visualization
- **Routing**: React Router with HashRouter
- **Blockchain**: Linera Protocol
- **State Management**: React Context API

## 📦 Installation

### Prerequisites
- Node.js 18+
- Linera CLI
- WSL (for Windows users)

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/chronos-markets1.git
cd chronos-markets1


Copy

Insert at cursor
Install dependencies

npm install

Copy

Insert at cursor
Install Linera CLI (WSL/Linux)

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install Linera CLI
cargo install linera-cli --locked

# Initialize wallet
linera wallet init --with-new-chain

Copy

Insert at cursor
bash
Configure environment

cp .env.local.example .env.local
# Edit .env.local with your API keys

Copy

Insert at cursor
bash
Start development server

npm run dev

Copy

Insert at cursor
bash
Start Linera service (optional)

linera service --port 8080

Copy

Insert at cursor
bash
🌐 Usage
Visit http://localhost:3001 to access the application.

Key Pages
Home (/): Landing page with trending markets and stats

Markets (/markets): Browse all available markets with filtering

Market Detail (/market/:id): Individual market trading interface

Portfolio (/portfolio): View positions and trading history

Create Market (/create): Create new prediction markets

Agent Hub (/agent-hub): Deploy and manage trading agents

Wallet Connection
Click "Connect" in the header

Ensure Linera service is running on localhost:8080

Wallet will connect automatically to your local Linera node

Agent Deployment
Navigate to Agent Hub

Click "Create Agent" or "Deploy New Agent"

Fill in agent name and strategy description

Click "Deploy" to activate your trading bot

🏗 Project Structure
chronos-markets1/
├── components/           # React components
│   ├── HomePage.tsx     # Landing page
│   ├── MarketsPage.tsx  # Market listing
│   ├── MarketPage.tsx   # Individual market
│   ├── PortfolioPage.tsx # User portfolio
│   ├── CreateMarketPage.tsx # Market creation
│   ├── AgentHubPage.tsx # Agent management
│   ├── Header.tsx       # Navigation
│   ├── Footer.tsx       # Footer
│   └── icons.tsx        # Icon components
├── contexts/            # React contexts
│   └── WalletContext.tsx # Wallet state management
├── services/            # API services
│   ├── mockApi.ts       # Mock data service
│   └── lineraService.ts # Linera blockchain service
├── types.ts             # TypeScript definitions
├── App.tsx              # Main app component
├── index.tsx            # Entry point
└── vite.config.ts       # Vite configuration

Copy

Insert at cursor
🎯 Market Categories
Politics: Elections, policy decisions, political events

Crypto: Price predictions, protocol launches, market events

Sports: Game outcomes, season predictions, player performance

Science & Tech: Product launches, breakthrough announcements

Culture: Entertainment, social trends, celebrity events

Finance: Stock prices, economic indicators, market movements

🤖 Agent System
Deploy autonomous trading agents with custom strategies:

Strategy Definition: Define trading logic and parameters

Risk Management: Set position limits and stop-losses

Performance Tracking: Monitor agent P&L and trade history

Leaderboard: Compete with other agents globally

🔧 Development
Available Scripts
npm run dev - Start development server

npm run build - Build for production

npm run preview - Preview production build

Environment Variables
GEMINI_API_KEY=your_gemini_api_key
LINERA_RPC_URL=http://localhost:8080
LINERA_WALLET_PATH=~/.config/linera

Copy

Insert at cursor
env
🚀 Deployment
Build the application:

npm run build


Built with ❤️ using Linera Protocol
```
