import { Notification } from '@/types/notification';
import apiClient from './api/client';

interface NotificationListResponse {
  success: boolean;
  data: {
    notifications: any[];
    unreadCount: number;
    lastModified?: string;
  };
  meta?: {
    current_page: number;
    per_page: number;
    total: number;
  };
}

interface UnreadCountResponse {
  success: boolean;
  data: {
    unreadCount: number;
  };
}

class NotificationService {
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastModified: string | null = null;

  /**
   * Initialize notification service and setup polling
   */
  async initialize() {
    // Start polling for notifications
    this.startPolling();
  }


  /**
   * Fetch notifications from the API
   */
  async fetchNotifications(filter: 'all' | 'unread' | 'read' = 'all', page: number = 1): Promise<{ notifications: Notification[], unreadCount: number }> {
    try {
      const headers: any = {};

      // Add If-Modified-Since header for efficient polling
      if (this.lastModified) {
        headers['If-Modified-Since'] = this.lastModified;
      }

      const response = await apiClient.get<NotificationListResponse>(
        '/v1/notifications',
        {
          headers,
          params: {
            page,
            per_page: 50,
            filter,
          },
        }
      );

      // Update lastModified from response headers
      if (response.headers['last-modified']) {
        this.lastModified = response.headers['last-modified'];
      }

      // Transform the backend response to match our frontend types
      const notifications = response.data.data.notifications.map(this.transformNotification);

      return {
        notifications,
        unreadCount: response.data.data.unreadCount,
      };
    } catch (error: any) {
      // Handle 304 Not Modified response
      if (error.response?.status === 304) {
        return { notifications: [], unreadCount: 0 };
      }
      console.error('Failed to fetch notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count (lightweight endpoint)
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get<UnreadCountResponse>(
        '/v1/notifications/unread-count'
      );

      return response.data.data.unreadCount;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await apiClient.patch(
        `/v1/notifications/${notificationId}/read`,
        {}
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.patch(
        '/v1/notifications/mark-all-read',
        {}
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await apiClient.delete(
        `/v1/notifications/${notificationId}`
      );
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }

  /**
   * Transform backend notification to frontend format
   */
  private transformNotification(backendNotif: any): Notification {
    return {
      id: backendNotif.id,
      type: backendNotif.type,
      priority: backendNotif.priority,
      title: backendNotif.title,
      message: backendNotif.message,
      timestamp: new Date(backendNotif.timestamp),
      read: backendNotif.read,
      readAt: backendNotif.readAt ? new Date(backendNotif.readAt) : undefined,
      actionUrl: backendNotif.actionUrl,
      actionLabel: backendNotif.actionLabel,
      metadata: backendNotif.metadata,
      avatarUrl: backendNotif.avatarUrl,
      senderName: backendNotif.senderName,
    };
  }

  /**
   * Start polling for new notifications
   */
  startPolling(onUpdate?: (unreadCount: number) => void, intervalMs: number = 30000) {
    // Clear any existing polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    console.log('NotificationService: Starting polling with interval:', intervalMs);

    // Poll immediately on start
    this.pollUnreadCount(onUpdate);

    // Then poll at intervals
    this.pollingInterval = setInterval(() => {
      console.log('NotificationService: Polling for unread count...');
      this.pollUnreadCount(onUpdate);
    }, intervalMs);
  }

  /**
   * Poll for unread count
   */
  private async pollUnreadCount(onUpdate?: (unreadCount: number) => void) {
    try {
      const count = await this.getUnreadCount();
      console.log('NotificationService: Received unread count:', count);
      if (onUpdate) {
        onUpdate(count);
      }
    } catch (error) {
      console.error('NotificationService: Polling error:', error);
      // Don't stop polling on error, just log it
    }
  }

  /**
   * Stop polling for notifications
   */
  stopPolling() {
    console.log('NotificationService: Stopping polling');
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Reset cached last modified timestamp
   */
  resetCache() {
    this.lastModified = null;
  }
}

export const notificationService = new NotificationService();