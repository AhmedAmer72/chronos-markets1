/**
 * Linera Adapter - Singleton managing all Linera blockchain interactions
 * 
 * This is the single point of contact with @linera/client.
 * All other code should use this adapter instead of importing @linera/client directly.
 * 
 * Based on Linera-Arcade pattern: https://github.com/mohamedwael201193/Linera-Arcade
 */

import { ensureWasmInitialized } from './wasmInit';
import { AutoSigner, type Signer } from './signers';

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
const APPLICATION_ID = import.meta.env.VITE_LINERA_APP_ID || '';
const DEFAULT_CHAIN_ID = import.meta.env.VITE_LINERA_CHAIN_ID || '';

// Validate APPLICATION_ID at module load (warning only, don't block)
if (!APPLICATION_ID || APPLICATION_ID === '' || APPLICATION_ID === 'placeholder') {
  console.warn('⚠️ VITE_LINERA_APP_ID is not set. Blockchain features may be limited.');
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
  signer: Signer;
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
   * 4. Claim a microchain for the user
   * 5. Create a Client with auto-signer
   * 
   * @param userAddress - Optional user address (not used, kept for API compatibility)
   * @param faucetUrl - Optional faucet URL override
   * @returns LineraConnection with client, wallet, chainId, etc.
   */
  async connect(
    userAddress?: string,
    faucetUrl: string = DEFAULT_FAUCET_URL
  ): Promise<LineraConnection> {
    // If already connected, return existing connection
    if (this.connection) {
      console.log('✅ Already connected to Linera');
      return this.connection;
    }

    // If connection in progress, wait for it
    if (this.connectPromise) {
      console.log('⏳ Connection in progress, waiting...');
      return this.connectPromise;
    }

    // Start new connection
    this.connectPromise = this.performConnect(faucetUrl);
    
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
    faucetUrl: string = DEFAULT_FAUCET_URL
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
      
      // Step 5: Create auto-signer for automatic signing
      console.log('🔑 Creating auto-signer...');
      const privateKey = signerModule.PrivateKey.createRandom();
      const address = privateKey.address();
      console.log(`   Signer address: ${address}`);
      
      // Step 6: Claim a microchain for the address
      console.log(`⛓️ Claiming microchain for ${address}...`);
      const chainId = await faucet.claimChain(wallet, address);
      console.log(`✅ Claimed chain: ${chainId}`);
      
      // Step 7: Create Linera client with signer
      // The Client constructor returns a thenable, need to await it
      console.log('🔗 Creating Linera client...');
      console.log('   (This may take 10-30 seconds to sync with validators)');
      
      // Add timeout for client creation (60 seconds)
      const clientPromise = (async () => {
        const result = new Client(wallet, privateKey);
        return await result;
      })();
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Client creation timed out after 60 seconds. The network may be slow.'));
        }, 60000);
      });
      
      const client = await Promise.race([clientPromise, timeoutPromise]);
      console.log('✅ Linera client created!');
      
      // Create our signer wrapper
      const signer = new AutoSigner();
      
      // Store connection
      this.connection = {
        client,
        wallet,
        faucet,
        chainId,
        address,
        signer,
      };
      
      console.log('✅ Connected to Linera successfully!');
      console.log(`   Chain ID: ${chainId}`);
      console.log(`   Address: ${address}`);
      
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
      throw new Error('Application ID is not configured');
    }

    // If already connected to same application, return existing
    if (this.appConnection && this.appConnection.applicationId === applicationId) {
      console.log('✅ Already connected to application');
      return this.appConnection;
    }

    try {
      console.log(`🎮 Connecting to application: ${applicationId.slice(0, 16)}...`);
      
      // Get chain instance first, then get application
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
   * @returns Parsed JSON response
   */
  async query<T = unknown>(
    graphqlQuery: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    if (!this.appConnection) {
      throw new Error('Must connect to application before querying');
    }

    const payload = variables
      ? { query: graphqlQuery, variables }
      : { query: graphqlQuery };

    try {
      console.log('📤 Sending query:', JSON.stringify(payload, null, 2));
      const result = await this.appConnection.application.query(
        JSON.stringify(payload)
      );
      
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
   * This triggers a blockchain transaction that requires wallet signing.
   * 
   * @param graphqlMutation - GraphQL mutation string
   * @param variables - Optional variables for the mutation
   * @returns Parsed JSON response
   */
  async mutate<T = unknown>(
    graphqlMutation: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    // Mutations use the same interface as queries in Linera
    // The client handles distinguishing based on GraphQL operation type
    return this.query<T>(graphqlMutation, variables);
  }

  /**
   * Set up notification listener on a chain for real-time updates
   */
  private setupChainNotifications(chain: Chain): void {
    try {
      chain.onNotification((notification: { reason?: { NewBlock?: unknown } }) => {
        if (notification.reason?.NewBlock) {
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
   * Get connected wallet address
   */
  getAddress(): string | null {
    return this.connection?.address ?? null;
  }

  /**
   * Get claimed chain ID
   */
  getChainId(): string | null {
    return this.connection?.chainId ?? null;
  }

  /**
   * Get signer address
   */
  getSignerAddress(): string | null {
    return this.connection?.address ?? null;
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
