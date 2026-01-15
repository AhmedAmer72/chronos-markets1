/**
 * Linera WASM Initialization Module
 * 
 * Ensures @linera/client WASM is initialized exactly once.
 * All other code should use ensureWasmInitialized() instead of calling initLinera() directly.
 * 
 * Based on Linera-Arcade pattern: https://github.com/mohamedwael201193/Linera-Arcade
 */

// Module-level state for singleton pattern
let initPromise: Promise<void> | null = null;
let initialized = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lineraModule: any = null;

/**
 * Dynamically load the @linera/client module
 */
async function getLineraModule() {
  if (lineraModule) return lineraModule;
  try {
    lineraModule = await import('@linera/client');
    return lineraModule;
  } catch (error) {
    console.error('❌ Failed to load @linera/client module:', error);
    throw error;
  }
}

/**
 * Ensures Linera WASM modules are initialized.
 * Safe to call multiple times - will only initialize once.
 * 
 * @returns Promise that resolves when WASM is ready
 */
export async function ensureWasmInitialized(): Promise<void> {
  // Already initialized - return immediately
  if (initialized) {
    return;
  }

  // Initialization in progress - wait for it
  if (initPromise) {
    return initPromise;
  }

  // Start new initialization
  initPromise = (async () => {
    try {
      console.log('🔄 Initializing Linera WASM modules...');
      const linera = await getLineraModule();
      
      // Initialize the WASM module
      if (linera.default) {
        await linera.default();
      } else if (linera.initialize) {
        await linera.initialize();
      }
      
      initialized = true;
      console.log('✅ Linera WASM modules initialized successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      
      // Handle "already initialized" error gracefully
      if (message.includes('already initialized') || message.includes('Already initialized')) {
        console.log('ℹ️ Linera WASM was already initialized');
        initialized = true;
        return;
      }
      
      console.error('❌ Failed to initialize Linera WASM:', message);
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Check if WASM has been successfully initialized.
 * 
 * @returns true if WASM is ready to use
 */
export function isWasmReady(): boolean {
  return initialized;
}

/**
 * Reset initialization state (for testing)
 */
export function resetWasmInit(): void {
  initialized = false;
  initPromise = null;
  lineraModule = null;
}
