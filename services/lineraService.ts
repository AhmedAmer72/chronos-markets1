// Linera blockchain service for Windows
export class LineraService {
  private baseUrl = 'http://localhost:8080';

  async getChains() {
    try {
      const response = await fetch(`${this.baseUrl}/chains`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get chains:', error);
      throw error;
    }
  }

  async getBalance(chainId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/chains/${chainId}/balance`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  async submitTransaction(chainId: string, transaction: any) {
    try {
      const response = await fetch(`${this.baseUrl}/chains/${chainId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to submit transaction:', error);
      throw error;
    }
  }
}

export const lineraService = new LineraService();