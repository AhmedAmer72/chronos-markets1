import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import chronosContract from '../services/chronosContract';

// Application configuration
const DEFAULT_APPLICATION_ID = import.meta.env.VITE_LINERA_APP_ID || chronosContract.APPLICATION_ID;
const DEFAULT_CHAIN_ID = import.meta.env.VITE_LINERA_CHAIN_ID || chronosContract.CHAIN_ID;

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

  // Check if Linera service is available on mount
  useEffect(() => {
    const checkConnection = async () => {
      const connected = await chronosContract.checkConnection();
      if (connected) {
        console.log('✅ Linera service is available');
      } else {
        console.log('ℹ️ Linera service not available, will use mock mode');
      }
    };
    checkConnection();
  }, []);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setWallet(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      // Check if Linera service is running
      const isConnected = await chronosContract.checkConnection();
      
      if (isConnected) {
        console.log('🔗 Connecting to Linera Testnet...');
        
        // Get total volume to verify connection
        const volumeResult = await chronosContract.getTotalVolume();
        
        setWallet({
          isConnected: true,
          isInitializing: false,
          address: DEFAULT_CHAIN_ID.slice(0, 10) + '...' + DEFAULT_CHAIN_ID.slice(-6),
          balance: '100',
          chainId: DEFAULT_CHAIN_ID,
          applicationId: DEFAULT_APPLICATION_ID,
          network: 'testnet',
          error: null,
        });
        
        console.log('✅ Wallet connected successfully');
        console.log('📊 Total volume:', volumeResult.volume);
        
      } else {
        // Use mock mode for development
        console.log('⚠️ Using mock wallet mode');
        
        setWallet({
          isConnected: true,
          isInitializing: false,
          address: '0x' + Math.random().toString(16).slice(2, 12) + '...',
          balance: '100',
          chainId: 'mock-' + Date.now(),
          applicationId: DEFAULT_APPLICATION_ID,
          network: 'devnet',
          error: null,
        });
      }
      
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      
      // Still allow mock mode for development
      setWallet({
        isConnected: true,
        isInitializing: false,
        address: '0x' + Math.random().toString(16).slice(2, 12) + '...',
        balance: '100',
        chainId: 'mock-chain-' + Date.now(),
        applicationId: DEFAULT_APPLICATION_ID,
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
    
    console.log('🔄 Refreshing data...');
    
    try {
      const volumeResult = await chronosContract.getTotalVolume();
      console.log('📊 Total volume:', volumeResult.volume);
      
      const marketCount = await chronosContract.getMarketCount();
      console.log('📈 Market count:', marketCount);
    } catch (error) {
      console.error('Failed to refresh data:', error);
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