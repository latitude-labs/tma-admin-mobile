import apiClient from './client';
import { Notification } from '@/types/notification';

export interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
  lastModified?: string;
  total: number;
}

class NotificationApiService {
  /**
   * Fetch notifications with optional filtering
   */
  async fetchNotifications(filter: 'all' | 'unread' | 'read' = 'all', page: number = 1): Promise<NotificationResponse> {
    try {
      const response = await apiClient.get('/v1/notifications', {
        params: {
          page,
          filter,
          per_page: 50,
        },
      });

      const rawData = response.data ?? {};
      const payload = rawData.data ?? rawData;
      const meta = rawData.meta ?? payload.meta ?? {};

      const notificationSource = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.notifications)
        ? payload.notifications
        : Array.isArray(payload.data)
        ? payload.data
        : [];

      const notifications = notificationSource
        .map((item: any) => {
          const createdAt = item.created_at ?? item.createdAt ?? item.timestamp;
          const readAtRaw = item.read_at ?? item.readAt;
          const rawId = item.id ?? item.uuid ?? item.notificationId;

          if (!rawId) {
            return null;
          }

          return {
            id: String(rawId),
            type: item.type || 'info',
            priority: item.priority || 'medium',
            title: item.title || item.message || 'Notification',
            message: item.body ?? item.message ?? '',
            timestamp: createdAt ? new Date(createdAt) : new Date(),
            read: typeof item.read === 'boolean' ? item.read : readAtRaw != null,
            readAt: readAtRaw ? new Date(readAtRaw) : undefined,
            actionUrl: item.action_url ?? item.actionUrl,
            actionLabel: item.action_label ?? item.actionLabel,
            metadata: item.metadata,
            avatarUrl: item.avatar_url ?? item.avatarUrl,
            senderName: item.sender_name ?? item.senderName,
          } as Notification;
        })
        .filter((notification): notification is Notification => Boolean(notification));

      const unreadCount =
        payload.unreadCount ??
        payload.unread_count ??
        rawData.unreadCount ??
        rawData.unread_count ??
        notifications.filter((notification) => !notification.read).length;

      const lastModifiedHeader = response.headers?.['last-modified'];
      const lastModified = lastModifiedHeader ?? payload.lastModified ?? payload.last_modified;

      const total = meta.total ?? payload.total ?? notifications.length;

      return {
        notifications,
        unreadCount,
        lastModified,
        total,
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get('/v1/notifications/unread-count');
      const rawData = response.data ?? {};
      const payload = rawData.data ?? rawData;
      return payload.unreadCount ?? payload.unread_count ?? 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await apiClient.patch(`/v1/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.patch('/v1/notifications/mark-all-read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await apiClient.delete(`/v1/notifications/${notificationId}`);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
}

export const notificationApiService = new NotificationApiService();
