/**
 * useCopyTrading Hook
 * 
 * Enable copy trading functionality to follow top traders.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  copyTrading,
  type CopyTradingConfig,
  type CopyTrade,
} from '../lib/social/copyTrading';

export interface CopyTradingStats {
  totalCopiedTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalCopiedTraders: number;
  activeCopiedTraders: number;
}

export interface UseCopyTradingResult {
  configs: CopyTradingConfig[];
  tradeHistory: CopyTrade[];
  isLoading: boolean;
  error: string | null;
  startCopying: (config: Omit<CopyTradingConfig, 'createdAt'>) => CopyTradingConfig;
  stopCopying: (traderId: string) => boolean;
  toggleEnabled: (traderId: string) => void;
  updateConfig: (traderId: string, updates: Partial<CopyTradingConfig>) => CopyTradingConfig | null;
  getTotalAllocated: () => number;
  getStats: () => CopyTradingStats;
}

export function useCopyTrading(): UseCopyTradingResult {
  const [configs, setConfigs] = useState<CopyTradingConfig[]>(copyTrading.getConfigs());
  const [tradeHistory, setTradeHistory] = useState<CopyTrade[]>(copyTrading.getTradeHistory());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to updates
  useEffect(() => {
    const unsubscribe = copyTrading.subscribe(() => {
      setConfigs(copyTrading.getConfigs());
      setTradeHistory(copyTrading.getTradeHistory());
    });

    return () => unsubscribe();
  }, []);

  const startCopying = useCallback((config: Omit<CopyTradingConfig, 'createdAt'>): CopyTradingConfig => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = copyTrading.startCopying(config);
      setConfigs(copyTrading.getConfigs());
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start copying';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopCopying = useCallback((traderId: string): boolean => {
    const result = copyTrading.stopCopying(traderId);
    if (result) {
      setConfigs(copyTrading.getConfigs());
    }
    return result;
  }, []);

  const toggleEnabled = useCallback((traderId: string) => {
    copyTrading.toggleEnabled(traderId);
    setConfigs(copyTrading.getConfigs());
  }, []);

  const updateConfig = useCallback((
    traderId: string,
    updates: Partial<CopyTradingConfig>
  ): CopyTradingConfig | null => {
    const result = copyTrading.updateConfig(traderId, updates);
    if (result) {
      setConfigs(copyTrading.getConfigs());
    }
    return result;
  }, []);

  const getTotalAllocated = useCallback((): number => {
    return configs.reduce((sum, c) => sum + c.allocation, 0);
  }, [configs]);

  const getStats = useCallback((): CopyTradingStats => {
    return copyTrading.getStats();
  }, []);

  return {
    configs,
    tradeHistory,
    isLoading,
    error,
    startCopying,
    stopCopying,
    toggleEnabled,
    updateConfig,
    getTotalAllocated,
    getStats,
  };
}

export default useCopyTrading;
