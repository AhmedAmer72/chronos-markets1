/**
 * Copy Trading Service
 * 
 * Follow and copy trades from top traders.
 */

import { chronosApi } from '../chronos';
import { notifications } from './notifications';
import { portfolioAnalytics } from '../portfolio';

// Storage key
const COPY_TRADING_KEY = 'chronos_copy_trading';

// Types
export interface CopyTradingConfig {
  traderId: string;
  traderName: string;
  enabled: boolean;
  allocation: number; // Percentage of portfolio (0-100)
  maxTradeSize: number; // Maximum amount per trade
  copyBuys: boolean;
  copySells: boolean;
  markets: 'all' | string[]; // Copy all markets or specific ones
  createdAt: number;
}

export interface CopyTrade {
  id: string;
  originalTradeId: string;
  traderId: string;
  marketId: number;
  marketQuestion: string;
  type: 'buy' | 'sell';
  isYes: boolean;
  originalShares: number;
  copiedShares: number;
  price: number;
  status: 'pending' | 'executed' | 'failed';
  error?: string;
  timestamp: number;
}

/**
 * Copy Trading Manager
 */
class CopyTradingManager {
  private static instance: CopyTradingManager;
  
  private configs: Map<string, CopyTradingConfig> = new Map();
  private tradeHistory: CopyTrade[] = [];
  private listeners: Set<() => void> = new Set();
  
  private constructor() {
    this.loadFromStorage();
  }
  
  static getInstance(): CopyTradingManager {
    if (!CopyTradingManager.instance) {
      CopyTradingManager.instance = new CopyTradingManager();
    }
    return CopyTradingManager.instance;
  }
  
  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(COPY_TRADING_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.configs) {
          for (const config of data.configs) {
            this.configs.set(config.traderId, config);
          }
        }
        this.tradeHistory = data.tradeHistory || [];
      }
    } catch (error) {
      console.error('Failed to load copy trading data:', error);
    }
  }
  
  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(COPY_TRADING_KEY, JSON.stringify({
        configs: Array.from(this.configs.values()),
        tradeHistory: this.tradeHistory,
      }));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save copy trading data:', error);
    }
  }
  
  /**
   * Start copying a trader
   */
  startCopying(config: Omit<CopyTradingConfig, 'createdAt'>): CopyTradingConfig {
    const fullConfig: CopyTradingConfig = {
      ...config,
      createdAt: Date.now(),
    };
    
    this.configs.set(config.traderId, fullConfig);
    this.saveToStorage();
    
    console.log(`📋 Started copying trader: ${config.traderName}`);
    
    return fullConfig;
  }
  
  /**
   * Stop copying a trader
   */
  stopCopying(traderId: string): boolean {
    const existed = this.configs.has(traderId);
    this.configs.delete(traderId);
    this.saveToStorage();
    
    if (existed) {
      console.log(`📋 Stopped copying trader: ${traderId}`);
    }
    
    return existed;
  }
  
  /**
   * Update copy config
   */
  updateConfig(traderId: string, updates: Partial<CopyTradingConfig>): CopyTradingConfig | null {
    const config = this.configs.get(traderId);
    if (!config) return null;
    
    const updated = { ...config, ...updates };
    this.configs.set(traderId, updated);
    this.saveToStorage();
    
    return updated;
  }
  
  /**
   * Toggle copy trading for a trader
   */
  toggleEnabled(traderId: string): boolean {
    const config = this.configs.get(traderId);
    if (!config) return false;
    
    config.enabled = !config.enabled;
    this.configs.set(traderId, config);
    this.saveToStorage();
    
    return config.enabled;
  }
  
  /**
   * Get all copy configs
   */
  getConfigs(): CopyTradingConfig[] {
    return Array.from(this.configs.values());
  }
  
  /**
   * Get config for a specific trader
   */
  getConfig(traderId: string): CopyTradingConfig | undefined {
    return this.configs.get(traderId);
  }
  
  /**
   * Check if copying a trader
   */
  isCopying(traderId: string): boolean {
    const config = this.configs.get(traderId);
    return config?.enabled ?? false;
  }
  
  /**
   * Process a trade from a copied trader
   * Called when we detect a trade from someone we're copying
   */
  async processTrade(
    traderId: string,
    trade: {
      id: string;
      marketId: number;
      marketQuestion: string;
      type: 'buy' | 'sell';
      isYes: boolean;
      shares: number;
      price: number;
    }
  ): Promise<CopyTrade | null> {
    const config = this.configs.get(traderId);
    if (!config || !config.enabled) return null;
    
    // Check if we should copy this trade type
    if (trade.type === 'buy' && !config.copyBuys) return null;
    if (trade.type === 'sell' && !config.copySells) return null;
    
    // Check if we should copy this market
    if (config.markets !== 'all' && !config.markets.includes(String(trade.marketId))) {
      return null;
    }
    
    // Calculate copy size based on allocation
    const summary = await portfolioAnalytics.getPortfolioSummary();
    const availableBalance = summary.balance.available;
    const allocationAmount = availableBalance * (config.allocation / 100);
    const tradeAmount = Math.min(
      trade.shares * trade.price,
      allocationAmount,
      config.maxTradeSize
    );
    const copiedShares = Math.floor(tradeAmount / trade.price);
    
    if (copiedShares <= 0) {
      console.log(`📋 Skipping copy trade: insufficient allocation`);
      return null;
    }
    
    // Create copy trade record
    const copyTrade: CopyTrade = {
      id: `copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      originalTradeId: trade.id,
      traderId,
      marketId: trade.marketId,
      marketQuestion: trade.marketQuestion,
      type: trade.type,
      isYes: trade.isYes,
      originalShares: trade.shares,
      copiedShares,
      price: trade.price,
      status: 'pending',
      timestamp: Date.now(),
    };
    
    // Execute the copy trade
    try {
      if (trade.type === 'buy') {
        const result = await chronosApi.buyShares({
          marketId: trade.marketId,
          isYes: trade.isYes,
          shares: String(copiedShares),
          maxCost: String(copiedShares * trade.price * 1.05), // 5% slippage
        });
        
        if (result.success) {
          copyTrade.status = 'executed';
          
          // Record in portfolio
          portfolioAnalytics.recordTrade({
            marketId: trade.marketId,
            marketQuestion: trade.marketQuestion,
            type: 'buy',
            isYes: trade.isYes,
            shares: copiedShares,
            price: trade.price,
            cost: copiedShares * trade.price,
            timestamp: Date.now(),
          });
          
          notifications.notifyAgentTrade(
            0,
            `Copy: ${config.traderName}`,
            `Bought ${copiedShares} ${trade.isYes ? 'YES' : 'NO'} shares`
          );
        } else {
          throw new Error(result.error);
        }
      } else {
        const result = await chronosApi.sellShares({
          marketId: trade.marketId,
          isYes: trade.isYes,
          shares: String(copiedShares),
          minReturn: String(copiedShares * trade.price * 0.95),
        });
        
        if (result.success) {
          copyTrade.status = 'executed';
          
          portfolioAnalytics.recordTrade({
            marketId: trade.marketId,
            marketQuestion: trade.marketQuestion,
            type: 'sell',
            isYes: trade.isYes,
            shares: copiedShares,
            price: trade.price,
            cost: copiedShares * trade.price,
            timestamp: Date.now(),
          });
          
          notifications.notifyAgentTrade(
            0,
            `Copy: ${config.traderName}`,
            `Sold ${copiedShares} ${trade.isYes ? 'YES' : 'NO'} shares`
          );
        } else {
          throw new Error(result.error);
        }
      }
    } catch (error) {
      copyTrade.status = 'failed';
      copyTrade.error = error instanceof Error ? error.message : 'Unknown error';
      
      notifications.notifyTradeFailed(`Copy trade failed: ${copyTrade.error}`);
    }
    
    // Save trade history
    this.tradeHistory.unshift(copyTrade);
    if (this.tradeHistory.length > 500) {
      this.tradeHistory = this.tradeHistory.slice(0, 500);
    }
    this.saveToStorage();
    
    return copyTrade;
  }
  
  /**
   * Get copy trade history
   */
  getTradeHistory(limit?: number): CopyTrade[] {
    return limit ? this.tradeHistory.slice(0, limit) : [...this.tradeHistory];
  }
  
  /**
   * Get trades for a specific trader
   */
  getTradesForTrader(traderId: string): CopyTrade[] {
    return this.tradeHistory.filter(t => t.traderId === traderId);
  }
  
  /**
   * Get copy trading stats
   */
  getStats(): {
    totalCopiedTrades: number;
    successfulTrades: number;
    failedTrades: number;
    totalCopiedTraders: number;
    activeCopiedTraders: number;
  } {
    const executed = this.tradeHistory.filter(t => t.status === 'executed').length;
    const failed = this.tradeHistory.filter(t => t.status === 'failed').length;
    const active = Array.from(this.configs.values()).filter(c => c.enabled).length;
    
    return {
      totalCopiedTrades: this.tradeHistory.length,
      successfulTrades: executed,
      failedTrades: failed,
      totalCopiedTraders: this.configs.size,
      activeCopiedTraders: active,
    };
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
export const copyTrading = CopyTradingManager.getInstance();

// Convenience exports
export function startCopyingTrader(config: Omit<CopyTradingConfig, 'createdAt'>): CopyTradingConfig {
  return copyTrading.startCopying(config);
}

export function stopCopyingTrader(traderId: string): boolean {
  return copyTrading.stopCopying(traderId);
}

export function isCopyingTrader(traderId: string): boolean {
  return copyTrading.isCopying(traderId);
}

export function getCopyConfigs(): CopyTradingConfig[] {
  return copyTrading.getConfigs();
}

export function getCopyTradeHistory(limit?: number): CopyTrade[] {
  return copyTrading.getTradeHistory(limit);
}
