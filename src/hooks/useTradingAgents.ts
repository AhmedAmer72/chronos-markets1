/**
 * useTradingAgents Hook
 * 
 * Manage AI trading agents.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  tradingAgents,
  type TradingAgent,
  type AgentStrategy,
  type StrategyConfig,
  type AgentTrade,
} from '../lib/agents/tradingAgents';

export interface UseTradingAgentsResult {
  agents: TradingAgent[];
  totalValue: number;
  isLoading: boolean;
  createAgent: (config: {
    name: string;
    description: string;
    strategy: AgentStrategy;
    config: StrategyConfig;
    allocation: number;
    isActive: boolean;
    markets?: 'all' | number[];
  }) => TradingAgent;
  toggleAgent: (agentId: string) => void;
  deleteAgent: (agentId: string) => boolean;
  updateAllocation: (agentId: string, amount: number) => void;
  getAgentTrades: (agentId?: string, limit?: number) => AgentTrade[];
}

export function useTradingAgents(): UseTradingAgentsResult {
  const [agents, setAgents] = useState<TradingAgent[]>(tradingAgents.getAgents());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Calculate total value
  const totalValue = agents.reduce((sum, agent) => sum + agent.allocation, 0);

  // Subscribe to agent updates
  useEffect(() => {
    const unsubscribe = tradingAgents.subscribe(() => {
      setAgents([...tradingAgents.getAgents()]);
    });

    return () => unsubscribe();
  }, []);

  const createAgent = useCallback((config: {
    name: string;
    description: string;
    strategy: AgentStrategy;
    config: StrategyConfig;
    allocation: number;
    isActive: boolean;
    markets?: 'all' | number[];
  }): TradingAgent => {
    const agent = tradingAgents.createAgent({
      ...config,
      markets: config.markets || 'all',
    });
    setAgents([...tradingAgents.getAgents()]);
    return agent;
  }, []);

  const toggleAgent = useCallback((agentId: string) => {
    tradingAgents.toggleAgent(agentId);
    setAgents([...tradingAgents.getAgents()]);
  }, []);

  const deleteAgent = useCallback((agentId: string): boolean => {
    const result = tradingAgents.deleteAgent(agentId);
    if (result) {
      setAgents([...tradingAgents.getAgents()]);
    }
    return result;
  }, []);

  const updateAllocation = useCallback((agentId: string, amount: number) => {
    tradingAgents.updateAgent(agentId, { allocation: amount });
    setAgents([...tradingAgents.getAgents()]);
  }, []);

  const getAgentTrades = useCallback((agentId?: string, limit?: number): AgentTrade[] => {
    return tradingAgents.getTradeHistory(agentId, limit);
  }, []);

  return {
    agents,
    totalValue,
    isLoading,
    createAgent,
    toggleAgent,
    deleteAgent,
    updateAllocation,
    getAgentTrades,
  };
}

export default useTradingAgents;
