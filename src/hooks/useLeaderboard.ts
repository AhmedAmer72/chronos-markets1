/**
 * useLeaderboard Hook
 * 
 * Access leaderboard data with automatic caching.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  leaderboard,
  type LeaderboardPeriod,
} from '../lib/social/leaderboard';
import type { LeaderboardEntry } from '../lib/chronos/types';

export interface UseLeaderboardResult {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  sortBy: (field: 'rank' | 'winRate' | 'tradesCount') => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  period: LeaderboardPeriod;
  setPeriod: (period: LeaderboardPeriod) => void;
}

export function useLeaderboard(initialPeriod: LeaderboardPeriod = 'allTime'): UseLeaderboardResult {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [period, setPeriod] = useState<LeaderboardPeriod>(initialPeriod);

  const loadLeaderboard = useCallback(async (forceRefresh: boolean = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await leaderboard.getLeaderboard(period, forceRefresh);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadLeaderboard();

    // Subscribe to updates
    const unsubscribe = leaderboard.subscribe(() => {
      loadLeaderboard();
    });

    return () => {
      unsubscribe();
    };
  }, [period, loadLeaderboard]);

  const refresh = useCallback(async () => {
    await loadLeaderboard(true);
  }, [loadLeaderboard]);

  const sortBy = useCallback((field: 'rank' | 'winRate' | 'tradesCount') => {
    const newDirection = field === sortField && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);

    const sorted = [...entries].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (field) {
        case 'winRate':
          aVal = a.winRate;
          bVal = b.winRate;
          break;
        case 'tradesCount':
          aVal = a.tradesCount;
          bVal = b.tradesCount;
          break;
        case 'rank':
        default:
          aVal = a.rank;
          bVal = b.rank;
          break;
      }

      return newDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    setEntries(sorted);
  }, [entries, sortField, sortDirection]);

  return {
    entries,
    isLoading,
    error,
    refresh,
    sortBy,
    sortField,
    sortDirection,
    period,
    setPeriod,
  };
}

export default useLeaderboard;
