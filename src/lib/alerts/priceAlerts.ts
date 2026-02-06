/**
 * Price Alerts Service
 * 
 * Allows users to set price alerts for markets.
 * Triggers notifications when target prices are hit.
 */

import { subscribeToPrices, type PriceUpdate } from '../websocket';

// Types
export interface PriceAlert {
  id: string;
  marketId: number;
  marketQuestion: string;
  targetPrice: number;
  condition: 'above' | 'below';
  isYes: boolean; // true for YES price, false for NO price
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
}

export interface AlertNotification {
  alert: PriceAlert;
  currentPrice: number;
  timestamp: number;
}

type AlertCallback = (notification: AlertNotification) => void;

// Storage key
const ALERTS_STORAGE_KEY = 'chronos_price_alerts';

/**
 * Price Alerts Manager
 */
class PriceAlertsManager {
  private static instance: PriceAlertsManager;
  
  private alerts: Map<string, PriceAlert> = new Map();
  private alertCallbacks: Set<AlertCallback> = new Set();
  private unsubscribers: Map<number, () => void> = new Map();
  private subscribedMarkets: Set<number> = new Set();
  
  private constructor() {
    this.loadAlerts();
  }
  
  static getInstance(): PriceAlertsManager {
    if (!PriceAlertsManager.instance) {
      PriceAlertsManager.instance = new PriceAlertsManager();
    }
    return PriceAlertsManager.instance;
  }
  
  /**
   * Load alerts from localStorage
   */
  private loadAlerts(): void {
    try {
      const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (stored) {
        const alertsArray: PriceAlert[] = JSON.parse(stored);
        alertsArray.forEach(alert => {
          this.alerts.set(alert.id, alert);
          if (!alert.triggered) {
            this.ensureSubscription(alert.marketId);
          }
        });
        console.log(`📢 Loaded ${alertsArray.length} price alerts`);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  }
  
  /**
   * Save alerts to localStorage
   */
  private saveAlerts(): void {
    try {
      const alertsArray = Array.from(this.alerts.values());
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alertsArray));
    } catch (error) {
      console.error('Failed to save alerts:', error);
    }
  }
  
  /**
   * Ensure we're subscribed to price updates for a market
   */
  private ensureSubscription(marketId: number): void {
    if (this.subscribedMarkets.has(marketId)) return;
    
    this.subscribedMarkets.add(marketId);
    const unsubscribe = subscribeToPrices(marketId, (update) => {
      this.checkAlerts(update);
    });
    this.unsubscribers.set(marketId, unsubscribe);
  }
  
  /**
   * Check if any alerts should be triggered
   */
  private checkAlerts(update: PriceUpdate): void {
    const marketAlerts = Array.from(this.alerts.values())
      .filter(a => a.marketId === update.marketId && !a.triggered);
    
    for (const alert of marketAlerts) {
      const currentPrice = alert.isYes ? update.yesPrice : update.noPrice;
      let shouldTrigger = false;
      
      if (alert.condition === 'above' && currentPrice >= alert.targetPrice) {
        shouldTrigger = true;
      } else if (alert.condition === 'below' && currentPrice <= alert.targetPrice) {
        shouldTrigger = true;
      }
      
      if (shouldTrigger) {
        this.triggerAlert(alert, currentPrice);
      }
    }
  }
  
  /**
   * Trigger an alert
   */
  private triggerAlert(alert: PriceAlert, currentPrice: number): void {
    alert.triggered = true;
    alert.triggeredAt = Date.now();
    this.alerts.set(alert.id, alert);
    this.saveAlerts();
    
    const notification: AlertNotification = {
      alert,
      currentPrice,
      timestamp: Date.now(),
    };
    
    // Notify all callbacks
    this.alertCallbacks.forEach(callback => callback(notification));
    
    // Browser notification if permitted
    this.showBrowserNotification(notification);
    
    console.log(`🔔 Alert triggered: ${alert.marketQuestion} ${alert.condition} ${alert.targetPrice}`);
    
    // Cleanup subscription if no more active alerts for this market
    this.cleanupSubscription(alert.marketId);
  }
  
  /**
   * Show browser notification
   */
  private async showBrowserNotification(notification: AlertNotification): Promise<void> {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    
    if (Notification.permission === 'granted') {
      const { alert, currentPrice } = notification;
      const priceType = alert.isYes ? 'YES' : 'NO';
      const priceDisplay = (currentPrice * 100).toFixed(0);
      
      new Notification('Price Alert Triggered! 🔔', {
        body: `${alert.marketQuestion}\n${priceType} price is now ${priceDisplay}¢ (target: ${(alert.targetPrice * 100).toFixed(0)}¢)`,
        icon: '/favicon.ico',
        tag: `alert-${alert.id}`,
      });
    }
  }
  
  /**
   * Cleanup subscription if no more active alerts for a market
   */
  private cleanupSubscription(marketId: number): void {
    const activeAlerts = Array.from(this.alerts.values())
      .filter(a => a.marketId === marketId && !a.triggered);
    
    if (activeAlerts.length === 0) {
      const unsubscribe = this.unsubscribers.get(marketId);
      if (unsubscribe) {
        unsubscribe();
        this.unsubscribers.delete(marketId);
        this.subscribedMarkets.delete(marketId);
      }
    }
  }
  
  /**
   * Create a new price alert
   */
  createAlert(params: {
    marketId: number;
    marketQuestion: string;
    targetPrice: number;
    condition: 'above' | 'below';
    isYes: boolean;
  }): PriceAlert {
    const alert: PriceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      marketId: params.marketId,
      marketQuestion: params.marketQuestion,
      targetPrice: params.targetPrice,
      condition: params.condition,
      isYes: params.isYes,
      createdAt: Date.now(),
      triggered: false,
    };
    
    this.alerts.set(alert.id, alert);
    this.saveAlerts();
    this.ensureSubscription(params.marketId);
    
    console.log(`📢 Created price alert: ${params.condition} ${params.targetPrice} for market ${params.marketId}`);
    
    return alert;
  }
  
  /**
   * Delete an alert
   */
  deleteAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    
    this.alerts.delete(alertId);
    this.saveAlerts();
    this.cleanupSubscription(alert.marketId);
    
    return true;
  }
  
  /**
   * Get all alerts
   */
  getAlerts(): PriceAlert[] {
    return Array.from(this.alerts.values());
  }
  
  /**
   * Get active (non-triggered) alerts
   */
  getActiveAlerts(): PriceAlert[] {
    return Array.from(this.alerts.values()).filter(a => !a.triggered);
  }
  
  /**
   * Get alerts for a specific market
   */
  getAlertsForMarket(marketId: number): PriceAlert[] {
    return Array.from(this.alerts.values()).filter(a => a.marketId === marketId);
  }
  
  /**
   * Subscribe to alert notifications
   */
  onAlert(callback: AlertCallback): () => void {
    this.alertCallbacks.add(callback);
    return () => {
      this.alertCallbacks.delete(callback);
    };
  }
  
  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.requestPermission();
  }
  
  /**
   * Clear all triggered alerts
   */
  clearTriggeredAlerts(): void {
    const activeAlerts = Array.from(this.alerts.values()).filter(a => !a.triggered);
    this.alerts.clear();
    activeAlerts.forEach(a => this.alerts.set(a.id, a));
    this.saveAlerts();
  }
}

// Export singleton
export const priceAlerts = PriceAlertsManager.getInstance();

// Export convenience functions
export function createPriceAlert(params: {
  marketId: number;
  marketQuestion: string;
  targetPrice: number;
  condition: 'above' | 'below';
  isYes: boolean;
}): PriceAlert {
  return priceAlerts.createAlert(params);
}

export function deletePriceAlert(alertId: string): boolean {
  return priceAlerts.deleteAlert(alertId);
}

export function getActiveAlerts(): PriceAlert[] {
  return priceAlerts.getActiveAlerts();
}

export function onPriceAlert(callback: (notification: AlertNotification) => void): () => void {
  return priceAlerts.onAlert(callback);
}
