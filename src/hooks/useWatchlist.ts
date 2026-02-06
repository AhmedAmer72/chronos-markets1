/**
 * useWatchlist Hook
 * 
 * Manage market watchlist/favorites.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  watchlist,
  toggleWatchlist as toggleItem,
  isInWatchlist as checkInWatchlist,
  getWatchlist as getItems,
  getWatchlistIds,
  type WatchlistItem,
} from '../lib/watchlist';

export interface UseWatchlistResult {
  items: WatchlistItem[];
  ids: string[];
  isInWatchlist: (marketId: string) => boolean;
  toggle: (marketId: string, notes?: string) => boolean;
  add: (marketId: string, notes?: string) => void;
  remove: (marketId: string) => void;
  count: number;
}

export function useWatchlist(): UseWatchlistResult {
  const [items, setItems] = useState<WatchlistItem[]>(getItems());
  const [ids, setIds] = useState<string[]>(getWatchlistIds());

  useEffect(() => {
    const unsubscribe = watchlist.subscribe(() => {
      setItems(getItems());
      setIds(getWatchlistIds());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const isInWatchlist = useCallback((marketId: string) => {
    return checkInWatchlist(marketId);
  }, []);

  const toggle = useCallback((marketId: string, notes?: string) => {
    return toggleItem(marketId, notes);
  }, []);

  const add = useCallback((marketId: string, notes?: string) => {
    watchlist.addToWatchlist(marketId, notes);
  }, []);

  const remove = useCallback((marketId: string) => {
    watchlist.removeFromWatchlist(marketId);
  }, []);

  return {
    items,
    ids,
    isInWatchlist,
    toggle,
    add,
    remove,
    count: items.length,
  };
}

export default useWatchlist;
