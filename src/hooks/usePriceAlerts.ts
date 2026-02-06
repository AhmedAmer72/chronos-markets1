/**
 * usePriceAlerts Hook
 * 
 * Manage price alerts for markets.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  priceAlerts, 
  createPriceAlert, 
  deletePriceAlert, 
  getActiveAlerts,
  onPriceAlert,
  type PriceAlert,
  type AlertNotification,
} from '../lib/alerts';

export interface UsePriceAlertsResult {
  alerts: PriceAlert[];
  activeAlerts: PriceAlert[];
  createAlert: (params: {
    marketId: number;
    marketQuestion: string;
    targetPrice: number;
    condition: 'above' | 'below';
    isYes: boolean;
  }) => PriceAlert;
  deleteAlert: (id: string) => boolean;
  requestPermission: () => Promise<NotificationPermission>;
  lastNotification: AlertNotification | null;
}

export function usePriceAlerts(marketId?: number): UsePriceAlertsResult {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [lastNotification, setLastNotification] = useState<AlertNotification | null>(null);

  useEffect(() => {
    // Load initial alerts
    const loadAlerts = () => {
      const all = priceAlerts.getAlerts();
      setAlerts(marketId ? all.filter(a => a.marketId === marketId) : all);
    };

    loadAlerts();

    // Subscribe to alert notifications
    const unsubscribe = onPriceAlert((notification) => {
      setLastNotification(notification);
      loadAlerts(); // Refresh alerts list
    });

    return () => {
      unsubscribe();
    };
  }, [marketId]);

  const handleCreateAlert = useCallback((params: {
    marketId: number;
    marketQuestion: string;
    targetPrice: number;
    condition: 'above' | 'below';
    isYes: boolean;
  }) => {
    const alert = createPriceAlert(params);
    setAlerts(prev => [...prev, alert]);
    return alert;
  }, []);

  const handleDeleteAlert = useCallback((id: string) => {
    const result = deletePriceAlert(id);
    if (result) {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }
    return result;
  }, []);

  const requestPermission = useCallback(async () => {
    return priceAlerts.requestPermission();
  }, []);

  return {
    alerts,
    activeAlerts: getActiveAlerts(),
    createAlert: handleCreateAlert,
    deleteAlert: handleDeleteAlert,
    requestPermission,
    lastNotification,
  };
}

export default usePriceAlerts;
