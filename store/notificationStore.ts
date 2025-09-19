import { create } from 'zustand';
import { Notification } from '@/types/notification';
import { mockNotifications } from '@/utils/mockNotifications';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  lastFetch: Date | null;
  isLoading: boolean;

  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  fetchNotifications: () => Promise<void>;
  logNotificationSeen: (notificationId: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: mockNotifications,
  unreadCount: mockNotifications.filter((n) => !n.read).length,
  lastFetch: null,
  isLoading: false,

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    })),

  markAsRead: (notificationId) => {
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

    // Log to server that notification was seen
    get().logNotificationSeen(notificationId);
  },

  markAllAsRead: () => {
    const now = new Date();
    set((state) => {
      const updatedNotifications = state.notifications.map((n) => ({
        ...n,
        read: true,
        readAt: n.read ? n.readAt : now,
      }));

      // Log all unread notifications as seen
      state.notifications
        .filter((n) => !n.read)
        .forEach((n) => get().logNotificationSeen(n.id));

      return {
        notifications: updatedNotifications,
        unreadCount: 0,
      };
    });
  },

  clearNotification: (notificationId) =>
    set((state) => {
      const filteredNotifications = state.notifications.filter(
        (n) => n.id !== notificationId
      );
      return {
        notifications: filteredNotifications,
        unreadCount: filteredNotifications.filter((n) => !n.read).length,
      };
    }),

  clearAllNotifications: () =>
    set({
      notifications: [],
      unreadCount: 0,
    }),

  fetchNotifications: async () => {
    set({ isLoading: true });

    try {
      // TODO: Replace with actual API call
      // const response = await api.get('/notifications');
      // const notifications = response.data;

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // For now, use mock data
      const notifications = [...mockNotifications];

      set({
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
        lastFetch: new Date(),
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ isLoading: false });
    }
  },

  logNotificationSeen: async (notificationId: string) => {
    try {
      // TODO: Replace with actual API call
      // await api.post(`/notifications/${notificationId}/seen`, {
      //   seenAt: new Date().toISOString(),
      // });

      console.log(`Notification ${notificationId} marked as seen at`, new Date().toISOString());
    } catch (error) {
      console.error('Failed to log notification seen:', error);
    }
  },
}));