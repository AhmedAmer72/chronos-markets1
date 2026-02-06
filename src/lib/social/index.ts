/**
 * Social Module Exports
 */

// User Profiles
export {
  userProfiles,
  getCurrentProfile,
  initializeProfile,
  updateProfile,
  followUser,
  unfollowUser,
  isFollowing,
  type UserProfile,
  type TradingStats,
  type PublicProfile,
} from './userProfiles';

// Leaderboard
export {
  leaderboard,
  getLeaderboard,
  getTopTraders,
  getUserRank,
  getLeaderboardStats,
  type LeaderboardPeriod,
  type LeaderboardStats,
  type CachedLeaderboard,
} from './leaderboard';

// Notifications
export {
  notifications,
  notify,
  getNotifications,
  getUnreadNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  onNewNotification,
  onUnreadCountChange,
  type Notification,
  type NotificationType,
  type NotificationPreferences,
} from './notifications';

// Sharing
export {
  shareToTwitter,
  shareNative,
  copyShareLink,
  getMarketShareUrl,
  generateShareText,
  getEmbedCode,
  type ShareParams,
} from './sharing';

// Copy Trading
export {
  copyTrading,
  startCopyingTrader,
  stopCopyingTrader,
  isCopyingTrader,
  getCopyConfigs,
  getCopyTradeHistory,
  type CopyTradingConfig,
  type CopyTrade,
} from './copyTrading';
