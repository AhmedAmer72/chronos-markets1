import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode, FC } from 'react';
import { useLineraConnection } from '../src/hooks/useLineraConnection';

// Application configuration
const DEFAULT_APPLICATION_ID = import.meta.env.VITE_LINERA_APP_ID || '';
const DEFAULT_CHAIN_ID = import.meta.env.VITE_LINERA_CHAIN_ID || '';

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

export const WalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletState>(initialWalletState);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use the Linera connection hook
  const { 
    isConnecting, 
    isConnected: isLineraConnected, 
    isAppConnected,
    walletAddress,
    chainId,
    error: connectionError,
    connect: lineraConnect,
    disconnect: lineraDisconnect,
  } = useLineraConnection();

  // Sync wallet state with Linera connection
  useEffect(() => {
    if (isLineraConnected && isAppConnected) {
      setWallet({
        isConnected: true,
        isInitializing: false,
        address: walletAddress,
        balance: '100', // TODO: Fetch real balance
        chainId: chainId || DEFAULT_CHAIN_ID,
        applicationId: DEFAULT_APPLICATION_ID,
        network: 'testnet',
        error: null,
      });
    } else if (connectionError) {
      setWallet(prev => ({
        ...prev,
        isConnected: false,
        isInitializing: false,
        error: connectionError,
        network: 'disconnected',
      }));
    }
  }, [isLineraConnected, isAppConnected, walletAddress, chainId, connectionError]);

  // Sync loading state
  useEffect(() => {
    setIsLoading(isConnecting);
    if (isConnecting) {
      setWallet(prev => ({ ...prev, isInitializing: true }));
    }
  }, [isConnecting]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setWallet(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      console.log('🔗 Connecting to Linera via faucet...');
      
      // Use the Linera connection hook
      await lineraConnect();
      
      console.log('✅ Wallet connected successfully');
      
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      
      setWallet({
        isConnected: false,
        isInitializing: false,
        address: null,
        balance: null,
        chainId: null,
        applicationId: DEFAULT_APPLICATION_ID,
        network: 'disconnected',
        error: error instanceof Error ? error.message : 'Connection failed',
      });
    } finally {
      setIsLoading(false);
    }
  }, [lineraConnect]);

  const disconnect = useCallback(() => {
    lineraDisconnect();
    setWallet(initialWalletState);
    console.log('🔌 Wallet disconnected');
  }, [lineraDisconnect]);

  const refreshBalance = useCallback(async () => {
    if (!wallet.isConnected) return;
    
    console.log('🔄 Refreshing data...');
    // TODO: Implement balance refresh via chronosApi
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