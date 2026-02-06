/**
 * Chronos Markets - Library Exports
 * 
 * Central export point for all library modules.
 */

// Linera Blockchain Integration
export * from './linera';

// Chronos API & Types (canonical source for shared types like TradingAgent, AgentStrategy, PortfolioSummary)
export * from './chronos';

// Real-time Price Updates
export * from './websocket';

// Price Alerts System
export * from './alerts';

// Favorites & Watchlist
export * from './watchlist';

// Advanced Charting
export * from './charts';

// Market Search & Filters
export * from './search';

// Market Templates
export * from './templates';

// Portfolio Analytics (exclude types already exported from chronos)
export {
  portfolioAnalytics,
  getBalance,
  getPositionsWithAnalysis,
  recordTrade,
  getTradeHistory,
  exportTradeHistoryCSV,
  exportTradeHistoryJSON,
  getPortfolioSummary,
  type PortfolioBalance,
  type PnLSnapshot,
  type TradeRecord,
  type PositionAnalysis,
} from './portfolio';

// Social Features
export * from './social';

// AI Trading Agents (exclude types already exported from chronos)
export {
  tradingAgents,
  createTradingAgent,
  getTradingAgents,
  getTradingAgent,
  updateTradingAgent,
  deleteTradingAgent,
  toggleTradingAgent,
  getAgentTradeHistory,
  type StrategyConfig,
  type AgentTrade,
} from './agents';
