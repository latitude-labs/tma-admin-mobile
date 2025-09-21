import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api/client';

// Configure how notifications should be presented when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private static instance: NotificationService;
  private notificationListener: any = null;
  private responseListener: any = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Register for push notifications and get the push token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if we're on a physical device
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices');
        return null;
      }

      // Get existing permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push notification permissions');
        return null;
      }

      // Get the push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

      let token: string;

      if (Platform.OS === 'android') {
        // For Android, set notification channel
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF8133',
        });
      }

      // Get Expo push token for Expo Go
      // In production, this will return the native FCM/APNs token
      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      token = pushToken.data;
      console.log('Push token:', token);

      // Save token locally
      await AsyncStorage.setItem('pushToken', token);

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Send push token to backend
   */
  async sendTokenToBackend(token: string): Promise<void> {
    try {
      await apiClient.post('/push-notifications/register', {
        token,
      });
      console.log('Push token registered with backend');
    } catch (error) {
      console.error('Error sending push token to backend:', error);
    }
  }

  /**
   * Remove push token from backend
   */
  async removePushToken(token: string): Promise<void> {
    try {
      await apiClient.post('/push-notifications/remove', {
        token,
      });
      console.log('Push token removed from backend');
    } catch (error) {
      console.error('Error removing push token from backend:', error);
    }
  }

  /**
   * Get all registered push tokens
   */
  async getRegisteredTokens(): Promise<string[]> {
    try {
      const response = await apiClient.get('/push-notifications/tokens');
      return response.data.tokens || [];
    } catch (error) {
      console.error('Error fetching registered tokens:', error);
      return [];
    }
  }

  /**
   * Send test push notification via backend
   */
  async sendTestNotification(): Promise<void> {
    try {
      const response = await apiClient.post('/push-notifications/test');
      console.log('Test notification sent:', response.data.message);
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('No push tokens registered for this user');
      }
      throw new Error('Failed to send test notification');
    }
  }

  /**
   * Initialize notification listeners
   */
  initializeListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
  ): void {
    // Clean up existing listeners
    this.removeListeners();

    // Listen for notifications when app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // Listen for user interaction with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response:', response);
      if (onNotificationResponse) {
        onNotificationResponse(response);
      }
    });
  }

  /**
   * Remove notification listeners
   */
  removeListeners(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }

  /**
   * Schedule a local notification (for testing)
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    seconds: number = 5
  ): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        badge: 1,
      },
      trigger: {
        seconds,
      },
    });
    return notificationId;
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get badge count (iOS only)
   */
  async getBadgeCount(): Promise<number> {
    if (Platform.OS === 'ios') {
      return await Notifications.getBadgeCountAsync();
    }
    return 0;
  }

  /**
   * Set badge count (iOS only)
   */
  async setBadgeCount(count: number): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return await Notifications.setBadgeCountAsync(count);
    }
    return false;
  }

  /**
   * Clear badge count
   */
  async clearBadge(): Promise<boolean> {
    return await this.setBadgeCount(0);
  }

  /**
   * Get all delivered notifications
   */
  async getDeliveredNotifications(): Promise<Notifications.Notification[]> {
    return await Notifications.getPresentedNotificationsAsync();
  }

  /**
   * Dismiss specific notification
   */
  async dismissNotification(notificationId: string): Promise<void> {
    await Notifications.dismissNotificationAsync(notificationId);
  }

  /**
   * Dismiss all notifications
   */
  async dismissAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Check if push notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }
}

export const notificationService = NotificationService.getInstance();