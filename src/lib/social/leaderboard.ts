/**
 * Leaderboard Service
 * 
 * Manages leaderboard data with caching for performance.
 */

import { chronosApi } from '../chronos';
import type { LeaderboardEntry } from '../chronos/types';

// Storage keys
const LEADERBOARD_CACHE_KEY = 'chronos_leaderboard_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Types
export interface CachedLeaderboard {
  data: LeaderboardEntry[];
  cachedAt: number;
  period: LeaderboardPeriod;
}

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'allTime';

export interface LeaderboardStats {
  totalParticipants: number;
  totalVolume: string;
  topTraderPnL: string;
  avgWinRate: number;
}

/**
 * Leaderboard Manager with caching
 */
class LeaderboardManager {
  private static instance: LeaderboardManager;
  
  private cache: Map<LeaderboardPeriod, CachedLeaderboard> = new Map();
  private listeners: Set<() => void> = new Set();
  private refreshPromise: Promise<LeaderboardEntry[]> | null = null;
  
  private constructor() {
    this.loadFromStorage();
  }
  
  static getInstance(): LeaderboardManager {
    if (!LeaderboardManager.instance) {
      LeaderboardManager.instance = new LeaderboardManager();
    }
    return LeaderboardManager.instance;
  }
  
  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    try {
      const cached = localStorage.getItem(LEADERBOARD_CACHE_KEY);
      if (cached) {
        const data: CachedLeaderboard[] = JSON.parse(cached);
        for (const item of data) {
          // Only use cache if not expired
          if (Date.now() - item.cachedAt < CACHE_DURATION) {
            this.cache.set(item.period, item);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load leaderboard cache:', error);
    }
  }
  
  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = Array.from(this.cache.values());
      localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save leaderboard cache:', error);
    }
  }
  
  /**
   * Get leaderboard with caching
   */
  async getLeaderboard(
    period: LeaderboardPeriod = 'allTime',
    forceRefresh: boolean = false
  ): Promise<LeaderboardEntry[]> {
    // Check cache
    const cached = this.cache.get(period);
    if (!forceRefresh && cached && Date.now() - cached.cachedAt < CACHE_DURATION) {
      console.log(`📊 Using cached leaderboard (${period})`);
      return cached.data;
    }
    
    // Prevent concurrent fetches
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    // Fetch from blockchain
    this.refreshPromise = this.fetchLeaderboard(period);
    
    try {
      const data = await this.refreshPromise;
      
      // Update cache
      this.cache.set(period, {
        data,
        cachedAt: Date.now(),
        period,
      });
      this.saveToStorage();
      this.notifyListeners();
      
      return data;
    } finally {
      this.refreshPromise = null;
    }
  }
  
  /**
   * Fetch leaderboard from blockchain
   */
  private async fetchLeaderboard(period: LeaderboardPeriod): Promise<LeaderboardEntry[]> {
    try {
      console.log(`📊 Fetching leaderboard (${period})...`);
      
      // Note: chronosApi.getLeaderboard takes a limit, not a period
      // In a real implementation, period filtering would be done server-side
      const leaderboard = await chronosApi.getLeaderboard(100);
      
      console.log(`📊 Fetched ${leaderboard.length} leaderboard entries`);
      return leaderboard;
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      
      // Return cached data if available
      const cached = this.cache.get(period);
      if (cached) {
        return cached.data;
      }
      
      return [];
    }
  }
  
  /**
   * Get leaderboard stats
   */
  async getStats(period: LeaderboardPeriod = 'allTime'): Promise<LeaderboardStats> {
    const leaderboard = await this.getLeaderboard(period);
    
    if (leaderboard.length === 0) {
      return {
        totalParticipants: 0,
        totalVolume: '0',
        topTraderPnL: '0',
        avgWinRate: 0,
      };
    }
    
    const totalVolume = leaderboard.reduce(
      (sum, e) => sum + parseFloat(e.totalVolume || '0'),
      0
    );
    
    const avgWinRate = leaderboard.reduce(
      (sum, e) => sum + (e.winRate || 0),
      0
    ) / leaderboard.length;
    
    return {
      totalParticipants: leaderboard.length,
      totalVolume: totalVolume.toFixed(2),
      topTraderPnL: leaderboard[0]?.profitLoss || '0',
      avgWinRate,
    };
  }
  
  /**
   * Get user rank
   */
  async getUserRank(address: string, period: LeaderboardPeriod = 'allTime'): Promise<number | null> {
    const leaderboard = await this.getLeaderboard(period);
    const index = leaderboard.findIndex(e => e.wallet.toLowerCase() === address.toLowerCase());
    return index >= 0 ? index + 1 : null;
  }
  
  /**
   * Get top traders
   */
  async getTopTraders(limit: number = 10, period: LeaderboardPeriod = 'allTime'): Promise<LeaderboardEntry[]> {
    const leaderboard = await this.getLeaderboard(period);
    return leaderboard.slice(0, limit);
  }
  
  /**
   * Force refresh all periods
   */
  async refreshAll(): Promise<void> {
    const periods: LeaderboardPeriod[] = ['daily', 'weekly', 'monthly', 'allTime'];
    await Promise.all(periods.map(p => this.getLeaderboard(p, true)));
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    localStorage.removeItem(LEADERBOARD_CACHE_KEY);
    this.notifyListeners();
  }
  
  /**
   * Check if data is stale
   */
  isStale(period: LeaderboardPeriod): boolean {
    const cached = this.cache.get(period);
    if (!cached) return true;
    return Date.now() - cached.cachedAt > CACHE_DURATION;
  }
  
  /**
   * Get cache timestamp
   */
  getCacheTimestamp(period: LeaderboardPeriod): number | null {
    return this.cache.get(period)?.cachedAt || null;
  }
  
  /**
   * Subscribe to changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(l => l());
  }
}

// Export singleton
export const leaderboard = LeaderboardManager.getInstance();

// Convenience exports
export function getLeaderboard(period?: LeaderboardPeriod, forceRefresh?: boolean): Promise<LeaderboardEntry[]> {
  return leaderboard.getLeaderboard(period, forceRefresh);
}

export function getTopTraders(limit?: number, period?: LeaderboardPeriod): Promise<LeaderboardEntry[]> {
  return leaderboard.getTopTraders(limit, period);
}

export function getUserRank(address: string, period?: LeaderboardPeriod): Promise<number | null> {
  return leaderboard.getUserRank(address, period);
}

export function getLeaderboardStats(period?: LeaderboardPeriod): Promise<LeaderboardStats> {
  return leaderboard.getStats(period);
}
