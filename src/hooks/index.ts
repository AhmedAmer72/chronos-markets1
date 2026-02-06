/**
 * Hooks Module - Re-exports for clean imports
 */

// Core Hooks
export { useLineraConnection, type LineraConnectionState } from './useLineraConnection';
export { useMarkets, useMarket, type MarketsState, type MarketState } from './useMarkets';
export { usePortfolio, type PortfolioState } from './usePortfolio';
export { useSocialFeed, type SocialFeedState } from './useSocialFeed';
export { useAgents, type AgentsState } from './useAgents';

// Real-time & Alerts Hooks
export { useRealTimePrice, type UseRealTimePriceResult } from './useRealTimePrice';
export { usePriceAlerts, type UsePriceAlertsResult } from './usePriceAlerts';
export { useWatchlist, type UseWatchlistResult } from './useWatchlist';

// Portfolio Analytics Hook
export { usePortfolioAnalytics, type UsePortfolioAnalyticsResult } from './usePortfolioAnalytics';

// Social Hooks
export { useUserProfile, type UseUserProfileResult } from './useUserProfile';
export { useLeaderboard, type UseLeaderboardResult } from './useLeaderboard';
export { useNotifications, type UseNotificationsResult } from './useNotifications';
export { useCopyTrading, type UseCopyTradingResult } from './useCopyTrading';

// AI Agents Hook
export { useTradingAgents, type UseTradingAgentsResult } from './useTradingAgents';
