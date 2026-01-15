/**
 * Linera Adapter - Singleton managing all Linera blockchain interactions
 * 
 * This is the single point of contact with @linera/client.
 * All other code should use this adapter instead of importing @linera/client directly.
 * 
 * Based on: https://github.com/NeoCrafts-cpu/Linera-Mine
 */

import { ensureWasmInitialized } from './wasmInit';

// Use 'any' for dynamic module types to avoid TypeScript issues with private constructors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LineraClientModule = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Faucet = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Wallet = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Application = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Chain = any;

// Cached module reference
let lineraClientModule: LineraClientModule | null = null;

/**
 * Dynamically load the @linera/client module
 */
async function getLineraClient(): Promise<LineraClientModule> {
  if (lineraClientModule) return lineraClientModule;
  try {
    lineraClientModule = await import('@linera/client');
    return lineraClientModule;
  } catch (error) {
    console.error('❌ Failed to load @linera/client:', error);
    throw error;
  }
}

// Environment configuration
const DEFAULT_FAUCET_URL = import.meta.env.VITE_LINERA_FAUCET_URL || 'https://faucet.testnet-conway.linera.net';
const APPLICATION_ID = import.meta.env.VITE_APPLICATION_ID || import.meta.env.VITE_LINERA_APP_ID || '';

// Log configuration at module load for debugging
console.log('🔧 Linera Adapter Config:');
console.log(`   Faucet URL: ${DEFAULT_FAUCET_URL}`);
console.log(`   Application ID: ${APPLICATION_ID ? APPLICATION_ID.slice(0, 16) + '...' : '(not set)'}`);

// Validate APPLICATION_ID at module load (warning only, don't block)
if (!APPLICATION_ID || APPLICATION_ID === '' || APPLICATION_ID === 'placeholder') {
  console.warn('⚠️ APPLICATION_ID is not set. Blockchain features will be limited.');
}

/**
 * Connection state after wallet connect
 */
export interface LineraConnection {
  client: Client;
  wallet: Wallet;
  faucet: Faucet;
  chainId: string;
  address: string;
  /** Auto-signer address for automatic signing without popups */
  autoSignerAddress?: string;
}

/**
 * Application connection state
 */
export interface ApplicationConnection {
  application: Application;
  applicationId: string;
  chain: Chain;
}

/**
 * Listener callback type for state changes
 */
type StateChangeListener = () => void;

/**
 * LineraAdapter - Singleton class managing Linera connections
 */
class LineraAdapterClass {
  private static instance: LineraAdapterClass | null = null;
  
  // Connection state
  private connection: LineraConnection | null = null;
  private appConnection: ApplicationConnection | null = null;
  private connectPromise: Promise<LineraConnection> | null = null;
  
  // Listeners for state changes
  private listeners: Set<StateChangeListener> = new Set();

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): LineraAdapterClass {
    if (!LineraAdapterClass.instance) {
      LineraAdapterClass.instance = new LineraAdapterClass();
    }
    return LineraAdapterClass.instance;
  }

  /**
   * Connect to Linera network
   * 
   * This will:
   * 1. Initialize WASM (if not already done)
   * 2. Connect to Conway faucet
   * 3. Create a Linera wallet
   * 4. Claim a microchain for the user address
   * 5. Create a Client
   * 
   * @param userAddress - The user's address (can be any unique identifier)
   * @param faucetUrl - Optional faucet URL override
   * @returns LineraConnection with client, wallet, chainId, etc.
   */
  async connect(
    userAddress: string,
    faucetUrl: string = DEFAULT_FAUCET_URL
  ): Promise<LineraConnection> {
    const normalizedAddress = userAddress.toLowerCase();

    // If already connected with same address, return existing connection
    if (this.connection && this.connection.address === normalizedAddress) {
      console.log('✅ Already connected to Linera');
      return this.connection;
    }

    // If connection in progress, wait for it
    if (this.connectPromise) {
      console.log('⏳ Connection in progress, waiting...');
      return this.connectPromise;
    }

    // Start new connection
    this.connectPromise = this.performConnect(faucetUrl, normalizedAddress);
    
    try {
      const connection = await this.connectPromise;
      return connection;
    } finally {
      this.connectPromise = null;
    }
  }

  /**
   * Internal connection implementation
   */
  private async performConnect(
    faucetUrl: string,
    userAddress: string
  ): Promise<LineraConnection> {
    try {
      console.log('🔄 Connecting to Linera...');
      
      // Step 1: Initialize WASM
      await ensureWasmInitialized();
      
      // Step 2: Dynamically load @linera/client
      const lineraModule = await getLineraClient();
      const { Faucet, Client, signer: signerModule } = lineraModule;
      
      // Step 3: Create faucet connection
      console.log(`📡 Connecting to faucet: ${faucetUrl}`);
      const faucet = new Faucet(faucetUrl);
      
      // Step 4: Create Linera wallet from faucet (gets genesis config)
      console.log('👛 Creating Linera wallet...');
      const wallet = await faucet.createWallet();
      
      // Step 5: Create auto-signer FIRST (for automatic signing without popups)
      // This is the key pattern from Linera-Mine
      console.log('🔑 Setting up auto-signing...');
      const autoSigner = signerModule.PrivateKey.createRandom();
      const autoSignerAddress = autoSigner.address();
      console.log(`   Auto-signer address: ${autoSignerAddress}`);
      
      // Step 6: Claim a microchain for the AUTO-SIGNER address (not user address!)
      // This makes the autoSigner the initial owner, so it can sign immediately
      console.log(`⛓️ Claiming microchain for auto-signer...`);
      const chainId = await faucet.claimChain(wallet, autoSignerAddress);
      console.log(`✅ Claimed chain: ${chainId}`);
      
      // Step 7: Create Linera client with auto-signer
      console.log('🔗 Creating Linera client with auto-signing...');
      const client = await new Client(wallet, autoSigner);
      
      // Step 8: Set auto-signer as default owner in wallet
      console.log('⛓️ Configuring wallet...');
      try {
        await wallet.setOwner(chainId, autoSignerAddress);
        console.log('✅ Wallet configured for auto-signing!');
      } catch (setOwnerError) {
        console.warn('⚠️ Could not set default owner:', setOwnerError);
      }
      
      // Store connection
      this.connection = {
        client,
        wallet,
        faucet,
        chainId,
        address: userAddress,
        autoSignerAddress,
      };
      
      console.log('✅ Connected to Linera successfully with auto-signing!');
      console.log(`   Chain ID: ${chainId}`);
      console.log(`   User Address: ${userAddress}`);
      console.log(`   Auto-Signer (chain owner): ${autoSignerAddress}`);
      
      this.notifyListeners();
      return this.connection;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to connect to Linera:', message);
      this.connection = null;
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Connect to the Chronos Markets application
   * 
   * Uses the user's claimed chain to connect to the application.
   * In Linera's multi-chain architecture, each user operates on their own chain,
   * and the application runs on each chain (accessed via the Application ID).
   * 
   * @param applicationId - Optional override for application ID
   * @returns ApplicationConnection with application instance
   */
  async connectApplication(
    applicationId: string = APPLICATION_ID
  ): Promise<ApplicationConnection> {
    if (!this.connection) {
      throw new Error('Must connect wallet before connecting to application');
    }

    if (!applicationId) {
      throw new Error('Application ID is not configured. Set VITE_APPLICATION_ID or VITE_LINERA_APP_ID in your .env');
    }

    // If already connected to same application, return existing
    if (this.appConnection && this.appConnection.applicationId === applicationId) {
      console.log('✅ Already connected to application');
      return this.appConnection;
    }

    try {
      console.log(`🎯 Connecting to application: ${applicationId.slice(0, 16)}...`);
      console.log(`⛓️ Using user's chain: ${this.connection.chainId.slice(0, 16)}...`);
      
      // Use the USER'S claimed chain, not a hardcoded hub chain
      // This is the Linera multi-chain pattern: each user has their own chain
      const chain = await this.connection.client.chain(this.connection.chainId);
      const application = await chain.application(applicationId);
      
      // Set up notifications on the chain for real-time updates
      this.setupChainNotifications(chain);
      
      this.appConnection = {
        application,
        applicationId,
        chain,
      };
      
      console.log('✅ Connected to Chronos Markets application!');
      this.notifyListeners();
      return this.appConnection;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to connect to application:', message);
      this.appConnection = null;
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Execute a GraphQL query against the application
   * 
   * @param graphqlQuery - GraphQL query string
   * @param variables - Optional variables for the query
   * @param timeoutMs - Timeout in milliseconds (default: 60s for mutations, they may take longer)
   * @returns Parsed JSON response data
   */
  async query<T = unknown>(
    graphqlQuery: string,
    variables?: Record<string, unknown>,
    timeoutMs: number = 60000
  ): Promise<T> {
    if (!this.appConnection) {
      throw new Error('Must connect to application before querying');
    }

    const payload = variables
      ? { query: graphqlQuery, variables }
      : { query: graphqlQuery };

    try {
      console.log('📤 Sending query:', JSON.stringify(payload, null, 2));
      
      // Add timeout to prevent infinite waiting during network sync
      const queryPromise = this.appConnection.application.query(
        JSON.stringify(payload)
      );
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Query timed out after ${timeoutMs / 1000}s. The network may still be syncing the application. Please try again in a few moments.`));
        }, timeoutMs);
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]);
      
      console.log('📥 Raw result:', result);
      const parsed = JSON.parse(result);
      console.log('📥 Parsed result:', JSON.stringify(parsed, null, 2));
      
      // Check for GraphQL errors
      if (parsed.errors && parsed.errors.length > 0) {
        const firstError = parsed.errors[0];
        console.error('❌ GraphQL errors:', parsed.errors);
        throw new Error(firstError.message || 'GraphQL error');
      }
      
      return parsed.data as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Query failed:', message);
      throw error;
    }
  }

  /**
   * Execute a GraphQL mutation against the application
   * This triggers a blockchain transaction.
   * 
   * Mutations require the user's chain to be synced across validators first.
   * This method includes retry logic to handle temporary sync issues.
   * 
   * @param graphqlMutation - GraphQL mutation string
   * @param variables - Optional variables for the mutation
   * @param timeoutMs - Timeout per attempt in milliseconds (default: 45s)
   * @param maxRetries - Maximum number of retry attempts (default: 4)
   * @returns Parsed JSON response
   */
  async mutate<T = unknown>(
    graphqlMutation: string,
    variables?: Record<string, unknown>,
    timeoutMs: number = 45000,
    maxRetries: number = 4
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Mutation attempt ${attempt}/${maxRetries}...`);
        
        // Use query method which handles the actual GraphQL execution
        const result = await this.query<T>(graphqlMutation, variables, timeoutMs);
        
        console.log(`✅ Mutation succeeded on attempt ${attempt}`);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ Mutation attempt ${attempt} failed:`, lastError.message);
        
        // If it's a timeout and we have retries left, wait and retry
        if (lastError.message.includes('timed out') && attempt < maxRetries) {
          const waitTime = attempt * 5000; // Exponential backoff: 5s, 10s, 15s
          console.log(`⏳ Waiting ${waitTime / 1000}s before retry (chain may be syncing)...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // For other errors, don't retry
        if (!lastError.message.includes('timed out')) {
          break;
        }
      }
    }
    
    // All retries exhausted or non-retryable error
    throw new Error(
      lastError?.message.includes('timed out')
        ? `Transaction failed after ${maxRetries} attempts. Your chain may still be syncing across the network. Please wait 2-3 minutes and try again.`
        : lastError?.message || 'Mutation failed'
    );
  }

  /**
   * Set up notification listener on a chain for real-time updates
   */
  private setupChainNotifications(chain: Chain): void {
    try {
      chain.onNotification((notification: unknown) => {
        const notif = notification as { reason?: { NewBlock?: unknown } };
        if (notif.reason?.NewBlock) {
          console.log('📦 New block received, notifying listeners...');
          this.notifyListeners();
        }
      });
    } catch (error) {
      console.warn('⚠️ Could not set up notifications:', error);
    }
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.connection !== null;
  }

  /**
   * Check if application is connected
   */
  isApplicationConnected(): boolean {
    return this.appConnection !== null;
  }

  /**
   * Get current connection (may be null)
   */
  getConnection(): LineraConnection | null {
    return this.connection;
  }

  /**
   * Get current application connection (may be null)
   */
  getApplicationConnection(): ApplicationConnection | null {
    return this.appConnection;
  }

  /**
   * Get connected wallet address (the original user address)
   */
  getAddress(): string | null {
    return this.connection?.address ?? null;
  }

  /**
   * Get the auto-signer address (the chain owner used for blockchain transactions)
   * This is the address that appears as "client" or "agent" in blockchain records
   */
  getAutoSignerAddress(): string | null {
    return this.connection?.autoSignerAddress ?? null;
  }

  /**
   * Get claimed chain ID
   */
  getChainId(): string | null {
    return this.connection?.chainId ?? null;
  }

  /**
   * Get the application ID
   */
  getApplicationId(): string {
    return APPLICATION_ID;
  }

  /**
   * Disconnect and clear all state
   */
  disconnect(): void {
    console.log('🔌 Disconnecting from Linera...');
    this.connection = null;
    this.appConnection = null;
    this.connectPromise = null;
    this.notifyListeners();
  }

  /**
   * Clear cached wallet data from IndexedDB
   * This forces a fresh wallet creation on next connect
   */
  async clearCache(): Promise<void> {
    console.log('🧹 Clearing Linera wallet cache...');
    
    // Disconnect first
    this.disconnect();
    
    // Clear IndexedDB databases used by @linera/client
    if (typeof indexedDB !== 'undefined') {
      const databases = await indexedDB.databases?.() || [];
      for (const db of databases) {
        if (db.name && (db.name.includes('linera') || db.name.includes('wallet'))) {
          console.log(`   Deleting database: ${db.name}`);
          indexedDB.deleteDatabase(db.name);
        }
      }
    }
    
    // Clear localStorage keys related to Linera
    if (typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('linera') || key.includes('wallet'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        console.log(`   Removing localStorage key: ${key}`);
        localStorage.removeItem(key);
      });
    }
    
    console.log('✅ Cache cleared. Refresh page to reconnect with fresh wallet.');
  }

  /**
   * Subscribe to state changes
   * 
   * @param listener - Callback to invoke on state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }
}

// Export singleton instance
export const lineraAdapter = LineraAdapterClass.getInstance();

// Also export the class for testing
export { LineraAdapterClass };

export default lineraAdapter;
