/**
 * User Profiles Service
 * 
 * Manages user profile data, trading stats, and follow relationships.
 */

import { lineraAdapter } from '../linera';
import { chronosApi } from '../chronos';
import { portfolioAnalytics } from '../portfolio';

// Storage keys
const PROFILE_STORAGE_KEY = 'chronos_user_profile';
const FOLLOWING_STORAGE_KEY = 'chronos_following';

// Types
export interface UserProfile {
  address: string;
  displayName: string;
  bio: string;
  avatar: string;
  joinedAt: number;
  socialLinks: {
    twitter?: string;
    discord?: string;
    telegram?: string;
  };
  settings: {
    isPublic: boolean;
    showTrades: boolean;
    showPositions: boolean;
    showPnL: boolean;
  };
}

export interface TradingStats {
  totalTrades: number;
  winRate: number;
  totalVolume: number;
  totalPnL: number;
  bestWin: number;
  worstLoss: number;
  avgTradeSize: number;
  marketsTraded: number;
  activePositions: number;
  rank?: number;
}

export interface PublicProfile {
  address: string;
  displayName: string;
  bio: string;
  avatar: string;
  joinedAt: number;
  stats: TradingStats;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

/**
 * User Profile Manager
 */
class UserProfileManager {
  private static instance: UserProfileManager;
  
  private currentProfile: UserProfile | null = null;
  private following: Set<string> = new Set();
  private listeners: Set<() => void> = new Set();
  
  private constructor() {
    this.loadFromStorage();
  }
  
  static getInstance(): UserProfileManager {
    if (!UserProfileManager.instance) {
      UserProfileManager.instance = new UserProfileManager();
    }
    return UserProfileManager.instance;
  }
  
  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      const profile = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (profile) {
        this.currentProfile = JSON.parse(profile);
      }
      
      const following = localStorage.getItem(FOLLOWING_STORAGE_KEY);
      if (following) {
        this.following = new Set(JSON.parse(following));
      }
    } catch (error) {
      console.error('Failed to load profile data:', error);
    }
  }
  
  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    try {
      if (this.currentProfile) {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(this.currentProfile));
      }
      localStorage.setItem(FOLLOWING_STORAGE_KEY, JSON.stringify([...this.following]));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save profile data:', error);
    }
  }
  
  /**
   * Notify listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(l => l());
  }
  
  /**
   * Get current user profile
   */
  getCurrentProfile(): UserProfile | null {
    return this.currentProfile;
  }
  
  /**
   * Initialize or get profile for connected wallet
   */
  initializeProfile(address: string): UserProfile {
    if (this.currentProfile && this.currentProfile.address === address) {
      return this.currentProfile;
    }
    
    // Create default profile
    this.currentProfile = {
      address,
      displayName: `Trader ${address.slice(0, 6)}`,
      bio: '',
      avatar: this.generateAvatar(address),
      joinedAt: Date.now(),
      socialLinks: {},
      settings: {
        isPublic: true,
        showTrades: true,
        showPositions: false,
        showPnL: true,
      },
    };
    
    this.saveToStorage();
    return this.currentProfile;
  }
  
  /**
   * Generate avatar URL from address
   */
  private generateAvatar(address: string): string {
    // Use a deterministic avatar service
    return `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`;
  }
  
  /**
   * Update profile
   */
  updateProfile(updates: Partial<Omit<UserProfile, 'address' | 'joinedAt'>>): UserProfile | null {
    if (!this.currentProfile) return null;
    
    this.currentProfile = {
      ...this.currentProfile,
      ...updates,
      settings: {
        ...this.currentProfile.settings,
        ...(updates.settings || {}),
      },
      socialLinks: {
        ...this.currentProfile.socialLinks,
        ...(updates.socialLinks || {}),
      },
    };
    
    this.saveToStorage();
    return this.currentProfile;
  }
  
  /**
   * Get trading stats for current user
   */
  async getTradingStats(): Promise<TradingStats> {
    const summary = await portfolioAnalytics.getPortfolioSummary();
    
    return {
      totalTrades: summary.stats.totalTrades,
      winRate: summary.stats.winRate,
      totalVolume: summary.tradeHistory.reduce((sum, t) => sum + t.cost, 0),
      totalPnL: summary.balance.realizedPnL + summary.balance.unrealizedPnL,
      bestWin: summary.stats.bestTrade?.cost || 0,
      worstLoss: summary.stats.worstTrade?.cost || 0,
      avgTradeSize: summary.stats.avgTradeSize,
      marketsTraded: new Set(summary.tradeHistory.map(t => t.marketId)).size,
      activePositions: summary.positions.length,
    };
  }
  
  /**
   * Get public profile for an address
   */
  async getPublicProfile(address: string): Promise<PublicProfile | null> {
    try {
      // If it's current user, return their profile
      if (this.currentProfile?.address === address) {
        const stats = await this.getTradingStats();
        return {
          address,
          displayName: this.currentProfile.displayName,
          bio: this.currentProfile.bio,
          avatar: this.currentProfile.avatar,
          joinedAt: this.currentProfile.joinedAt,
          stats,
          isFollowing: false,
          followerCount: 0, // Would come from blockchain
          followingCount: this.following.size,
        };
      }
      
      // Fetch from blockchain if available
      if (lineraAdapter.isApplicationConnected()) {
        const userStats = await chronosApi.getUserStats(address);
        
        return {
          address,
          displayName: `Trader ${address.slice(0, 6)}`,
          bio: '',
          avatar: this.generateAvatar(address),
          joinedAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // Mock
          stats: {
            totalTrades: userStats?.tradesCount || 0,
            winRate: userStats?.winRate || 0,
            totalVolume: parseFloat(userStats?.totalVolume || '0'),
            totalPnL: parseFloat(userStats?.profitLoss || '0'),
            bestWin: 0,
            worstLoss: 0,
            avgTradeSize: 0,
            marketsTraded: userStats?.marketsCreated || 0,
            activePositions: 0,
          },
          isFollowing: this.isFollowing(address),
          followerCount: 0,
          followingCount: 0,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get public profile:', error);
      return null;
    }
  }
  
  /**
   * Follow a user
   */
  async followUser(address: string): Promise<boolean> {
    this.following.add(address);
    this.saveToStorage();
    
    // Note: On-chain following would be implemented here when the API supports it
    console.log(`👥 Following user: ${address}`);
    
    return true;
  }
  
  /**
   * Unfollow a user
   */
  async unfollowUser(address: string): Promise<boolean> {
    this.following.delete(address);
    this.saveToStorage();
    
    // Note: On-chain unfollowing would be implemented here when the API supports it
    console.log(`👥 Unfollowed user: ${address}`);
    
    return true;
  }
  
  /**
   * Check if following a user
   */
  isFollowing(address: string): boolean {
    return this.following.has(address);
  }
  
  /**
   * Get list of followed addresses
   */
  getFollowing(): string[] {
    return [...this.following];
  }
  
  /**
   * Subscribe to changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

// Export singleton
export const userProfiles = UserProfileManager.getInstance();

// Convenience exports
export function getCurrentProfile(): UserProfile | null {
  return userProfiles.getCurrentProfile();
}

export function initializeProfile(address: string): UserProfile {
  return userProfiles.initializeProfile(address);
}

export function updateProfile(updates: Partial<Omit<UserProfile, 'address' | 'joinedAt'>>): UserProfile | null {
  return userProfiles.updateProfile(updates);
}

export function followUser(address: string): Promise<boolean> {
  return userProfiles.followUser(address);
}

export function unfollowUser(address: string): Promise<boolean> {
  return userProfiles.unfollowUser(address);
}

export function isFollowing(address: string): boolean {
  return userProfiles.isFollowing(address);
}
