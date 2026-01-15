/**
 * useMarkets Hook
 * 
 * Hook for fetching and managing market data
 */

import { useState, useEffect, useCallback } from 'react';
import { chronosApi, type Market } from '../lib/chronos';

export interface MarketsState {
  markets: Market[];
  activeMarkets: Market[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching markets
 */
export function useMarkets(): MarketsState {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [activeMarkets, setActiveMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [allMarkets, active] = await Promise.all([
        chronosApi.getMarkets(),
        chronosApi.getActiveMarkets(),
      ]);
      
      setMarkets(allMarkets);
      setActiveMarkets(active);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch markets';
      setError(message);
      console.error('Failed to fetch markets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    markets,
    activeMarkets,
    loading,
    error,
    refresh,
  };
}

export interface MarketState {
  market: Market | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching a single market
 */
export function useMarket(id: number): MarketState {
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await chronosApi.getMarket(id);
      setMarket(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch market';
      setError(message);
      console.error('Failed to fetch market:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    market,
    loading,
    error,
    refresh,
  };
}
