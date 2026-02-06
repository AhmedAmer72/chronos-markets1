/**
 * Watchlist/Favorites Service
 * 
 * Allows users to save favorite markets for quick access.
 * Persists to localStorage.
 */

// Types
export interface WatchlistItem {
  marketId: string;
  addedAt: number;
  notes?: string;
}

// Storage key
const WATCHLIST_STORAGE_KEY = 'chronos_watchlist';

/**
 * Watchlist Manager
 */
class WatchlistManager {
  private static instance: WatchlistManager;
  
  private watchlist: Map<string, WatchlistItem> = new Map();
  private listeners: Set<() => void> = new Set();
  
  private constructor() {
    this.loadWatchlist();
  }
  
  static getInstance(): WatchlistManager {
    if (!WatchlistManager.instance) {
      WatchlistManager.instance = new WatchlistManager();
    }
    return WatchlistManager.instance;
  }
  
  /**
   * Load watchlist from localStorage
   */
  private loadWatchlist(): void {
    try {
      const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (stored) {
        const items: WatchlistItem[] = JSON.parse(stored);
        items.forEach(item => {
          this.watchlist.set(item.marketId, item);
        });
        console.log(`⭐ Loaded ${items.length} watchlist items`);
      }
    } catch (error) {
      console.error('Failed to load watchlist:', error);
    }
  }
  
  /**
   * Save watchlist to localStorage
   */
  private saveWatchlist(): void {
    try {
      const items = Array.from(this.watchlist.values());
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(items));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save watchlist:', error);
    }
  }
  
  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
  
  /**
   * Add a market to watchlist
   */
  addToWatchlist(marketId: string, notes?: string): WatchlistItem {
    const item: WatchlistItem = {
      marketId,
      addedAt: Date.now(),
      notes,
    };
    
    this.watchlist.set(marketId, item);
    this.saveWatchlist();
    
    console.log(`⭐ Added market ${marketId} to watchlist`);
    return item;
  }
  
  /**
   * Remove a market from watchlist
   */
  removeFromWatchlist(marketId: string): boolean {
    const existed = this.watchlist.has(marketId);
    this.watchlist.delete(marketId);
    this.saveWatchlist();
    
    if (existed) {
      console.log(`⭐ Removed market ${marketId} from watchlist`);
    }
    return existed;
  }
  
  /**
   * Toggle a market in watchlist
   */
  toggleWatchlist(marketId: string, notes?: string): boolean {
    if (this.isInWatchlist(marketId)) {
      this.removeFromWatchlist(marketId);
      return false;
    } else {
      this.addToWatchlist(marketId, notes);
      return true;
    }
  }
  
  /**
   * Check if a market is in watchlist
   */
  isInWatchlist(marketId: string): boolean {
    return this.watchlist.has(marketId);
  }
  
  /**
   * Get all watchlist items
   */
  getWatchlist(): WatchlistItem[] {
    return Array.from(this.watchlist.values())
      .sort((a, b) => b.addedAt - a.addedAt); // Most recent first
  }
  
  /**
   * Get watchlist market IDs
   */
  getWatchlistIds(): string[] {
    return Array.from(this.watchlist.keys());
  }
  
  /**
   * Update notes for a watchlist item
   */
  updateNotes(marketId: string, notes: string): boolean {
    const item = this.watchlist.get(marketId);
    if (!item) return false;
    
    item.notes = notes;
    this.watchlist.set(marketId, item);
    this.saveWatchlist();
    return true;
  }
  
  /**
   * Get watchlist item
   */
  getItem(marketId: string): WatchlistItem | undefined {
    return this.watchlist.get(marketId);
  }
  
  /**
   * Clear entire watchlist
   */
  clearWatchlist(): void {
    this.watchlist.clear();
    this.saveWatchlist();
    console.log('⭐ Cleared watchlist');
  }
  
  /**
   * Get watchlist count
   */
  getCount(): number {
    return this.watchlist.size;
  }
  
  /**
   * Subscribe to watchlist changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

// Export singleton
export const watchlist = WatchlistManager.getInstance();

// Export convenience functions
export function addToWatchlist(marketId: string, notes?: string): WatchlistItem {
  return watchlist.addToWatchlist(marketId, notes);
}

export function removeFromWatchlist(marketId: string): boolean {
  return watchlist.removeFromWatchlist(marketId);
}

export function toggleWatchlist(marketId: string, notes?: string): boolean {
  return watchlist.toggleWatchlist(marketId, notes);
}

export function isInWatchlist(marketId: string): boolean {
  return watchlist.isInWatchlist(marketId);
}

export function getWatchlist(): WatchlistItem[] {
  return watchlist.getWatchlist();
}

export function getWatchlistIds(): string[] {
  return watchlist.getWatchlistIds();
}

export function subscribeToWatchlist(listener: () => void): () => void {
  return watchlist.subscribe(listener);
}
