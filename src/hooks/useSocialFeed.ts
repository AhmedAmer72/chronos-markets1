/**
 * useSocialFeed Hook
 * 
 * Hook for fetching and managing social feed data
 */

import { useState, useEffect, useCallback } from 'react';
import { chronosApi, type FeedItem, type LeaderboardEntry } from '../lib/chronos';

export interface SocialFeedState {
  feed: FeedItem[];
  leaderboard: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  postComment: (marketId: number, content: string) => Promise<boolean>;
}

/**
 * Hook for social feed and leaderboard
 */
export function useSocialFeed(limit: number = 50): SocialFeedState {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [feedData, leaderboardData] = await Promise.all([
        chronosApi.getSocialFeed(limit),
        chronosApi.getLeaderboard(10),
      ]);
      
      setFeed(feedData);
      setLeaderboard(leaderboardData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch feed';
      setError(message);
      console.error('Failed to fetch social feed:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const postComment = useCallback(async (marketId: number, content: string): Promise<boolean> => {
    try {
      const result = await chronosApi.postComment(marketId, content);
      if (result.success) {
        await refresh();
      }
      return result.success;
    } catch (err) {
      console.error('Failed to post comment:', err);
      return false;
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    feed,
    leaderboard,
    loading,
    error,
    refresh,
    postComment,
  };
}
