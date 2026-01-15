/**
 * Linera Module - Re-exports for clean imports
 * 
 * Based on: https://github.com/NeoCrafts-cpu/Linera-Mine
 */

// WASM initialization
export { ensureWasmInitialized, isWasmReady, resetWasmInit } from './wasmInit';

// Linera adapter singleton
export { 
  lineraAdapter, 
  LineraAdapterClass,
  type LineraConnection,
  type ApplicationConnection,
} from './lineraAdapter';
