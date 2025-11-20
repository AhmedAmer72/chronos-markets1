/**
 * Chronos Markets - Smart Contract Integration
 * 
 * This service provides methods to interact with the deployed Linera prediction market contract.
 * Application ID: 83aabd7b2c03657a540594a376dd972c3b1760b4348904a86d908b8102518b69
 */

const APPLICATION_ID = '51804de22a3c25a48edbf5bdad4b3efe82fb1201b22e031c4e2a5be24f76288d';
const NODE_URL = import.meta.env.VITE_LINERA_NODE_URL || 'http://localhost:8080';

export interface Market {
  id: number;
  creator: string;
  question: string;
  description: string;
  end_time: number;
  yes_pool: string;
  no_pool: string;
  total_liquidity: string;
  resolved: boolean;
  outcome: 'Yes' | 'No' | null;
}

export interface Position {
  market_id: number;
  outcome: 'Yes' | 'No';
  shares: string;
}

/**
 * Create a new prediction market
 */
export async function createMarket(params: {
  question: string;
  description: string;
  endTime: number;
  initialLiquidity: string;
}): Promise<{ success: boolean; marketId?: number; error?: string }> {
  try {
    const mutation = {
      query: `
        mutation {
          operation(
            chainId: "${APPLICATION_ID}",
            operation: {
              CreateMarket: {
                question: "${params.question}",
                description: "${params.description}",
                end_time: ${params.endTime},
                initial_liquidity: "${params.initialLiquidity}"
              }
            }
          ) {
            ... on OperationSuccess {
              response
            }
          }
        }
      `
    };

    const response = await fetch(`${NODE_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mutation),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return { success: false, error: result.errors[0]?.message || 'Unknown error' };
    }

    // Extract market ID from response
    const marketId = result.data?.operation?.response?.marketId;
    
    return { success: true, marketId };
  } catch (error) {
    console.error('Failed to create market:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Buy shares in a market
 */
export async function buyShares(params: {
  marketId: number;
  outcome: 'Yes' | 'No';
  amount: string;
}): Promise<{ success: boolean; shares?: string; error?: string }> {
  try {
    const mutation = {
      query: `
        mutation {
          operation(
            chainId: "${APPLICATION_ID}",
            operation: {
              BuyShares: {
                market_id: ${params.marketId},
                outcome: "${params.outcome}",
                amount: "${params.amount}"
              }
            }
          ) {
            ... on OperationSuccess {
              response
            }
          }
        }
      `
    };

    const response = await fetch(`${NODE_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mutation),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return { success: false, error: result.errors[0]?.message || 'Unknown error' };
    }

    const shares = result.data?.operation?.response?.shares;
    
    return { success: true, shares };
  } catch (error) {
    console.error('Failed to buy shares:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Resolve a market (creator only)
 */
export async function resolveMarket(params: {
  marketId: number;
  outcome: 'Yes' | 'No';
}): Promise<{ success: boolean; error?: string }> {
  try {
    const mutation = {
      query: `
        mutation {
          operation(
            chainId: "${APPLICATION_ID}",
            operation: {
              ResolveMarket: {
                market_id: ${params.marketId},
                outcome: "${params.outcome}"
              }
            }
          ) {
            ... on OperationSuccess {
              response
            }
          }
        }
      `
    };

    const response = await fetch(`${NODE_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mutation),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return { success: false, error: result.errors[0]?.message || 'Unknown error' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to resolve market:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Claim winnings from a resolved market
 */
export async function claimWinnings(params: {
  marketId: number;
}): Promise<{ success: boolean; amount?: string; error?: string }> {
  try {
    const mutation = {
      query: `
        mutation {
          operation(
            chainId: "${APPLICATION_ID}",
            operation: {
              ClaimWinnings: {
                market_id: ${params.marketId}
              }
            }
          ) {
            ... on OperationSuccess {
              response
            }
          }
        }
      `
    };

    const response = await fetch(`${NODE_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mutation),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return { success: false, error: result.errors[0]?.message || 'Unknown error' };
    }

    const amount = result.data?.operation?.response?.amount;
    
    return { success: true, amount };
  } catch (error) {
    console.error('Failed to claim winnings:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Query total volume across all markets
 */
export async function getTotalVolume(): Promise<{ volume: string; error?: string }> {
  try {
    const query = {
      query: `
        query {
          application(chainId: "${APPLICATION_ID}") {
            totalVolume
          }
        }
      `
    };

    const response = await fetch(`${NODE_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return { volume: '0', error: result.errors[0]?.message };
    }

    const volume = result.data?.application?.totalVolume || '0';
    
    return { volume };
  } catch (error) {
    console.error('Failed to get total volume:', error);
    return { volume: '0', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Check if devnet service is running
 */
export async function checkDevnetConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${NODE_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default {
  APPLICATION_ID,
  NODE_URL,
  createMarket,
  buyShares,
  resolveMarket,
  claimWinnings,
  getTotalVolume,
  checkDevnetConnection,
};
