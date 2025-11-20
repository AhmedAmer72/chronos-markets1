import React, { createContext, useContext, useState, useEffect } from 'react';

// Chronos Markets - Deployed Application Configuration
const CHRONOS_APPLICATION_ID = '51804de22a3c25a48edbf5bdad4b3efe82fb1201b22e031c4e2a5be24f76288d';
const DEFAULT_NODE_URL = 'http://localhost:8080';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  chainId: string | null;
  applicationId?: string;
}

interface WalletContextType {
  wallet: WalletState;
  connect: () => Promise<void>;
  disconnect: () => void;
  isLoading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: null,
    chainId: null,
    applicationId: CHRONOS_APPLICATION_ID,
  });
  const [isLoading, setIsLoading] = useState(false);

  const connect = async () => {
    setIsLoading(true);
    try {
      const nodeUrl = import.meta.env.VITE_LINERA_NODE_URL || DEFAULT_NODE_URL;
      
      console.log('🔗 Connecting to Linera devnet:', nodeUrl);
      console.log('📦 Application ID:', CHRONOS_APPLICATION_ID);
      
      // Query the default chain using GraphQL
      const graphqlQuery = {
        query: `
          query {
            chains {
              list
            }
          }
        `
      };
      
      const response = await fetch(`${nodeUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graphqlQuery),
      });
      
      if (response.ok) {
        const result = await response.json();
        const chainList = result.data?.chains?.list;
        
        if (chainList && chainList.length > 0) {
          // Use the first chain (default chain)
          const defaultChainId = chainList[0];
          
          setWallet({
            isConnected: true,
            address: defaultChainId.slice(0, 10) + '...',
            balance: '100',
            chainId: defaultChainId,
            applicationId: CHRONOS_APPLICATION_ID,
          });
          
          console.log('✅ Connected to Linera wallet:', {
            chainId: defaultChainId,
            chainCount: chainList.length,
            applicationId: CHRONOS_APPLICATION_ID,
          });
        }
      }
    } catch (error) {
      console.error('❌ Failed to connect wallet:', error);
      console.log('⚠️  Using mock wallet for development');
      // Still set a mock connection for development
      setWallet({
        isConnected: true,
        address: '0x7db73562d191ff70cddd76d2f7b1cc1ba7d10c90',
        balance: '100',
        chainId: '83aabd7b2c03657a540594a376dd972c3b1760b4348904a86d908b8102518b69',
        applicationId: CHRONOS_APPLICATION_ID,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setWallet({
      isConnected: false,
      address: null,
      balance: null,
      chainId: null,
    });
  };

  return (
    <WalletContext.Provider value={{ wallet, connect, disconnect, isLoading }}>
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