/**
 * usePortfolio Hook
 * 
 * Hook for fetching and managing user portfolio data
 */

import { useState, useEffect, useCallback } from 'react';
import { chronosApi, type Position, type UserStats } from '../lib/chronos';
import { lineraAdapter } from '../lib/linera';

export interface PortfolioState {
  positions: Position[];
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching user portfolio
 */
export function usePortfolio(): PortfolioState {
  const [positions, setPositions] = useState<Position[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const wallet = lineraAdapter.getAddress();
    if (!wallet) {
      setPositions([]);
      setStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const [positionsData, statsData] = await Promise.all([
        chronosApi.getPositions(wallet),
        chronosApi.getUserStats(wallet),
      ]);
      
      setPositions(positionsData);
      setStats(statsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch portfolio';
      setError(message);
      console.error('Failed to fetch portfolio:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    
    // Subscribe to linera state changes
    const unsubscribe = lineraAdapter.subscribe(refresh);
    return unsubscribe;
  }, [refresh]);

  return {
    positions,
    stats,
    loading,
    error,
    refresh,
  };
}
