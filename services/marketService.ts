/**
 * Market Service - Unified API for market operations
 * 
 * This bridges the frontend components with the Linera blockchain API.
 * Converts between UI types and blockchain types.
 */

import { lineraAdapter } from '../src/lib/linera';
import { chronosApi } from '../src/lib/chronos';
import type { Market as BlockchainMarket, Position as BlockchainPosition, Trade as BlockchainTrade } from '../src/lib/chronos/types';
import { Market, Position, ResolvedMarket, Order, Trade, OrderType, ShareType } from '../types';

// Price history cache for UI display
const priceHistoryCache = new Map<string, { time: number; value: number }[]>();

/**
 * Generate simulated price history from blockchain data
 * Since blockchain doesn't store historical prices, we generate based on current price
 */
function generatePriceHistory(currentPrice: number, days: number = 7): { time: number; value: number }[] {
  const cacheKey = `${currentPrice}-${days}`;
  if (priceHistoryCache.has(cacheKey)) {
    return priceHistoryCache.get(cacheKey)!;
  }

  const history = [];
  let price = currentPrice * (0.7 + Math.random() * 0.3); // Start at 70-100% of current
  const now = Date.now();
  const hoursTotal = days * 24;
  
  for (let i = hoursTotal; i > 0; i--) {
    // Drift towards current price
    const drift = (currentPrice - price) * 0.02;
    const volatility = (Math.random() - 0.5) * 0.04;
    price += drift + volatility;
    price = Math.max(0.01, Math.min(0.99, price));
    
    history.push({
      time: now - i * 60 * 60 * 1000,
      value: parseFloat(price.toFixed(4))
    });
  }
  
  // Ensure last value matches current price
  if (history.length > 0) {
    history[history.length - 1].value = currentPrice;
  }
  
  priceHistoryCache.set(cacheKey, history);
  return history;
}

/**
 * Convert blockchain market to UI market format
 */
function convertMarket(m: BlockchainMarket): Market {
  const yesPrice = m.yesPrice || 0.5;
  const yesPool = parseFloat(m.yesPool || '0');
  const noPool = parseFloat(m.noPool || '0');
  return {
    id: String(m.id),
    question: m.question,
    categories: m.categories || ['General'],
    currentPrice: yesPrice,
    volume: parseInt(m.volume || '0'),
    liquidity: Math.round(yesPool + noPool),
    traders: 0, // Not tracked on chain
    ends: new Date(m.endTime).getTime(),
    oracleSource: 'Linera Oracle',
    resolutionDetails: m.resolved 
      ? `Market resolved: ${m.outcome ? 'YES' : 'NO'}` 
      : 'Pending resolution by market creator',
    priceHistory: generatePriceHistory(yesPrice),
    yesPool,
    noPool,
  };
}

/**
 * Get all markets from blockchain
 */
export async function getMarkets(): Promise<Market[]> {
  try {
    // Check if connected to application
    if (!lineraAdapter.isApplicationConnected()) {
      console.log('📡 Application not connected, returning empty markets');
      return [];
    }

    const blockchainMarkets = await chronosApi.getMarkets();
    console.log('📊 Fetched markets from blockchain:', blockchainMarkets.length);
    return blockchainMarkets.map(convertMarket);
  } catch (error) {
    console.error('Failed to fetch markets:', error);
    return [];
  }
}

/**
 * Get a market by ID
 */
export async function getMarketById(id: string): Promise<Market | undefined> {
  try {
    if (!lineraAdapter.isApplicationConnected()) {
      return undefined;
    }

    const market = await chronosApi.getMarket(parseInt(id));
    return market ? convertMarket(market) : undefined;
  } catch (error) {
    console.error('Failed to fetch market:', error);
    return undefined;
  }
}

/**
 * Create a new market
 */
export async function createMarket(params: {
  question: string;
  categories: string[];
  endTime: number;
  initialLiquidity: string;
}): Promise<{ success: boolean; marketId?: string; error?: string }> {
  try {
    const result = await chronosApi.createMarket(params);
    return {
      success: result.success,
      marketId: result.marketId?.toString(),
      error: result.error
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Buy shares in a market
 */
export async function buyShares(params: {
  marketId: string;
  isYes: boolean;
  shares: string;
  maxCost: string;
}): Promise<{ success: boolean; shares?: string; error?: string }> {
  try {
    const result = await chronosApi.buyShares({
      marketId: parseInt(params.marketId),
      isYes: params.isYes,
      shares: params.shares,
      maxCost: params.maxCost,
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Sell shares in a market
 */
export async function sellShares(params: {
  marketId: string;
  isYes: boolean;
  shares: string;
  minReturn: string;
}): Promise<{ success: boolean; returnAmount?: string; error?: string }> {
  try {
    const result = await chronosApi.sellShares({
      marketId: parseInt(params.marketId),
      isYes: params.isYes,
      shares: params.shares,
      minReturn: params.minReturn,
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Generate order book (simulated from blockchain state)
 * Blockchain uses AMM, so we simulate traditional order book
 */
export async function getOrderBook(marketId?: string): Promise<{ bids: Order[]; asks: Order[] }> {
  try {
    let yesPrice = 0.5;
    
    if (marketId && lineraAdapter.isApplicationConnected()) {
      const market = await chronosApi.getMarket(parseInt(marketId));
      if (market) {
        yesPrice = market.yesPrice;
      }
    }

    // Generate realistic order book around current price
    const generateOrders = (basePrice: number, isBid: boolean, count: number): Order[] => {
      const orders: Order[] = [];
      let price = basePrice;
      
      for (let i = 0; i < count; i++) {
        const size = Math.floor(Math.random() * 500) + 50;
        const spread = (Math.random() * 0.02 + 0.005) * (isBid ? -1 : 1);
        price = Math.max(0.01, Math.min(0.99, price + spread));
        orders.push({
          price: parseFloat(price.toFixed(4)),
          size,
          total: parseFloat((price * size).toFixed(2))
        });
      }
      
      return isBid 
        ? orders.sort((a, b) => b.price - a.price)
        : orders.sort((a, b) => a.price - b.price);
    };

    return {
      bids: generateOrders(yesPrice - 0.01, true, 15),
      asks: generateOrders(yesPrice + 0.01, false, 15)
    };
  } catch (error) {
    console.error('Failed to generate order book:', error);
    return { bids: [], asks: [] };
  }
}

/**
 * Get trade history (simulated)
 * Real trades would come from indexer in production
 */
export async function getTradeHistory(marketId?: string): Promise<Trade[]> {
  const trades: Trade[] = [];
  const now = Date.now();
  
  for (let i = 0; i < 30; i++) {
    const price = 0.5 + (Math.random() - 0.5) * 0.2;
    trades.push({
      time: now - i * (Math.random() * 60000 + 10000),
      price: parseFloat(price.toFixed(4)),
      amount: Math.floor(Math.random() * 200) + 10,
      type: Math.random() > 0.5 ? OrderType.BUY : OrderType.SELL,
    });
  }
  
  return trades.sort((a, b) => b.time - a.time);
}

/**
 * Get portfolio data
 */
export async function getPortfolio(): Promise<{
  summary: { totalValue: number; totalPL: number; availableFunds: number };
  positions: Position[];
  resolved: ResolvedMarket[];
}> {
  try {
    if (!lineraAdapter.isConnected()) {
      return {
        summary: { totalValue: 0, totalPL: 0, availableFunds: 0 },
        positions: [],
        resolved: []
      };
    }

    const address = lineraAdapter.getAddress();
    if (!address) {
      return {
        summary: { totalValue: 0, totalPL: 0, availableFunds: 0 },
        positions: [],
        resolved: []
      };
    }

    // Get positions from blockchain
    const blockchainPositions = await chronosApi.getPositions(address);
    const markets = await chronosApi.getMarkets();
    
    const positions: Position[] = [];
    const resolved: ResolvedMarket[] = [];
    let totalValue = 0;
    let totalPL = 0;

    for (const bp of blockchainPositions) {
      const market = markets.find(m => m.id === bp.marketId);
      if (!market) continue;

      const yesShares = parseFloat(bp.yesShares || '0');
      const noShares = parseFloat(bp.noShares || '0');
      const yesPrice = market.yesPrice;
      const noPrice = market.noPrice;
      
      // Calculate values
      const yesValue = yesShares * yesPrice;
      const noValue = noShares * noPrice;
      const currentValue = yesValue + noValue;
      
      // Estimate cost (assuming bought at 50% - actual cost tracking would need indexer)
      const estimatedCost = (yesShares + noShares) * 0.5;
      const unrealizedPL = currentValue - estimatedCost;
      
      totalValue += currentValue;
      totalPL += unrealizedPL;

      const position: Position = {
        marketId: String(bp.marketId),
        marketQuestion: market.question,
        shares: yesShares || noShares,
        shareType: yesShares > 0 ? ShareType.YES : ShareType.NO,
        avgCost: 0.5,
        currentValue,
        unrealizedPL
      };

      if (market.resolved) {
        const realizedPL = market.outcome 
          ? yesValue - estimatedCost 
          : noValue - estimatedCost;
        
        resolved.push({
          ...position,
          outcome: market.outcome ? ShareType.YES : ShareType.NO,
          realizedPL
        });
      } else {
        positions.push(position);
      }
    }

    return {
      summary: {
        totalValue,
        totalPL,
        availableFunds: 1000 // Default funds
      },
      positions,
      resolved
    };
  } catch (error) {
    console.error('Failed to get portfolio:', error);
    return {
      summary: { totalValue: 0, totalPL: 0, availableFunds: 0 },
      positions: [],
      resolved: []
    };
  }
}

/**
 * Check if blockchain is connected and ready
 */
export function isConnected(): boolean {
  return lineraAdapter.isConnected();
}

/**
 * Check if application is connected
 */
export function isApplicationConnected(): boolean {
  return lineraAdapter.isApplicationConnected();
}

export default {
  getMarkets,
  getMarketById,
  createMarket,
  buyShares,
  sellShares,
  getOrderBook,
  getTradeHistory,
  getPortfolio,
  isConnected,
  isApplicationConnected,
};
