/**
 * Signers for Linera
 * 
 * Provides AutoSigner for session-based automatic signing.
 * For wallet-based signing, use DynamicSigner with Dynamic.xyz.
 */

/**
 * Signer interface that Linera client expects
 */
export interface Signer {
  sign(owner: string, value: Uint8Array): Promise<string>;
  containsKey(owner: string): Promise<boolean>;
}

/**
 * Auto-signer that signs automatically without popups (session-based)
 * 
 * Used for automatic blockchain operations that don't require user confirmation.
 * Creates a random in-memory key that exists only for the current session.
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
    // Create new ArrayBuffer copies to satisfy TypeScript strict types
    const keyData = new Uint8Array(this.privateKey).buffer;
    const signData = new Uint8Array(value).buffer;
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, signData);
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
