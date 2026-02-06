/**
 * AI Trading Agents Service
 * 
 * Provides automated trading capabilities with configurable strategies.
 */

import { chronosApi } from '../chronos';
import { notifications } from '../social/notifications';
import { portfolioAnalytics } from '../portfolio';
import { priceWebSocket } from '../websocket';
import type { Market } from '../chronos/types';

// Storage key
const AGENTS_STORAGE_KEY = 'chronos_trading_agents';

// Strategy types
export type AgentStrategy = 
  | 'momentum'
  | 'meanReversion'
  | 'arbitrage'
  | 'marketMaker'
  | 'sentiment'
  | 'custom';

export interface StrategyConfig {
  // Momentum
  momentum?: {
    lookbackPeriod: number; // Hours
    threshold: number; // Price change % to trigger
    positionSize: number; // % of allocation
  };
  
  // Mean Reversion
  meanReversion?: {
    period: number;
    deviationThreshold: number; // Standard deviations
    positionSize: number;
  };
  
  // Market Maker
  marketMaker?: {
    spread: number; // Bid-ask spread %
    orderSize: number;
    maxInventory: number;
  };
  
  // Custom
  custom?: {
    script: string; // Custom strategy script (JSON config)
  };
}

export interface TradingAgent {
  id: string;
  name: string;
  description: string;
  strategy: AgentStrategy;
  config: StrategyConfig;
  allocation: number; // Amount allocated to agent
  isActive: boolean;
  createdAt: number;
  lastTradeAt?: number;
  performance: {
    totalTrades: number;
    winningTrades: number;
    totalPnL: number;
    returns: number; // % return
  };
  markets: 'all' | number[]; // Markets the agent trades
}

export interface AgentTrade {
  id: string;
  agentId: string;
  marketId: number;
  marketQuestion: string;
  type: 'buy' | 'sell';
  isYes: boolean;
  shares: number;
  price: number;
  reason: string;
  timestamp: number;
  status: 'executed' | 'failed';
  error?: string;
}

/**
 * Trading Agents Manager
 */
class TradingAgentsManager {
  private static instance: TradingAgentsManager;
  
  private agents: Map<string, TradingAgent> = new Map();
  private tradeHistory: AgentTrade[] = [];
  private priceHistory: Map<number, { time: number; price: number }[]> = new Map();
  private listeners: Set<() => void> = new Set();
  private unsubscribers: (() => void)[] = [];
  private checkInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    this.loadFromStorage();
    this.startMonitoring();
  }
  
  static getInstance(): TradingAgentsManager {
    if (!TradingAgentsManager.instance) {
      TradingAgentsManager.instance = new TradingAgentsManager();
    }
    return TradingAgentsManager.instance;
  }
  
  /**
   * Load from storage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(AGENTS_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.agents) {
          for (const agent of data.agents) {
            this.agents.set(agent.id, agent);
          }
        }
        this.tradeHistory = data.tradeHistory || [];
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  }
  
  /**
   * Save to storage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify({
        agents: Array.from(this.agents.values()),
        tradeHistory: this.tradeHistory.slice(0, 500),
      }));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save agents:', error);
    }
  }
  
  /**
   * Start monitoring markets for active agents
   */
  private startMonitoring(): void {
    // Subscribe to all price updates
    const unsubscribe = priceWebSocket.subscribeToAll((update) => {
      if (update.type === 'price') {
        const priceUpdate = update.data as { marketId: number; yesPrice: number };
        this.updatePriceHistory(priceUpdate.marketId, priceUpdate.yesPrice);
      }
    });
    this.unsubscribers.push(unsubscribe);
    
    // Run strategy checks every minute
    this.checkInterval = setInterval(() => {
      this.runStrategies();
    }, 60000);
  }
  
  /**
   * Update price history for a market
   */
  private updatePriceHistory(marketId: number, price: number): void {
    const history = this.priceHistory.get(marketId) || [];
    history.push({ time: Date.now(), price });
    
    // Keep last 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = history.filter(p => p.time > cutoff);
    
    this.priceHistory.set(marketId, filtered);
  }
  
  /**
   * Run all active agent strategies
   */
  private async runStrategies(): Promise<void> {
    const activeAgents = Array.from(this.agents.values()).filter(a => a.isActive);
    
    for (const agent of activeAgents) {
      try {
        await this.runAgentStrategy(agent);
      } catch (error) {
        console.error(`Agent ${agent.name} strategy failed:`, error);
      }
    }
  }
  
  /**
   * Run strategy for a single agent
   */
  private async runAgentStrategy(agent: TradingAgent): Promise<void> {
    const markets = await this.getAgentMarkets(agent);
    
    for (const market of markets) {
      const signal = this.calculateSignal(agent, market);
      
      if (signal !== null) {
        await this.executeTrade(agent, market, signal);
      }
    }
  }
  
  /**
   * Get markets for an agent
   */
  private async getAgentMarkets(agent: TradingAgent): Promise<Market[]> {
    const allMarkets = await chronosApi.getActiveMarkets();
    
    if (agent.markets === 'all') {
      return allMarkets;
    }
    
    const marketIds = agent.markets as number[];
    return allMarkets.filter(m => marketIds.includes(m.id));
  }
  
  /**
   * Calculate trading signal based on strategy
   */
  private calculateSignal(
    agent: TradingAgent,
    market: Market
  ): { action: 'buy' | 'sell'; isYes: boolean; shares: number; reason: string } | null {
    const history = this.priceHistory.get(market.id) || [];
    
    switch (agent.strategy) {
      case 'momentum':
        return this.momentumSignal(agent, market, history);
      case 'meanReversion':
        return this.meanReversionSignal(agent, market, history);
      case 'marketMaker':
        return this.marketMakerSignal(agent, market);
      default:
        return null;
    }
  }
  
  /**
   * Momentum strategy
   */
  private momentumSignal(
    agent: TradingAgent,
    market: Market,
    history: { time: number; price: number }[]
  ): { action: 'buy' | 'sell'; isYes: boolean; shares: number; reason: string } | null {
    const config = agent.config.momentum;
    if (!config || history.length < 2) return null;
    
    const lookbackMs = config.lookbackPeriod * 60 * 60 * 1000;
    const cutoff = Date.now() - lookbackMs;
    const relevantHistory = history.filter(p => p.time > cutoff);
    
    if (relevantHistory.length < 2) return null;
    
    const oldPrice = relevantHistory[0].price;
    const newPrice = relevantHistory[relevantHistory.length - 1].price;
    const change = (newPrice - oldPrice) / oldPrice * 100;
    
    const shares = Math.floor(agent.allocation * (config.positionSize / 100));
    
    if (change > config.threshold) {
      return {
        action: 'buy',
        isYes: true,
        shares,
        reason: `Momentum up ${change.toFixed(1)}% > ${config.threshold}% threshold`,
      };
    } else if (change < -config.threshold) {
      return {
        action: 'buy',
        isYes: false,
        shares,
        reason: `Momentum down ${Math.abs(change).toFixed(1)}% > ${config.threshold}% threshold`,
      };
    }
    
    return null;
  }
  
  /**
   * Mean reversion strategy
   */
  private meanReversionSignal(
    agent: TradingAgent,
    market: Market,
    history: { time: number; price: number }[]
  ): { action: 'buy' | 'sell'; isYes: boolean; shares: number; reason: string } | null {
    const config = agent.config.meanReversion;
    if (!config || history.length < config.period) return null;
    
    const prices = history.slice(-config.period).map(p => p.price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    const currentPrice = market.yesPrice;
    const zScore = (currentPrice - mean) / stdDev;
    
    const shares = Math.floor(agent.allocation * (config.positionSize / 100));
    
    if (zScore > config.deviationThreshold) {
      // Price is high, expect reversion down - buy NO
      return {
        action: 'buy',
        isYes: false,
        shares,
        reason: `Mean reversion: z-score ${zScore.toFixed(2)} > ${config.deviationThreshold}`,
      };
    } else if (zScore < -config.deviationThreshold) {
      // Price is low, expect reversion up - buy YES
      return {
        action: 'buy',
        isYes: true,
        shares,
        reason: `Mean reversion: z-score ${zScore.toFixed(2)} < -${config.deviationThreshold}`,
      };
    }
    
    return null;
  }
  
  /**
   * Market maker strategy
   */
  private marketMakerSignal(
    agent: TradingAgent,
    _market: Market
  ): { action: 'buy' | 'sell'; isYes: boolean; shares: number; reason: string } | null {
    // Simplified market making - would need order book access
    const config = agent.config.marketMaker;
    if (!config) return null;
    
    // For now, skip - would need limit orders
    return null;
  }
  
  /**
   * Execute a trade for an agent
   */
  private async executeTrade(
    agent: TradingAgent,
    market: Market,
    signal: { action: 'buy' | 'sell'; isYes: boolean; shares: number; reason: string }
  ): Promise<void> {
    const trade: AgentTrade = {
      id: `agent-trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentId: agent.id,
      marketId: market.id,
      marketQuestion: market.question,
      type: signal.action,
      isYes: signal.isYes,
      shares: signal.shares,
      price: signal.isYes ? market.yesPrice : market.noPrice,
      reason: signal.reason,
      timestamp: Date.now(),
      status: 'executed',
    };
    
    try {
      if (signal.action === 'buy') {
        const maxCost = signal.shares * trade.price * 1.05;
        const result = await chronosApi.buyShares({
          marketId: market.id,
          isYes: signal.isYes,
          shares: String(signal.shares),
          maxCost: String(maxCost),
        });
        
        if (!result.success) {
          throw new Error(result.error);
        }
      } else {
        const minReturn = signal.shares * trade.price * 0.95;
        const result = await chronosApi.sellShares({
          marketId: market.id,
          isYes: signal.isYes,
          shares: String(signal.shares),
          minReturn: String(minReturn),
        });
        
        if (!result.success) {
          throw new Error(result.error);
        }
      }
      
      // Update agent performance
      agent.lastTradeAt = Date.now();
      agent.performance.totalTrades++;
      this.agents.set(agent.id, agent);
      
      // Record in portfolio
      portfolioAnalytics.recordTrade({
        marketId: market.id,
        marketQuestion: market.question,
        type: signal.action,
        isYes: signal.isYes,
        shares: signal.shares,
        price: trade.price,
        cost: signal.shares * trade.price,
        timestamp: Date.now(),
      });
      
      // Notify
      notifications.notifyAgentTrade(
        parseInt(agent.id),
        agent.name,
        `${signal.action === 'buy' ? 'Bought' : 'Sold'} ${signal.shares} ${signal.isYes ? 'YES' : 'NO'} - ${signal.reason}`
      );
      
      console.log(`🤖 Agent ${agent.name}: ${signal.action} ${signal.shares} ${signal.isYes ? 'YES' : 'NO'}`);
    } catch (error) {
      trade.status = 'failed';
      trade.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`🤖 Agent ${agent.name} trade failed:`, error);
    }
    
    this.tradeHistory.unshift(trade);
    this.saveToStorage();
  }
  
  /**
   * Create a new agent
   */
  createAgent(params: Omit<TradingAgent, 'id' | 'createdAt' | 'performance'>): TradingAgent {
    const agent: TradingAgent = {
      ...params,
      id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      performance: {
        totalTrades: 0,
        winningTrades: 0,
        totalPnL: 0,
        returns: 0,
      },
    };
    
    this.agents.set(agent.id, agent);
    this.saveToStorage();
    
    console.log(`🤖 Created agent: ${agent.name}`);
    
    return agent;
  }
  
  /**
   * Update an agent
   */
  updateAgent(id: string, updates: Partial<Omit<TradingAgent, 'id' | 'createdAt'>>): TradingAgent | null {
    const agent = this.agents.get(id);
    if (!agent) return null;
    
    const updated = {
      ...agent,
      ...updates,
      config: { ...agent.config, ...updates.config },
      performance: { ...agent.performance, ...updates.performance },
    };
    
    this.agents.set(id, updated);
    this.saveToStorage();
    
    return updated;
  }
  
  /**
   * Delete an agent
   */
  deleteAgent(id: string): boolean {
    const existed = this.agents.has(id);
    this.agents.delete(id);
    this.saveToStorage();
    return existed;
  }
  
  /**
   * Toggle agent active state
   */
  toggleAgent(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;
    
    agent.isActive = !agent.isActive;
    this.agents.set(id, agent);
    this.saveToStorage();
    
    console.log(`🤖 Agent ${agent.name} is now ${agent.isActive ? 'active' : 'paused'}`);
    
    return agent.isActive;
  }
  
  /**
   * Get all agents
   */
  getAgents(): TradingAgent[] {
    return Array.from(this.agents.values());
  }
  
  /**
   * Get agent by ID
   */
  getAgent(id: string): TradingAgent | undefined {
    return this.agents.get(id);
  }
  
  /**
   * Get agent trade history
   */
  getTradeHistory(agentId?: string, limit?: number): AgentTrade[] {
    let trades = [...this.tradeHistory];
    
    if (agentId) {
      trades = trades.filter(t => t.agentId === agentId);
    }
    
    return limit ? trades.slice(0, limit) : trades;
  }
  
  /**
   * Get active agent count
   */
  getActiveCount(): number {
    return Array.from(this.agents.values()).filter(a => a.isActive).length;
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
  
  /**
   * Cleanup
   */
  destroy(): void {
    this.unsubscribers.forEach(unsub => unsub());
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

// Export singleton
export const tradingAgents = TradingAgentsManager.getInstance();

// Convenience exports
export function createTradingAgent(params: Omit<TradingAgent, 'id' | 'createdAt' | 'performance'>): TradingAgent {
  return tradingAgents.createAgent(params);
}

export function getTradingAgents(): TradingAgent[] {
  return tradingAgents.getAgents();
}

export function getTradingAgent(id: string): TradingAgent | undefined {
  return tradingAgents.getAgent(id);
}

export function updateTradingAgent(id: string, updates: Partial<Omit<TradingAgent, 'id' | 'createdAt'>>): TradingAgent | null {
  return tradingAgents.updateAgent(id, updates);
}

export function deleteTradingAgent(id: string): boolean {
  return tradingAgents.deleteAgent(id);
}

export function toggleTradingAgent(id: string): boolean {
  return tradingAgents.toggleAgent(id);
}

export function getAgentTradeHistory(agentId?: string, limit?: number): AgentTrade[] {
  return tradingAgents.getTradeHistory(agentId, limit);
}
