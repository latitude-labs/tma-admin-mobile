import { create } from 'zustand';
import * as Notifications from 'expo-notifications';
import { notificationService } from '@/services/notification.service';
import { notificationApiService } from '@/services/api/notification.service';
import { Notification } from '@/types/notification';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  data?: any;
  timestamp: Date;
  read: boolean;
}

interface NotificationState {
  // Push token
  pushToken: string | null;

  // Notifications (from API)
  notifications: Notification[];
  // Local push notifications
  localNotifications: NotificationItem[];
  unreadCount: number;

  // Filtering
  filter: 'all' | 'unread' | 'read';

  // Permissions
  hasPermission: boolean;

  // Loading states
  isInitializing: boolean;
  isSendingToken: boolean;
  isLoading: boolean;
  error: string | null;

  // Polling
  pollingInterval: NodeJS.Timeout | null;

  // Actions - Push notifications
  initialize: () => Promise<void>;
  cleanup: () => Promise<void>;
  addNotification: (notification: Notifications.Notification) => void;
  setPushToken: (token: string | null) => void;
  setHasPermission: (hasPermission: boolean) => void;
  refreshPermissions: () => Promise<void>;
  testLocalNotification: () => Promise<void>;
  testBackendNotification: () => Promise<void>;

  // Actions - API notifications
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  setFilter: (filter: 'all' | 'unread' | 'read') => void;
  clearNotifications: () => void;
  startPolling: () => void;
  stopPolling: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Initial state
  pushToken: null,
  notifications: [],
  localNotifications: [],
  unreadCount: 0,
  filter: 'all',
  hasPermission: false,
  isInitializing: false,
  isSendingToken: false,
  isLoading: false,
  error: null,
  pollingInterval: null,

  // Initialize notifications
  initialize: async () => {
    set({ isInitializing: true });

    try {
      // Check if notifications are enabled
      const hasPermission = await notificationService.areNotificationsEnabled();
      set({ hasPermission });

      if (hasPermission) {
        // Register for push notifications
        const token = await notificationService.registerForPushNotifications();

        if (token) {
          set({ pushToken: token, isSendingToken: true });

          // Send token to backend
          await notificationService.sendTokenToBackend(token);
          set({ isSendingToken: false });
        }
      }

      // Initialize listeners
      notificationService.initializeListeners(
        // On notification received
        (notification) => {
          get().addNotification(notification);
        },
        // On notification interaction
        (response) => {
          const notificationId = response.notification.request.identifier;
          get().markAsRead(notificationId);

          // Handle navigation based on notification data
          const data = response.notification.request.content.data;
          if (data?.screen) {
            // Navigation will be handled by the app layout
            console.log('Navigate to:', data.screen);
          }
        }
      );

      // Clear badge on app open
      await notificationService.clearBadge();
    } catch (error) {
      console.error('Error initializing notifications:', error);
    } finally {
      set({ isInitializing: false });
    }
  },

  // Add a new local push notification
  addNotification: (notification) => {
    const newNotification: NotificationItem = {
      id: notification.request.identifier,
      title: notification.request.content.title || 'Notification',
      body: notification.request.content.body || '',
      data: notification.request.content.data,
      timestamp: new Date(notification.date),
      read: false,
    };

    set((state) => ({
      localNotifications: [newNotification, ...state.localNotifications],
    }));

    // Also fetch latest notifications from API to sync
    get().fetchNotifications();
  },

  // Fetch notifications from API
  fetchNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filter } = get();
      const result = await notificationApiService.fetchNotifications(filter);

      set({
        notifications: result.notifications,
        unreadCount: result.unreadCount,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Failed to fetch notifications:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to load notifications',
      });
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    try {
      // Optimistically update UI
      set((state) => {
        const notifications = state.notifications.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true, readAt: new Date() } : notif
        );
        const unreadCount = notifications.filter((n) => !n.read).length;
        return { notifications, unreadCount };
      });

      // Call API
      await notificationApiService.markAsRead(notificationId);

      // Clear badge if no more unread
      const { unreadCount } = get();
      if (unreadCount === 0) {
        notificationService.clearBadge();
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Revert on error
      get().fetchNotifications();
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      // Optimistically update UI
      set((state) => ({
        notifications: state.notifications.map((notif) => ({
          ...notif,
          read: true,
          readAt: notif.read ? notif.readAt : new Date(),
        })),
        unreadCount: 0,
      }));

      // Call API
      await notificationApiService.markAllAsRead();

      // Clear badge
      notificationService.clearBadge();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Revert on error
      get().fetchNotifications();
    }
  },

  // Delete a specific notification
  deleteNotification: async (notificationId) => {
    try {
      // Optimistically update UI
      set((state) => {
        const notifications = state.notifications.filter((n) => n.id !== notificationId);
        const unreadCount = notifications.filter((n) => !n.read).length;
        return { notifications, unreadCount };
      });

      // Call API
      await notificationApiService.deleteNotification(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      // Revert on error
      get().fetchNotifications();
    }
  },

  // Set filter
  setFilter: (filter) => {
    set({ filter });
    get().fetchNotifications();
  },

  // Clear all notifications
  clearNotifications: () => {
    set({ notifications: [], localNotifications: [], unreadCount: 0 });
    notificationService.dismissAllNotifications();
  },

  // Start polling for notifications
  startPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) return; // Already polling

    // Fetch immediately
    get().fetchNotifications();

    // Poll every 30 seconds
    const interval = setInterval(() => {
      get().fetchNotifications();
    }, 30000);

    set({ pollingInterval: interval });
  },

  // Stop polling
  stopPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) {
      clearInterval(pollingInterval);
      set({ pollingInterval: null });
    }
  },

  // Set push token
  setPushToken: (token) => {
    set({ pushToken: token });
  },

  // Set permission status
  setHasPermission: (hasPermission) => {
    set({ hasPermission });
  },

  // Refresh permission status
  refreshPermissions: async () => {
    const hasPermission = await notificationService.areNotificationsEnabled();
    set({ hasPermission });

    if (!hasPermission) {
      // Request permissions
      const granted = await notificationService.requestPermissions();
      if (granted) {
        set({ hasPermission: true });
        // Re-initialize if permissions were granted
        get().initialize();
      }
    }
  },

  // Test local notification
  testLocalNotification: async () => {
    await notificationService.scheduleLocalNotification(
      'Test Notification',
      'This is a test notification from TMA Admin',
      { test: true, timestamp: Date.now() },
      2
    );
  },

  // Test backend notification
  testBackendNotification: async () => {
    await notificationService.sendTestNotification();
  },

  // Cleanup on logout
  cleanup: async () => {
    const { pushToken } = get();

    // Stop polling
    get().stopPolling();

    // Remove push token from backend if it exists
    if (pushToken) {
      await notificationService.removePushToken(pushToken);
    }

    // Remove listeners
    notificationService.removeListeners();

    // Reset state
    set({
      pushToken: null,
      notifications: [],
      localNotifications: [],
      unreadCount: 0,
      filter: 'all',
      hasPermission: false,
      isInitializing: false,
      isSendingToken: false,
      isLoading: false,
      error: null,
      pollingInterval: null,
    });
  },
}));