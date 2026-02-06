/**
 * useNotifications Hook
 * 
 * Manage in-app notifications.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  notifications,
  getNotifications,
  getUnreadNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  onNewNotification,
  onUnreadCountChange,
  type Notification,
} from '../lib/social/notifications';

export interface UseNotificationsResult {
  notifications: Notification[];
  unread: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  requestPermission: () => Promise<NotificationPermission>;
}

export function useNotifications(): UseNotificationsResult {
  const [notificationsList, setNotificationsList] = useState<Notification[]>(getNotifications());
  const [unreadCount, setUnreadCount] = useState<number>(getUnreadCount());

  useEffect(() => {
    // Subscribe to new notifications
    const unsubNew = onNewNotification(() => {
      setNotificationsList(getNotifications());
    });

    // Subscribe to unread count changes
    const unsubCount = onUnreadCountChange((count) => {
      setUnreadCount(count);
    });

    return () => {
      unsubNew();
      unsubCount();
    };
  }, []);

  const markAsRead = useCallback((id: string) => {
    markNotificationAsRead(id);
    setNotificationsList(getNotifications());
  }, []);

  const markAllAsRead = useCallback(() => {
    markAllNotificationsAsRead();
    setNotificationsList(getNotifications());
  }, []);

  const deleteNotification = useCallback((id: string) => {
    notifications.delete(id);
    setNotificationsList(getNotifications());
  }, []);

  const clearAll = useCallback(() => {
    notifications.clearAll();
    setNotificationsList([]);
  }, []);

  const requestPermission = useCallback(async () => {
    return notifications.requestPermission();
  }, []);

  return {
    notifications: notificationsList,
    unread: getUnreadNotifications(),
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    requestPermission,
  };
}

export default useNotifications;
