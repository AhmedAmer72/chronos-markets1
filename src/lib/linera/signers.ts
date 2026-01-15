/**
 * MetaMask/EVM Signer for Linera
 * 
 * Creates a signer that uses MetaMask (or any EVM wallet) to sign Linera operations.
 * Based on Linera-Arcade pattern.
 */

// EVM wallet interface
interface EVMWallet {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

/**
 * Signer interface that Linera client expects
 */
export interface Signer {
  sign(owner: string, value: Uint8Array): Promise<string>;
  containsKey(owner: string): Promise<boolean>;
}

/**
 * MetaMask/EVM Signer for Linera operations
 */
export class MetaMaskSigner implements Signer {
  private wallet: EVMWallet;
  private address: string;

  constructor(wallet: EVMWallet, address: string) {
    this.wallet = wallet;
    this.address = address.toLowerCase();
  }

  /**
   * Sign a message using EIP-191 personal_sign
   */
  async sign(_owner: string, value: Uint8Array): Promise<string> {
    try {
      console.log('✍️ Requesting signature from MetaMask...');
      
      // Convert to hex
      const messageHex = '0x' + Array.from(value)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // personal_sign with MetaMask
      const signature = await this.wallet.request({
        method: 'personal_sign',
        params: [messageHex, this.address],
      });

      console.log('✅ Message signed successfully');
      return signature as string;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Signing failed:', message);
      throw new Error(`Failed to sign with MetaMask: ${message}`);
    }
  }

  /**
   * Check if this signer can sign for the given owner
   */
  async containsKey(owner: string): Promise<boolean> {
    return owner.toLowerCase() === this.address;
  }
}

/**
 * Development signer for testing (no wallet popup)
 */
export class DevSigner implements Signer {
  private address: string;

  constructor() {
    // Generate a random address
    const randomBytes = crypto.getRandomValues(new Uint8Array(20));
    this.address = '0x' + Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async sign(_owner: string, value: Uint8Array): Promise<string> {
    // Simple mock signature using SHA-256
    const buffer = new ArrayBuffer(value.length);
    new Uint8Array(buffer).set(value);
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return '0x' + Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async containsKey(owner: string): Promise<boolean> {
    return owner.toLowerCase() === this.address.toLowerCase();
  }

  getAddress(): string {
    return this.address;
  }
}

/**
 * Auto-signer that signs automatically without popups (session-based)
 */
export class AutoSigner implements Signer {
  private privateKey: Uint8Array;
  private address: string;

  constructor() {
    this.privateKey = crypto.getRandomValues(new Uint8Array(32));
    this.address = '0x' + Array.from(this.privateKey.slice(0, 20))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async sign(_owner: string, value: Uint8Array): Promise<string> {
    // Use HMAC-SHA256 for consistent but secure signing
    const key = await crypto.subtle.importKey(
      'raw',
      this.privateKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, value);
    return '0x' + Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async containsKey(owner: string): Promise<boolean> {
    return owner.toLowerCase() === this.address.toLowerCase();
  }

  getAddress(): string {
    return this.address;
  }
}

/**
 * Create a MetaMask signer if available
 */
export async function createMetaMaskSigner(): Promise<MetaMaskSigner | null> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    }) as string[];

    if (!accounts || accounts.length === 0) {
      return null;
    }

    return new MetaMaskSigner(window.ethereum, accounts[0]);
  } catch (error) {
    console.warn('Failed to connect MetaMask:', error);
    return null;
  }
}

// Extend Window for Ethereum
declare global {
  interface Window {
    ethereum?: EVMWallet;
  }
}
