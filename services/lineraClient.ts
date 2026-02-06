/**
 * Chronos Markets - Linera Client Integration
 * 
 * This service provides the proper integration with Linera blockchain
 * using the official @linera/client SDK.
 * 
 * Testnet: https://faucet.testnet-conway.linera.net
 * 
 * The @linera/client SDK requires:
 * 1. A Wallet (created from Faucet)
 * 2. A Signer (EVM-compatible, like MetaMask)
 * 3. SharedArrayBuffer support (COOP/COEP headers)
 */

// Extend Window interface for Ethereum provider
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?: boolean;
    };
  }
}

// Configuration
export const LINERA_CONFIG = {
  // Testnet faucet URL
  FAUCET_URL: 'https://faucet.testnet-conway.linera.net',
  
  // Local devnet URL (for development)
  LOCAL_NODE_URL: 'http://localhost:8080',
  
  // Application ID (set after deployment)
  APPLICATION_ID: import.meta.env.VITE_LINERA_APP_ID || '',
  
  // Chain ID (set after wallet creation)
  CHAIN_ID: import.meta.env.VITE_LINERA_CHAIN_ID || '',
};

// Types matching @linera/client
interface Signer {
  sign(owner: string, value: Uint8Array): Promise<string>;
  containsKey(owner: string): Promise<boolean>;
}

interface LineraClient {
  frontend(): LineraFrontend;
  onNotification(callback: (notification: LineraNotification) => void): void;
  balance(): Promise<string>;
  identity(): Promise<{ chainId: string; owner: string }>;
}

interface LineraFrontend {
  application(appId: string): Promise<LineraApplication>;
  validatorVersionInfo(): Promise<unknown>;
}

interface LineraApplication {
  query(request: string, blockHash?: string | null): Promise<string>;
}

interface LineraNotification {
  reason: {
    NewBlock?: boolean;
    NewMessage?: boolean;
  };
}

// Global client instance
let lineraClient: LineraClient | null = null;
let lineraBackend: LineraApplication | null = null;
let currentChainId: string | null = null;
let currentOwner: string | null = null;

/**
 * Create a development signer (for testing only)
 * In production, use MetaMask or another EVM wallet
 */
function createDevSigner(): Signer {
  // Generate a simple dev key for testing
  const devPrivateKey = crypto.getRandomValues(new Uint8Array(32));
  const devAddress = '0x' + Array.from(devPrivateKey.slice(0, 20))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  
  return {
    async sign(_owner: string, value: Uint8Array): Promise<string> {
      // Simple mock signature for development
      // In production, this would use the actual private key
      const buffer = new ArrayBuffer(value.length);
      new Uint8Array(buffer).set(value);
      const hash = await crypto.subtle.digest('SHA-256', buffer);
      return '0x' + Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    },
    async containsKey(owner: string): Promise<boolean> {
      return owner.toLowerCase() === devAddress.toLowerCase();
    }
  };
}

/**
 * Create a MetaMask signer (for production)
 */
async function createMetaMaskSigner(): Promise<Signer | null> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }
  
  try {
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    }) as string[];
    
    if (!accounts || accounts.length === 0) {
      return null;
    }
    
    const address = accounts[0];
    
    return {
      async sign(owner: string, value: Uint8Array): Promise<string> {
        // Use EIP-191 personal_sign
        const hexValue = '0x' + Array.from(value)
          .map(b => b.toString(16).padStart(2, '0')).join('');
        
        return await window.ethereum!.request({
          method: 'personal_sign',
          params: [hexValue, owner]
        }) as string;
      },
      async containsKey(owner: string): Promise<boolean> {
        return owner.toLowerCase() === address.toLowerCase();
      }
    };
  } catch {
    return null;
  }
}

/**
 * Check if the Linera client library is available
 */
export async function isLineraAvailable(): Promise<boolean> {
  try {
    // Check for SharedArrayBuffer support (required by @linera/client)
    if (typeof SharedArrayBuffer === 'undefined') {
      console.warn('⚠️ SharedArrayBuffer not available. Enable COOP/COEP headers.');
      return false;
    }
    
    // Try to dynamically import the Linera client
    const linera = await import('@linera/client');
    return !!linera;
  } catch {
    console.warn('⚠️ @linera/client not available, using fallback mode');
    return false;
  }
}

/**
 * Initialize the Linera client
 * This should be called once when the app starts
 */
export async function initializeLinera(useTestnet: boolean = true): Promise<{
  success: boolean;
  chainId?: string;
  owner?: string;
  error?: string;
}> {
  try {
    // Dynamic import of Linera client
    const linera = await import('@linera/client');
    
    // Initialize the WebAssembly module (if init export exists)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initFn = (linera as any).default;
    if (typeof initFn === 'function') {
      await initFn();
    }
    
    // Create or load wallet from faucet
    const faucetUrl = useTestnet ? LINERA_CONFIG.FAUCET_URL : LINERA_CONFIG.LOCAL_NODE_URL;
    const faucet = new linera.Faucet(faucetUrl);
    const wallet = await faucet.createWallet();
    
    // Try MetaMask first, fall back to dev signer
    let signer = await createMetaMaskSigner();
    let signerType = 'metamask';
    
    if (!signer) {
      console.log('ℹ️ MetaMask not available, using development signer');
      signer = createDevSigner();
      signerType = 'dev';
    }
    
    // Create the client with wallet, signer, and skip_process_inbox=false
    lineraClient = new linera.Client(wallet, signer, { skipProcessInbox: false } as never) as unknown as LineraClient;
    
    // Get owner address from signer (for claiming chain)
    let ownerAddress: string;
    if (signerType === 'metamask' && window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
      ownerAddress = accounts[0];
    } else {
      // For dev signer, generate a random address
      ownerAddress = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(20)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // Claim a chain from the faucet
    const chainId = await faucet.claimChain(wallet, ownerAddress);
    currentChainId = chainId;
    currentOwner = ownerAddress;
    
    console.log('✅ Linera initialized successfully');
    console.log('📍 Chain ID:', chainId);
    console.log('👤 Owner:', ownerAddress);
    console.log('🔐 Signer type:', signerType);
    
    return { success: true, chainId, owner: ownerAddress };
  } catch (error) {
    console.error('❌ Failed to initialize Linera:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Connect to an application
 */
export async function connectToApplication(applicationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!lineraClient) {
    return { success: false, error: 'Linera client not initialized' };
  }
  
  try {
    lineraBackend = await lineraClient.frontend().application(applicationId);
    console.log('✅ Connected to application:', applicationId);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to connect to application:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Query the application state
 */
export async function queryApplication(graphqlQuery: string): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
}> {
  if (!lineraBackend) {
    return { success: false, error: 'Not connected to application' };
  }
  
  try {
    const request = JSON.stringify({ query: graphqlQuery });
    const response = await lineraBackend.query(request);
    const data = JSON.parse(response);
    
    if (data.errors) {
      return { success: false, error: data.errors[0]?.message };
    }
    
    return { success: true, data: data.data };
  } catch (error) {
    console.error('❌ Query failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Execute a mutation (operation) on the application
 * Mutations cause the client to propose new blocks
 */
export async function executeMutation(graphqlMutation: string): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
}> {
  if (!lineraBackend) {
    return { success: false, error: 'Not connected to application' };
  }
  
  try {
    const request = JSON.stringify({ query: graphqlMutation });
    const response = await lineraBackend.query(request);
    const data = JSON.parse(response);
    
    if (data.errors) {
      return { success: false, error: data.errors[0]?.message };
    }
    
    return { success: true, data: data.data };
  } catch (error) {
    console.error('❌ Mutation failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Subscribe to chain notifications
 */
export function subscribeToNotifications(
  callback: (notification: { type: string; data: unknown }) => void
): void {
  if (!lineraClient) {
    console.warn('⚠️ Cannot subscribe: Linera client not initialized');
    return;
  }
  
  lineraClient.onNotification((notification) => {
    if (notification.reason.NewBlock) {
      callback({ type: 'NewBlock', data: notification });
    }
    if (notification.reason.NewMessage) {
      callback({ type: 'NewMessage', data: notification });
    }
  });
}

/**
 * Get the current client status
 */
export function getClientStatus(): {
  initialized: boolean;
  connectedToApp: boolean;
} {
  return {
    initialized: !!lineraClient,
    connectedToApp: !!lineraBackend,
  };
}

export default {
  LINERA_CONFIG,
  isLineraAvailable,
  initializeLinera,
  connectToApplication,
  queryApplication,
  executeMutation,
  subscribeToNotifications,
  getClientStatus,
};
