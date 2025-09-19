import axios from 'axios';
import { Notification } from '@/types/notification';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationService {
  private apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || '';
  private pollingInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize notification service and setup polling
   */
  async initialize() {
    // Register for push notifications (if needed)
    await this.registerForPushNotifications();

    // Start polling for notifications
    this.startPolling();
  }

  /**
   * Register device for push notifications
   */
  private async registerForPushNotifications() {
    try {
      // TODO: Implement push notification registration
      // This would involve getting expo push token and sending it to backend
      console.log('Push notifications registration placeholder');
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
    }
  }

  /**
   * Fetch notifications from the API
   */
  async fetchNotifications(userId: string): Promise<Notification[]> {
    try {
      const token = await AsyncStorage.getItem('authToken');

      const response = await axios.get(`${this.apiBaseUrl}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          userId,
          limit: 50,
          sort: 'timestamp:desc',
        },
      });

      return response.data.notifications;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as read/seen
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('authToken');

      await axios.patch(
        `${this.apiBaseUrl}/notifications/${notificationId}/read`,
        {
          readAt: new Date().toISOString(),
          seenAt: new Date().toISOString(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(notificationIds: string[]): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const now = new Date().toISOString();

      await axios.patch(
        `${this.apiBaseUrl}/notifications/bulk-read`,
        {
          notificationIds,
          readAt: now,
          seenAt: now,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      throw error;
    }
  }

  /**
   * Clear/delete a notification
   */
  async clearNotification(notificationId: string): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('authToken');

      await axios.delete(
        `${this.apiBaseUrl}/notifications/${notificationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error('Failed to clear notification:', error);
      throw error;
    }
  }

  /**
   * Clear all notifications for a user
   */
  async clearAllNotifications(userId: string): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('authToken');

      await axios.delete(
        `${this.apiBaseUrl}/notifications/clear-all`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            userId,
          },
        }
      );
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  async getPreferences(userId: string) {
    try {
      const token = await AsyncStorage.getItem('authToken');

      const response = await axios.get(
        `${this.apiBaseUrl}/notifications/preferences`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            userId,
          },
        }
      );

      return response.data.preferences;
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(userId: string, preferences: any) {
    try {
      const token = await AsyncStorage.getItem('authToken');

      await axios.put(
        `${this.apiBaseUrl}/notifications/preferences`,
        {
          userId,
          ...preferences,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  }

  /**
   * Start polling for new notifications
   */
  startPolling(intervalMs: number = 30000) {
    if (this.pollingInterval) {
      this.stopPolling();
    }

    this.pollingInterval = setInterval(async () => {
      try {
        // Get user from store and fetch notifications
        // This would be connected to your notification store
        console.log('Polling for new notifications...');
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop polling for notifications
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Subscribe to real-time notifications (WebSocket/SSE)
   */
  subscribeToRealTime(userId: string, onNotification: (notification: Notification) => void) {
    // TODO: Implement WebSocket or Server-Sent Events connection
    // This is a placeholder for real-time notification support
    console.log('Real-time notifications placeholder for user:', userId);
  }

  /**
   * Unsubscribe from real-time notifications
   */
  unsubscribeFromRealTime() {
    // TODO: Close WebSocket/SSE connection
    console.log('Unsubscribe from real-time notifications');
  }
}

export const notificationService = new NotificationService();