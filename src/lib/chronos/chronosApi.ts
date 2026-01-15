/**
 * Chronos Markets API - High-level interface for market operations
 * 
 * HYBRID ARCHITECTURE:
 * - READS → Backend API (for global aggregation) or Blockchain queries
 * - WRITES → Linera blockchain (for authenticity)
 * 
 * Based on Linera-Arcade pattern.
 */

import { lineraAdapter } from '../linera';
import {
  GET_MARKETS,
  GET_MARKET,
  GET_ACTIVE_MARKETS,
  GET_POSITIONS,
  GET_TOTAL_VOLUME,
  GET_LEADERBOARD,
  GET_USER_STATS,
  GET_TRADE_HISTORY,
  GET_SOCIAL_FEED,
  GET_AGENTS,
  CREATE_MARKET,
  BUY_SHARES,
  SELL_SHARES,
  PLACE_LIMIT_ORDER,
  CANCEL_LIMIT_ORDER,
  RESOLVE_MARKET,
  CLAIM_WINNINGS,
  ADD_LIQUIDITY,
  PLACE_COMBO_BET,
  FOLLOW_AGENT,
  CREATE_AGENT,
  POST_COMMENT,
} from './queries';
import type {
  Market,
  Position,
  Trade,
  LimitOrder,
  UserStats,
  LeaderboardEntry,
  FeedItem,
  TradingAgent,
  MarketsResponse,
  MarketResponse,
  PositionsResponse,
  LeaderboardResponse,
  UserStatsResponse,
  TradeHistoryResponse,
  SocialFeedResponse,
  AgentsResponse,
} from './types';

// Backend URL for global aggregation (optional)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function fetchFromBackend<T>(endpoint: string): Promise<T | null> {
  if (!BACKEND_URL) return null;
  
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// =============================================================================
// CHRONOS API CLASS
// =============================================================================

class ChronosApiClass {
  // =========================================================================
  // MARKET QUERIES
  // =========================================================================

  /**
   * Get all markets
   */
  async getMarkets(): Promise<Market[]> {
    try {
      // Try blockchain first
      if (lineraAdapter.isApplicationConnected()) {
        const result = await lineraAdapter.query<MarketsResponse>(GET_MARKETS);
        return result.markets || [];
      }
      
      // Fallback to backend
      const backendResult = await fetchFromBackend<{ markets: Market[] }>('/api/markets');
      return backendResult?.markets || [];
    } catch (error) {
      console.error('Failed to get markets:', error);
      return [];
    }
  }

  /**
   * Get a market by ID
   */
  async getMarket(id: number): Promise<Market | null> {
    try {
      if (lineraAdapter.isApplicationConnected()) {
        const result = await lineraAdapter.query<MarketResponse>(GET_MARKET, { id });
        return result.market;
      }
      
      const backendResult = await fetchFromBackend<{ market: Market }>(`/api/markets/${id}`);
      return backendResult?.market || null;
    } catch (error) {
      console.error('Failed to get market:', error);
      return null;
    }
  }

  /**
   * Get active (non-resolved) markets
   */
  async getActiveMarkets(): Promise<Market[]> {
    try {
      if (lineraAdapter.isApplicationConnected()) {
        const result = await lineraAdapter.query<MarketsResponse>(GET_ACTIVE_MARKETS);
        return result.markets || [];
      }
      
      const backendResult = await fetchFromBackend<{ markets: Market[] }>('/api/markets/active');
      return backendResult?.markets || [];
    } catch (error) {
      console.error('Failed to get active markets:', error);
      return [];
    }
  }

  /**
   * Get positions for a wallet
   */
  async getPositions(wallet: string): Promise<Position[]> {
    try {
      if (lineraAdapter.isApplicationConnected()) {
        const result = await lineraAdapter.query<PositionsResponse>(GET_POSITIONS, { wallet });
        return result.positions || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get positions:', error);
      return [];
    }
  }

  /**
   * Get total volume
   */
  async getTotalVolume(): Promise<string> {
    try {
      if (lineraAdapter.isApplicationConnected()) {
        const result = await lineraAdapter.query<{ totalVolume: string }>(GET_TOTAL_VOLUME);
        return result.totalVolume || '0';
      }
      return '0';
    } catch (error) {
      console.error('Failed to get total volume:', error);
      return '0';
    }
  }

  // =========================================================================
  // MARKET OPERATIONS (MUTATIONS)
  // =========================================================================

  /**
   * Create a new market
   * endTime should be in microseconds (Linera Timestamp)
   */
  async createMarket(params: {
    question: string;
    categories: string[];
    endTime: number;
    initialLiquidity: string;
  }): Promise<{ success: boolean; marketId?: number; error?: string }> {
    try {
      console.log('📝 Creating market:', params.question);
      
      const result = await lineraAdapter.mutate<{ createMarket: number }>(
        CREATE_MARKET,
        {
          question: params.question,
          categories: params.categories,
          endTime: params.endTime.toString(), // Convert to string for large microsecond values
          initialLiquidity: params.initialLiquidity,
        }
      );
      
      console.log('✅ Market created:', result.createMarket);
      return { success: true, marketId: result.createMarket };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to create market:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Buy shares in a market
   */
  async buyShares(params: {
    marketId: number;
    isYes: boolean;
    shares: string;
    maxCost: string;
  }): Promise<{ success: boolean; shares?: string; error?: string }> {
    try {
      console.log('💰 Buying shares:', params);
      
      const result = await lineraAdapter.mutate<{ buyShares: string }>(
        BUY_SHARES,
        params
      );
      
      console.log('✅ Shares purchased:', result.buyShares);
      return { success: true, shares: result.buyShares };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to buy shares:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Sell shares in a market
   */
  async sellShares(params: {
    marketId: number;
    isYes: boolean;
    shares: string;
    minReturn: string;
  }): Promise<{ success: boolean; returnAmount?: string; error?: string }> {
    try {
      console.log('💸 Selling shares:', params);
      
      const result = await lineraAdapter.mutate<{ sellShares: string }>(
        SELL_SHARES,
        params
      );
      
      console.log('✅ Shares sold:', result.sellShares);
      return { success: true, returnAmount: result.sellShares };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to sell shares:', message);
      return { success: false, error: message };
    }
  }

  // =========================================================================
  // LIMIT ORDERS (NEW FEATURE)
  // =========================================================================

  /**
   * Place a limit order
   */
  async placeLimitOrder(params: {
    marketId: number;
    isYes: boolean;
    isBuy: boolean;
    shares: string;
    priceLimit: string;
    expiresAt?: number;
  }): Promise<{ success: boolean; orderId?: number; error?: string }> {
    try {
      console.log('📋 Placing limit order:', params);
      
      const result = await lineraAdapter.mutate<{ placeLimitOrder: number }>(
        PLACE_LIMIT_ORDER,
        params
      );
      
      console.log('✅ Limit order placed:', result.placeLimitOrder);
      return { success: true, orderId: result.placeLimitOrder };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to place limit order:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Cancel a limit order
   */
  async cancelLimitOrder(orderId: number): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('❌ Cancelling order:', orderId);
      
      await lineraAdapter.mutate<{ cancelLimitOrder: boolean }>(
        CANCEL_LIMIT_ORDER,
        { orderId }
      );
      
      console.log('✅ Order cancelled');
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to cancel order:', message);
      return { success: false, error: message };
    }
  }

  // =========================================================================
  // MARKET RESOLUTION
  // =========================================================================

  /**
   * Resolve a market (creator only)
   */
  async resolveMarket(params: {
    marketId: number;
    outcome: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('⚖️ Resolving market:', params);
      
      await lineraAdapter.mutate<{ resolveMarket: boolean }>(
        RESOLVE_MARKET,
        params
      );
      
      console.log('✅ Market resolved');
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to resolve market:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Claim winnings from a resolved market
   */
  async claimWinnings(marketId: number): Promise<{ success: boolean; amount?: string; error?: string }> {
    try {
      console.log('🎉 Claiming winnings for market:', marketId);
      
      const result = await lineraAdapter.mutate<{ claimWinnings: string }>(
        CLAIM_WINNINGS,
        { marketId }
      );
      
      console.log('✅ Winnings claimed:', result.claimWinnings);
      return { success: true, amount: result.claimWinnings };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to claim winnings:', message);
      return { success: false, error: message };
    }
  }

  // =========================================================================
  // COMBO/PARLAY BETS (NEW FEATURE)
  // =========================================================================

  /**
   * Place a combo bet
   */
  async placeComboBet(params: {
    marketIds: number[];
    outcomes: boolean[];
    amount: string;
  }): Promise<{ success: boolean; betId?: number; potentialPayout?: string; error?: string }> {
    try {
      console.log('🎲 Placing combo bet:', params);
      
      const result = await lineraAdapter.mutate<{ placeComboBet: { id: number; potentialPayout: string } }>(
        PLACE_COMBO_BET,
        params
      );
      
      console.log('✅ Combo bet placed:', result.placeComboBet);
      return { 
        success: true, 
        betId: result.placeComboBet.id,
        potentialPayout: result.placeComboBet.potentialPayout 
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to place combo bet:', message);
      return { success: false, error: message };
    }
  }

  // =========================================================================
  // ANALYTICS & LEADERBOARD
  // =========================================================================

  /**
   * Get leaderboard
   */
  async getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    try {
      // Prefer backend for global leaderboard
      const backendResult = await fetchFromBackend<LeaderboardResponse>(`/api/leaderboard?limit=${limit}`);
      if (backendResult?.leaderboard) {
        return backendResult.leaderboard;
      }
      
      if (lineraAdapter.isApplicationConnected()) {
        const result = await lineraAdapter.query<LeaderboardResponse>(GET_LEADERBOARD, { limit });
        return result.leaderboard || [];
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      return [];
    }
  }

  /**
   * Get user stats
   */
  async getUserStats(wallet: string): Promise<UserStats | null> {
    try {
      if (lineraAdapter.isApplicationConnected()) {
        const result = await lineraAdapter.query<UserStatsResponse>(GET_USER_STATS, { wallet });
        return result.userStats || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get user stats:', error);
      return null;
    }
  }

  /**
   * Get trade history for a market
   */
  async getTradeHistory(marketId: number, limit: number = 50): Promise<Trade[]> {
    try {
      if (lineraAdapter.isApplicationConnected()) {
        const result = await lineraAdapter.query<TradeHistoryResponse>(GET_TRADE_HISTORY, { marketId, limit });
        return result.tradeHistory || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get trade history:', error);
      return [];
    }
  }

  // =========================================================================
  // SOCIAL FEED (NEW FEATURE)
  // =========================================================================

  /**
   * Get social feed
   */
  async getSocialFeed(limit: number = 50): Promise<FeedItem[]> {
    try {
      // Prefer backend for aggregated feed
      const backendResult = await fetchFromBackend<SocialFeedResponse>(`/api/feed?limit=${limit}`);
      if (backendResult?.socialFeed) {
        return backendResult.socialFeed;
      }
      
      if (lineraAdapter.isApplicationConnected()) {
        const result = await lineraAdapter.query<SocialFeedResponse>(GET_SOCIAL_FEED, { limit });
        return result.socialFeed || [];
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get social feed:', error);
      return [];
    }
  }

  /**
   * Post a comment
   */
  async postComment(marketId: number, content: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('💬 Posting comment:', { marketId, content });
      
      await lineraAdapter.mutate<{ postComment: boolean }>(
        POST_COMMENT,
        { marketId, content }
      );
      
      console.log('✅ Comment posted');
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to post comment:', message);
      return { success: false, error: message };
    }
  }

  // =========================================================================
  // AI TRADING AGENTS (NEW FEATURE)
  // =========================================================================

  /**
   * Get all trading agents
   */
  async getAgents(): Promise<TradingAgent[]> {
    try {
      if (lineraAdapter.isApplicationConnected()) {
        const result = await lineraAdapter.query<AgentsResponse>(GET_AGENTS);
        return result.agents || [];
      }
      
      const backendResult = await fetchFromBackend<AgentsResponse>('/api/agents');
      return backendResult?.agents || [];
    } catch (error) {
      console.error('Failed to get agents:', error);
      return [];
    }
  }

  /**
   * Follow a trading agent (copy trading)
   */
  async followAgent(agentId: number, amount: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🤖 Following agent:', { agentId, amount });
      
      await lineraAdapter.mutate<{ followAgent: boolean }>(
        FOLLOW_AGENT,
        { agentId, amount }
      );
      
      console.log('✅ Now following agent');
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to follow agent:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Create a trading agent
   */
  async createAgent(params: {
    name: string;
    strategy: string;
    config: string;
  }): Promise<{ success: boolean; agentId?: number; error?: string }> {
    try {
      console.log('🤖 Creating agent:', params.name);
      
      const result = await lineraAdapter.mutate<{ createAgent: number }>(
        CREATE_AGENT,
        params
      );
      
      console.log('✅ Agent created:', result.createAgent);
      return { success: true, agentId: result.createAgent };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to create agent:', message);
      return { success: false, error: message };
    }
  }

  // =========================================================================
  // LIQUIDITY OPERATIONS
  // =========================================================================

  /**
   * Add liquidity to a market
   */
  async addLiquidity(marketId: number, amount: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('💧 Adding liquidity:', { marketId, amount });
      
      await lineraAdapter.mutate<{ addLiquidity: boolean }>(
        ADD_LIQUIDITY,
        { marketId, amount }
      );
      
      console.log('✅ Liquidity added');
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to add liquidity:', message);
      return { success: false, error: message };
    }
  }
}

// Export singleton instance
export const chronosApi = new ChronosApiClass();

// Also export the class
export { ChronosApiClass };
