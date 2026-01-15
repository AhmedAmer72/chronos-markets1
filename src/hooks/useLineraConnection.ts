/**
 * useLineraConnection Hook
 * 
 * Manages Linera connection state using direct faucet connection.
 * Creates a new wallet via faucet and claims a chain for the user.
 * Based on Linera-Arcade pattern.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { lineraAdapter, type LineraConnection } from '../lib/linera';

// Environment configuration
const FAUCET_URL = import.meta.env.VITE_LINERA_FAUCET_URL || 'https://faucet.testnet-conway.linera.net';
const APPLICATION_ID = import.meta.env.VITE_LINERA_APP_ID;

/**
 * Connection state returned by the hook
 */
export interface LineraConnectionState {
  // Connection flags
  isConnecting: boolean;
  isConnected: boolean;
  isAppConnected: boolean;
  
  // Error state
  error: string | null;
  
  // Connection data
  connection: LineraConnection | null;
  walletAddress: string | null;
  chainId: string | null;
  
  // Actions
  connect: (userAddress?: string) => Promise<void>;
  disconnect: () => void;
  retry: () => Promise<void>;
}

/**
 * Hook for managing Linera blockchain connection
 */
export function useLineraConnection(): LineraConnectionState {
  // Local state
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(lineraAdapter.isConnected());
  const [isAppConnected, setIsAppConnected] = useState(lineraAdapter.isApplicationConnected());
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<LineraConnection | null>(lineraAdapter.getConnection());
  
  // Track if connection is in progress
  const isConnectingRef = useRef(false);
  const autoConnectAttempted = useRef(false);
  
  /**
   * Sync state from adapter (stable reference)
   */
  const syncState = useCallback(() => {
    const newIsConnected = lineraAdapter.isConnected();
    const newIsAppConnected = lineraAdapter.isApplicationConnected();
    const newConnection = lineraAdapter.getConnection();
    
    // Only update state if values actually changed
    setIsConnected(prev => prev !== newIsConnected ? newIsConnected : prev);
    setIsAppConnected(prev => prev !== newIsAppConnected ? newIsAppConnected : prev);
    setConnection(prev => prev !== newConnection ? newConnection : prev);
  }, []);
  
  /**
   * Connect to Linera
   */
  const connect = useCallback(async (userAddress?: string) => {
    // Validate prerequisites
    if (!APPLICATION_ID) {
      setError('Application ID is not configured. Check VITE_LINERA_APP_ID.');
      return;
    }
    
    // Prevent concurrent connections
    if (isConnectingRef.current) {
      console.log('⏳ Connection already in progress...');
      return;
    }
    
    // Start connection
    isConnectingRef.current = true;
    setIsConnecting(true);
    setError(null);
    
    try {
      console.log('🔗 Connecting to Linera via faucet...');
      
      // Step 1: Connect to Linera network via faucet (creates wallet + claims chain)
      await lineraAdapter.connect(userAddress, FAUCET_URL);
      
      // Step 2: Connect to Chronos Markets application
      await lineraAdapter.connectApplication(APPLICATION_ID);
      
      // Update state
      syncState();
      console.log('✅ Connected to Chronos Markets!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      console.error('❌ Connection failed:', message);
      setError(message);
    } finally {
      setIsConnecting(false);
      isConnectingRef.current = false;
    }
  }, [syncState]);
  
  /**
   * Disconnect from Linera
   */
  const disconnect = useCallback(() => {
    lineraAdapter.disconnect();
    setError(null);
    syncState();
    autoConnectAttempted.current = false;
  }, [syncState]);
  
  /**
   * Retry connection after error
   */
  const retry = useCallback(async () => {
    setError(null);
    await connect();
  }, [connect]);
  
  // Subscribe to adapter state changes
  useEffect(() => {
    const unsubscribe = lineraAdapter.subscribe(syncState);
    return unsubscribe;
  }, [syncState]);
  
  return {
    isConnecting,
    isConnected,
    isAppConnected,
    error,
    connection,
    walletAddress: connection?.address ?? null,
    chainId: connection?.chainId ?? null,
    connect,
    disconnect,
    retry,
  };
}
