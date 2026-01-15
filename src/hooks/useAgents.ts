/**
 * useAgents Hook
 * 
 * Hook for fetching and managing AI trading agents
 */

import { useState, useEffect, useCallback } from 'react';
import { chronosApi, type TradingAgent } from '../lib/chronos';

export interface AgentsState {
  agents: TradingAgent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  followAgent: (agentId: number, amount: string) => Promise<boolean>;
  createAgent: (name: string, strategy: string, config: string) => Promise<number | null>;
}

/**
 * Hook for AI trading agents
 */
export function useAgents(): AgentsState {
  const [agents, setAgents] = useState<TradingAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await chronosApi.getAgents();
      setAgents(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch agents';
      setError(message);
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const followAgent = useCallback(async (agentId: number, amount: string): Promise<boolean> => {
    try {
      const result = await chronosApi.followAgent(agentId, amount);
      if (result.success) {
        await refresh();
      }
      return result.success;
    } catch (err) {
      console.error('Failed to follow agent:', err);
      return false;
    }
  }, [refresh]);

  const createAgent = useCallback(async (
    name: string, 
    strategy: string, 
    config: string
  ): Promise<number | null> => {
    try {
      const result = await chronosApi.createAgent({ name, strategy, config });
      if (result.success && result.agentId !== undefined) {
        await refresh();
        return result.agentId;
      }
      return null;
    } catch (err) {
      console.error('Failed to create agent:', err);
      return null;
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    agents,
    loading,
    error,
    refresh,
    followAgent,
    createAgent,
  };
}
