/**
 * usePortfolioAnalytics Hook
 * 
 * Access portfolio analytics data including balance, positions, P&L, and risk metrics.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  portfolioAnalytics,
  getTradeHistory,
  type TradeRecord,
  type PortfolioBalance,
  type PositionAnalysis,
  type PnLSnapshot,
  type PortfolioSummary,
} from '../lib/portfolio/portfolioAnalytics';

export interface UsePortfolioAnalyticsResult {
  balance: PortfolioBalance | null;
  positions: PositionAnalysis[];
  summary: PortfolioSummary | null;
  pnlHistory: PnLSnapshot[];
  tradeHistory: TradeRecord[];
  isLoading: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
  refreshAll: () => Promise<void>;
  exportCSV: () => void;
  exportJSON: () => void;
}

export function usePortfolioAnalytics(walletAddress: string | null): UsePortfolioAnalyticsResult {
  const [balance, setBalance] = useState<PortfolioBalance | null>(null);
  const [positions, setPositions] = useState<PositionAnalysis[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [pnlHistory, setPnlHistory] = useState<PnLSnapshot[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalance = useCallback(async () => {
    if (!walletAddress) return;
    
    try {
      const newBalance = await portfolioAnalytics.getBalance();
      setBalance(newBalance);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  }, [walletAddress]);

  const refreshAll = useCallback(async () => {
    if (!walletAddress) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch all data in parallel
      const [newBalance, allPositions, portfolioSummary, pnl, history] = await Promise.all([
        portfolioAnalytics.getBalance(),
        portfolioAnalytics.getPositions(),
        portfolioAnalytics.getPortfolioSummary(),
        portfolioAnalytics.getPnLHistory(),
        Promise.resolve(getTradeHistory()),
      ]);

      setBalance(newBalance);
      setPositions(allPositions);
      setSummary(portfolioSummary);
      setPnlHistory(pnl);
      setTradeHistory(history);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load portfolio data';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  // Initial load and periodic refresh
  useEffect(() => {
    if (walletAddress) {
      refreshAll();

      // Refresh every 30 seconds
      const interval = setInterval(refreshAll, 30000);
      return () => clearInterval(interval);
    }
  }, [walletAddress, refreshAll]);

  const exportCSV = useCallback(() => {
    portfolioAnalytics.exportToCSV();
  }, []);

  const exportJSON = useCallback(() => {
    portfolioAnalytics.exportToJSON();
  }, []);

  return {
    balance,
    positions,
    summary,
    pnlHistory,
    tradeHistory,
    isLoading,
    error,
    refreshBalance,
    refreshAll,
    exportCSV,
    exportJSON,
  };
}

export default usePortfolioAnalytics;
