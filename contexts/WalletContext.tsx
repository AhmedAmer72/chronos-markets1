import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import lineraClient from '../services/lineraClient';

// Application configuration
const DEFAULT_APPLICATION_ID = import.meta.env.VITE_LINERA_APP_ID || '';
const USE_TESTNET = import.meta.env.VITE_USE_TESTNET !== 'false';

export interface WalletState {
  isConnected: boolean;
  isInitializing: boolean;
  address: string | null;
  balance: string | null;
  chainId: string | null;
  applicationId: string | null;
  network: 'testnet' | 'devnet' | 'disconnected';
  error: string | null;
}

interface WalletContextType {
  wallet: WalletState;
  connect: () => Promise<void>;
  disconnect: () => void;
  isLoading: boolean;
  refreshBalance: () => Promise<void>;
}

const initialWalletState: WalletState = {
  isConnected: false,
  isInitializing: false,
  address: null,
  balance: null,
  chainId: null,
  applicationId: null,
  network: 'disconnected',
  error: null,
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletState>(initialWalletState);
  const [isLoading, setIsLoading] = useState(false);

  // Check if Linera client library is available
  useEffect(() => {
    const checkAvailability = async () => {
      const available = await lineraClient.isLineraAvailable();
      if (!available) {
        console.log('ℹ️ Linera client not available, mock mode enabled');
      }
    };
    checkAvailability();
  }, []);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setWallet(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      // Check if Linera is available
      const isAvailable = await lineraClient.isLineraAvailable();
      
      if (isAvailable) {
        // Initialize Linera client
        console.log('🔗 Connecting to Linera', USE_TESTNET ? 'Testnet' : 'Devnet');
        
        const initResult = await lineraClient.initializeLinera(USE_TESTNET);
        
        if (!initResult.success) {
          throw new Error(initResult.error || 'Failed to initialize Linera');
        }
        
        // Connect to the Chronos Markets application if we have an ID
        if (DEFAULT_APPLICATION_ID) {
          const appResult = await lineraClient.connectToApplication(DEFAULT_APPLICATION_ID);
          if (!appResult.success) {
            console.warn('⚠️ Could not connect to application:', appResult.error);
          }
        }
        
        // Subscribe to chain notifications
        lineraClient.subscribeToNotifications((notification) => {
          console.log('📬 Chain notification:', notification);
        });
        
        setWallet({
          isConnected: true,
          isInitializing: false,
          address: initResult.chainId?.slice(0, 10) + '...' + initResult.chainId?.slice(-6) || null,
          balance: '100',
          chainId: initResult.chainId || null,
          applicationId: DEFAULT_APPLICATION_ID || null,
          network: USE_TESTNET ? 'testnet' : 'devnet',
          error: null,
        });
        
        console.log('✅ Wallet connected successfully');
        
      } else {
        // Fallback: Try to connect via GraphQL to local devnet
        console.log('🔗 Falling back to direct GraphQL connection');
        
        const nodeUrl = import.meta.env.VITE_LINERA_NODE_URL || 'http://localhost:8080';
        
        const response = await fetch(nodeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '{ chains { list } }' }),
        });
        
        if (response.ok) {
          const result = await response.json();
          const chains = result.data?.chains?.list;
          
          if (chains && chains.length > 0) {
            const chainId = chains[0];
            
            setWallet({
              isConnected: true,
              isInitializing: false,
              address: chainId.slice(0, 10) + '...' + chainId.slice(-6),
              balance: '100',
              chainId,
              applicationId: DEFAULT_APPLICATION_ID || null,
              network: 'devnet',
              error: null,
            });
            
            console.log('✅ Connected to local devnet via GraphQL');
          } else {
            throw new Error('No chains found on devnet');
          }
        } else {
          throw new Error('Failed to connect to Linera node');
        }
      }
      
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      
      // Set error state but also provide mock wallet for development
      setWallet({
        isConnected: true,
        isInitializing: false,
        address: '0x' + Math.random().toString(16).slice(2, 12) + '...',
        balance: '100',
        chainId: 'mock-chain-' + Date.now(),
        applicationId: DEFAULT_APPLICATION_ID || null,
        network: 'disconnected',
        error: error instanceof Error ? error.message : 'Connection failed',
      });
      
      console.log('⚠️ Using mock wallet for development');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet(initialWalletState);
    console.log('🔌 Wallet disconnected');
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!wallet.isConnected) return;
    
    console.log('🔄 Refreshing balance...');
    
    try {
      const result = await lineraClient.queryApplication('query { totalVolume }');
      if (result.success) {
        console.log('💰 Current volume:', result.data);
      }
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  }, [wallet.isConnected]);

  return (
    <WalletContext.Provider value={{ wallet, connect, disconnect, isLoading, refreshBalance }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};