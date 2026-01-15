/**
 * Chronos Markets Type Definitions
 */

// =============================================================================
// MARKET TYPES
// =============================================================================

export interface Market {
  id: number;
  creator: string;
  question: string;
  categories: string[];
  endTime: string;
  createdAt: string;
  yesPool: string;
  noPool: string;
  totalYesShares: string;
  totalNoShares: string;
  resolved: boolean;
  outcome: boolean | null;
  volume: string;
  yesPrice: number;
  noPrice: number;
}

export interface Position {
  marketId: number;
  owner: string;
  yesShares: string;
  noShares: string;
  claimed: boolean;
}

export interface Trade {
  id: number;
  marketId: number;
  trader: string;
  isYes: boolean;
  shares: string;
  cost: string;
  timestamp: string;
}

// =============================================================================
// ORDER TYPES
// =============================================================================

export interface LimitOrder {
  id: number;
  marketId: number;
  owner: string;
  isYes: boolean;
  isBuy: boolean;
  shares: string;
  priceLimit: string;
  filledShares: string;
  status: 'pending' | 'partial' | 'filled' | 'cancelled' | 'expired';
  expiresAt: string | null;
  createdAt: string;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface OrderBookEntry {
  price: string;
  size: string;
  total: string;
  orders: number;
}

// =============================================================================
// COMBO/PARLAY TYPES
// =============================================================================

export interface Combo {
  id: number;
  markets: number[];
  outcomes: boolean[];
  multiplier: number;
  minBet: string;
  maxBet: string;
}

export interface ComboBet {
  id: number;
  comboId: number;
  bettor: string;
  amount: string;
  potentialPayout: string;
  status: 'pending' | 'won' | 'lost' | 'partial';
  marketResults: { marketId: number; outcome: boolean | null }[];
  createdAt: string;
}

// =============================================================================
// AGENT TYPES
// =============================================================================

export interface TradingAgent {
  id: number;
  name: string;
  strategy: AgentStrategy;
  creator: string;
  totalVolume: string;
  profitLoss: string;
  winRate: number;
  followers: number;
  isActive: boolean;
  config: AgentConfig;
  createdAt: string;
}

export type AgentStrategy = 
  | 'momentum'
  | 'mean_reversion'
  | 'arbitrage'
  | 'market_maker'
  | 'sentiment'
  | 'custom';

export interface AgentConfig {
  maxPositionSize: string;
  maxDrawdown: string;
  targetMarkets: string[];
  riskLevel: 'low' | 'medium' | 'high';
  autoRebalance: boolean;
  parameters: Record<string, unknown>;
}

export interface AgentFollower {
  agentId: number;
  follower: string;
  allocation: string;
  copyRatio: number;
  joinedAt: string;
}

// =============================================================================
// SOCIAL FEED TYPES
// =============================================================================

export interface FeedItem {
  id: number;
  type: 'trade' | 'comment' | 'market_created' | 'market_resolved' | 'combo_win';
  wallet: string;
  marketId: number | null;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  likes: number;
  replies: number;
}

export interface Comment {
  id: number;
  marketId: number;
  author: string;
  content: string;
  timestamp: string;
  likes: number;
  replies: Comment[];
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export interface UserStats {
  wallet: string;
  totalVolume: string;
  profitLoss: string;
  winRate: number;
  tradesCount: number;
  marketsCreated: number;
  bestTrade: Trade | null;
  worstTrade: Trade | null;
}

export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  displayName: string | null;
  totalVolume: string;
  profitLoss: string;
  winRate: number;
  tradesCount: number;
}

export interface PortfolioSummary {
  totalValue: string;
  unrealizedPL: string;
  realizedPL: string;
  positions: PositionWithMarket[];
  pendingOrders: LimitOrder[];
  comboBets: ComboBet[];
}

export interface PositionWithMarket extends Position {
  market: Market;
  currentValue: string;
  unrealizedPL: string;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface MarketsResponse {
  markets: Market[];
}

export interface MarketResponse {
  market: Market | null;
}

export interface PositionsResponse {
  positions: Position[];
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
}

export interface TradeHistoryResponse {
  tradeHistory: Trade[];
}

export interface UserStatsResponse {
  userStats: UserStats;
}

export interface SocialFeedResponse {
  socialFeed: FeedItem[];
}

export interface AgentsResponse {
  agents: TradingAgent[];
}
