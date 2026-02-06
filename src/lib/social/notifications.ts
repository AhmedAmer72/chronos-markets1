/**
 * Notifications Service
 * 
 * In-app notifications for trades, follows, comments, and alerts.
 */

// Storage key
const NOTIFICATIONS_STORAGE_KEY = 'chronos_notifications';
const MAX_NOTIFICATIONS = 100;

// Types
export type NotificationType = 
  | 'trade_executed'
  | 'trade_failed'
  | 'price_alert'
  | 'market_resolved'
  | 'new_follower'
  | 'new_comment'
  | 'agent_trade'
  | 'position_update'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  browserNotifications: boolean;
  types: {
    [K in NotificationType]: boolean;
  };
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  sound: true,
  browserNotifications: true,
  types: {
    trade_executed: true,
    trade_failed: true,
    price_alert: true,
    market_resolved: true,
    new_follower: true,
    new_comment: true,
    agent_trade: true,
    position_update: true,
    system: true,
  },
};

type NotificationCallback = (notification: Notification) => void;

/**
 * Notifications Manager
 */
class NotificationsManager {
  private static instance: NotificationsManager;
  
  private notifications: Notification[] = [];
  private preferences: NotificationPreferences = DEFAULT_PREFERENCES;
  private listeners: Set<NotificationCallback> = new Set();
  private unreadCountListeners: Set<(count: number) => void> = new Set();
  
  private constructor() {
    this.loadFromStorage();
  }
  
  static getInstance(): NotificationsManager {
    if (!NotificationsManager.instance) {
      NotificationsManager.instance = new NotificationsManager();
    }
    return NotificationsManager.instance;
  }
  
  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.notifications = data.notifications || [];
        this.preferences = { ...DEFAULT_PREFERENCES, ...data.preferences };
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }
  
  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify({
        notifications: this.notifications,
        preferences: this.preferences,
      }));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }
  
  /**
   * Create and add a notification
   */
  notify(params: Omit<Notification, 'id' | 'timestamp' | 'read'>): Notification {
    // Check if this type is enabled
    if (!this.preferences.enabled || !this.preferences.types[params.type]) {
      return { ...params, id: '', timestamp: 0, read: true };
    }
    
    const notification: Notification = {
      ...params,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false,
    };
    
    // Add to beginning
    this.notifications.unshift(notification);
    
    // Trim to max
    if (this.notifications.length > MAX_NOTIFICATIONS) {
      this.notifications = this.notifications.slice(0, MAX_NOTIFICATIONS);
    }
    
    this.saveToStorage();
    this.notifyListeners(notification);
    this.notifyUnreadCountListeners();
    
    // Play sound if enabled
    if (this.preferences.sound) {
      this.playSound();
    }
    
    // Browser notification if enabled
    if (this.preferences.browserNotifications) {
      this.showBrowserNotification(notification);
    }
    
    console.log(`🔔 Notification: ${notification.title}`);
    
    return notification;
  }
  
  /**
   * Create specific notification types
   */
  notifyTradeExecuted(marketId: number, marketQuestion: string, type: 'buy' | 'sell', shares: number, isYes: boolean): void {
    this.notify({
      type: 'trade_executed',
      title: `${type === 'buy' ? 'Bought' : 'Sold'} ${shares} shares`,
      message: `${isYes ? 'YES' : 'NO'} on "${marketQuestion}"`,
      data: { marketId, type, shares, isYes },
      actionUrl: `/market/${marketId}`,
    });
  }
  
  notifyTradeFailed(error: string): void {
    this.notify({
      type: 'trade_failed',
      title: 'Trade Failed',
      message: error,
    });
  }
  
  notifyPriceAlert(marketId: number, marketQuestion: string, price: number, condition: 'above' | 'below'): void {
    this.notify({
      type: 'price_alert',
      title: 'Price Alert Triggered',
      message: `"${marketQuestion}" is now ${condition} ${(price * 100).toFixed(0)}¢`,
      data: { marketId, price, condition },
      actionUrl: `/market/${marketId}`,
    });
  }
  
  notifyMarketResolved(marketId: number, marketQuestion: string, outcome: boolean): void {
    this.notify({
      type: 'market_resolved',
      title: 'Market Resolved',
      message: `"${marketQuestion}" resolved to ${outcome ? 'YES' : 'NO'}`,
      data: { marketId, outcome },
      actionUrl: `/market/${marketId}`,
    });
  }
  
  notifyNewFollower(followerAddress: string): void {
    this.notify({
      type: 'new_follower',
      title: 'New Follower',
      message: `${followerAddress.slice(0, 8)}... started following you`,
      data: { followerAddress },
      actionUrl: `/profile/${followerAddress}`,
    });
  }
  
  notifyNewComment(marketId: number, marketQuestion: string, commenterAddress: string): void {
    this.notify({
      type: 'new_comment',
      title: 'New Comment',
      message: `${commenterAddress.slice(0, 8)}... commented on "${marketQuestion}"`,
      data: { marketId, commenterAddress },
      actionUrl: `/market/${marketId}`,
    });
  }
  
  notifyAgentTrade(agentId: number, agentName: string, action: string): void {
    this.notify({
      type: 'agent_trade',
      title: `Agent: ${agentName}`,
      message: action,
      data: { agentId },
      actionUrl: `/agent-hub`,
    });
  }
  
  /**
   * Get all notifications
   */
  getAll(): Notification[] {
    return [...this.notifications];
  }
  
  /**
   * Get unread notifications
   */
  getUnread(): Notification[] {
    return this.notifications.filter(n => !n.read);
  }
  
  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }
  
  /**
   * Mark notification as read
   */
  markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.saveToStorage();
      this.notifyUnreadCountListeners();
    }
  }
  
  /**
   * Mark all as read
   */
  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.saveToStorage();
    this.notifyUnreadCountListeners();
  }
  
  /**
   * Delete a notification
   */
  delete(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.saveToStorage();
    this.notifyUnreadCountListeners();
  }
  
  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notifications = [];
    this.saveToStorage();
    this.notifyUnreadCountListeners();
  }
  
  /**
   * Get preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }
  
  /**
   * Update preferences
   */
  updatePreferences(updates: Partial<NotificationPreferences>): void {
    this.preferences = {
      ...this.preferences,
      ...updates,
      types: {
        ...this.preferences.types,
        ...(updates.types || {}),
      },
    };
    this.saveToStorage();
  }
  
  /**
   * Request browser notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.requestPermission();
  }
  
  /**
   * Show browser notification
   */
  private async showBrowserNotification(notification: Notification): Promise<void> {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }
    
    new window.Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      tag: notification.id,
    });
  }
  
  /**
   * Play notification sound
   */
  private playSound(): void {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {}); // Ignore if blocked
    } catch {
      // Ignore audio errors
    }
  }
  
  /**
   * Subscribe to new notifications
   */
  onNotification(callback: NotificationCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  /**
   * Subscribe to unread count changes
   */
  onUnreadCountChange(callback: (count: number) => void): () => void {
    this.unreadCountListeners.add(callback);
    // Immediately call with current count
    callback(this.getUnreadCount());
    return () => this.unreadCountListeners.delete(callback);
  }
  
  private notifyListeners(notification: Notification): void {
    this.listeners.forEach(l => l(notification));
  }
  
  private notifyUnreadCountListeners(): void {
    const count = this.getUnreadCount();
    this.unreadCountListeners.forEach(l => l(count));
  }
}

// Export singleton
export const notifications = NotificationsManager.getInstance();

// Convenience exports
export function notify(params: Omit<Notification, 'id' | 'timestamp' | 'read'>): Notification {
  return notifications.notify(params);
}

export function getNotifications(): Notification[] {
  return notifications.getAll();
}

export function getUnreadNotifications(): Notification[] {
  return notifications.getUnread();
}

export function getUnreadCount(): number {
  return notifications.getUnreadCount();
}

export function markNotificationAsRead(id: string): void {
  notifications.markAsRead(id);
}

export function markAllNotificationsAsRead(): void {
  notifications.markAllAsRead();
}

export function onNewNotification(callback: NotificationCallback): () => void {
  return notifications.onNotification(callback);
}

export function onUnreadCountChange(callback: (count: number) => void): () => void {
  return notifications.onUnreadCountChange(callback);
}
