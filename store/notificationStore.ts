import { create } from 'zustand';
import { Notification } from '@/types/notification';
import { notificationService } from '@/services/notificationService';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  lastFetch: Date | null;
  isLoading: boolean;
  error: string | null;
  filter: 'all' | 'unread' | 'read';

  // Actions
  setNotifications: (notifications: Notification[]) => void;
  setUnreadCount: (count: number) => void;
  setFilter: (filter: 'all' | 'unread' | 'read') => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  lastFetch: null,
  isLoading: false,
  error: null,
  filter: 'all',

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),

  setUnreadCount: (count) => set({ unreadCount: count }),

  setFilter: (filter) => {
    set({ filter });
    get().fetchNotifications();
  },

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    })),

  markAsRead: async (notificationId) => {
    try {
      // Optimistically update UI
      const now = new Date();
      set((state) => {
        const updatedNotifications = state.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true, readAt: now } : n
        );
        return {
          notifications: updatedNotifications,
          unreadCount: updatedNotifications.filter((n) => !n.read).length,
        };
      });

      // Call API
      await notificationService.markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Revert on error
      get().fetchNotifications();
    }
  },

  markAllAsRead: async () => {
    try {
      // Optimistically update UI
      const now = new Date();
      set((state) => {
        const updatedNotifications = state.notifications.map((n) => ({
          ...n,
          read: true,
          readAt: n.read ? n.readAt : now,
        }));

        return {
          notifications: updatedNotifications,
          unreadCount: 0,
        };
      });

      // Call API
      await notificationService.markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Revert on error
      get().fetchNotifications();
    }
  },

  deleteNotification: async (notificationId) => {
    try {
      // Optimistically update UI
      set((state) => {
        const filteredNotifications = state.notifications.filter(
          (n) => n.id !== notificationId
        );
        return {
          notifications: filteredNotifications,
          unreadCount: filteredNotifications.filter((n) => !n.read).length,
        };
      });

      // Call API
      await notificationService.deleteNotification(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      // Revert on error
      get().fetchNotifications();
    }
  },

  fetchNotifications: async () => {
    set({ isLoading: true, error: null });

    try {
      const { filter } = get();
      const result = await notificationService.fetchNotifications(filter);

      set({
        notifications: result.notifications,
        unreadCount: result.unreadCount,
        lastFetch: new Date(),
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

  fetchUnreadCount: async () => {
    try {
      const count = await notificationService.getUnreadCount();
      set({ unreadCount: count });
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  startPolling: () => {
    // Poll unread count every 30 seconds
    notificationService.startPolling((count) => {
      set({ unreadCount: count });
    });

    // Fetch full notifications list every 60 seconds
    setInterval(() => {
      get().fetchNotifications();
    }, 60000);
  },

  stopPolling: () => {
    notificationService.stopPolling();
  },
}));