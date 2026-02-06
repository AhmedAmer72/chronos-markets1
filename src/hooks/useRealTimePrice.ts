/**
 * useRealTimePrice Hook
 * 
 * Subscribe to real-time price updates for a market.
 */

import { useState, useEffect, useCallback } from 'react';
import { subscribeToPrices, refreshPrices, type PriceUpdate } from '../lib/websocket';

export interface UseRealTimePriceResult {
  price: PriceUpdate | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useRealTimePrice(marketId: number): UseRealTimePriceResult {
  const [price, setPrice] = useState<PriceUpdate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToPrices(marketId, (update) => {
      setPrice(update);
      setIsLoading(false);
    });

    // Initial loading state timeout
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [marketId]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await refreshPrices();
    setIsLoading(false);
  }, []);

  return { price, isLoading, refresh };
}

export default useRealTimePrice;
