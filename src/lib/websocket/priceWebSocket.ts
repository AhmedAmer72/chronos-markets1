/**
 * Price WebSocket Service - Real-time price updates
 * 
 * Provides WebSocket subscriptions for live market price changes.
 * Falls back to polling when WebSocket is unavailable.
 */

import { lineraAdapter } from '../linera';

// Types
export interface PriceUpdate {
  marketId: number;
  yesPrice: number;
  noPrice: number;
  volume: string;
  timestamp: number;
}

export interface MarketUpdate {
  type: 'price' | 'trade' | 'resolution' | 'new_market';
  data: PriceUpdate | TradeUpdate | ResolutionUpdate | NewMarketUpdate;
}

export interface TradeUpdate {
  marketId: number;
  trader: string;
  isYes: boolean;
  shares: string;
  cost: string;
  timestamp: number;
}

export interface ResolutionUpdate {
  marketId: number;
  outcome: boolean;
  timestamp: number;
}

export interface NewMarketUpdate {
  marketId: number;
  question: string;
  creator: string;
  timestamp: number;
}

type PriceCallback = (update: PriceUpdate) => void;
type MarketCallback = (update: MarketUpdate) => void;

/**
 * Price WebSocket Manager
 * Singleton managing all WebSocket connections for price updates
 */
class PriceWebSocketManager {
  private static instance: PriceWebSocketManager;
  
  // Subscription management
  private priceSubscribers: Map<number, Set<PriceCallback>> = new Map();
  private globalSubscribers: Set<MarketCallback> = new Set();
  
  // Polling fallback
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastPrices: Map<number, PriceUpdate> = new Map();
  private isPolling = false;
  
  // Configuration
  private readonly POLL_INTERVAL = 3000; // 3 seconds
  private readonly RECONNECT_DELAY = 5000;
  
  private constructor() {
    // Start polling immediately (WebSocket can be added later)
    this.startPolling();
  }
  
  static getInstance(): PriceWebSocketManager {
    if (!PriceWebSocketManager.instance) {
      PriceWebSocketManager.instance = new PriceWebSocketManager();
    }
    return PriceWebSocketManager.instance;
  }
  
  /**
   * Subscribe to price updates for a specific market
   */
  subscribeToMarket(marketId: number, callback: PriceCallback): () => void {
    if (!this.priceSubscribers.has(marketId)) {
      this.priceSubscribers.set(marketId, new Set());
    }
    this.priceSubscribers.get(marketId)!.add(callback);
    
    // Immediately send last known price if available
    const lastPrice = this.lastPrices.get(marketId);
    if (lastPrice) {
      callback(lastPrice);
    }
    
    // Return unsubscribe function
    return () => {
      const subscribers = this.priceSubscribers.get(marketId);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.priceSubscribers.delete(marketId);
        }
      }
    };
  }
  
  /**
   * Subscribe to all market updates (trades, new markets, resolutions)
   */
  subscribeToAll(callback: MarketCallback): () => void {
    this.globalSubscribers.add(callback);
    
    return () => {
      this.globalSubscribers.delete(callback);
    };
  }
  
  /**
   * Start polling for price updates
   */
  private startPolling(): void {
    if (this.isPolling) return;
    
    this.isPolling = true;
    console.log('📡 Starting price polling...');
    
    this.pollingInterval = setInterval(async () => {
      await this.pollPrices();
    }, this.POLL_INTERVAL);
    
    // Initial poll
    this.pollPrices();
  }
  
  /**
   * Stop polling
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    console.log('📡 Stopped price polling');
  }
  
  /**
   * Poll prices from blockchain
   */
  private async pollPrices(): Promise<void> {
    if (!lineraAdapter.isApplicationConnected()) {
      return;
    }
    
    try {
      // Get all markets we're subscribed to
      const subscribedMarketIds = Array.from(this.priceSubscribers.keys());
      
      if (subscribedMarketIds.length === 0 && this.globalSubscribers.size === 0) {
        return;
      }
      
      // Fetch current prices from blockchain
      const { chronosApi } = await import('../chronos');
      const markets = await chronosApi.getMarkets();
      
      for (const market of markets) {
        const priceUpdate: PriceUpdate = {
          marketId: market.id,
          yesPrice: market.yesPrice,
          noPrice: market.noPrice,
          volume: market.volume,
          timestamp: Date.now(),
        };
        
        // Check if price changed
        const lastPrice = this.lastPrices.get(market.id);
        const priceChanged = !lastPrice || 
          lastPrice.yesPrice !== priceUpdate.yesPrice ||
          lastPrice.volume !== priceUpdate.volume;
        
        if (priceChanged) {
          this.lastPrices.set(market.id, priceUpdate);
          
          // Notify market-specific subscribers
          const subscribers = this.priceSubscribers.get(market.id);
          if (subscribers) {
            subscribers.forEach(callback => callback(priceUpdate));
          }
          
          // Notify global subscribers
          this.globalSubscribers.forEach(callback => {
            callback({ type: 'price', data: priceUpdate });
          });
        }
      }
    } catch (error) {
      console.error('Failed to poll prices:', error);
    }
  }
  
  /**
   * Manually trigger a price refresh
   */
  async refresh(): Promise<void> {
    await this.pollPrices();
  }
  
  /**
   * Get last known price for a market
   */
  getLastPrice(marketId: number): PriceUpdate | undefined {
    return this.lastPrices.get(marketId);
  }
  
  /**
   * Emit a market update (for local updates after transactions)
   */
  emitUpdate(update: MarketUpdate): void {
    if (update.type === 'price') {
      const priceUpdate = update.data as PriceUpdate;
      this.lastPrices.set(priceUpdate.marketId, priceUpdate);
      
      const subscribers = this.priceSubscribers.get(priceUpdate.marketId);
      if (subscribers) {
        subscribers.forEach(callback => callback(priceUpdate));
      }
    }
    
    this.globalSubscribers.forEach(callback => callback(update));
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    this.stopPolling();
    this.priceSubscribers.clear();
    this.globalSubscribers.clear();
    this.lastPrices.clear();
  }
}

// Export singleton instance
export const priceWebSocket = PriceWebSocketManager.getInstance();

// Export hook-friendly functions
export function subscribeToPrices(marketId: number, callback: PriceCallback): () => void {
  return priceWebSocket.subscribeToMarket(marketId, callback);
}

export function subscribeToAllUpdates(callback: MarketCallback): () => void {
  return priceWebSocket.subscribeToAll(callback);
}

export function refreshPrices(): Promise<void> {
  return priceWebSocket.refresh();
}
