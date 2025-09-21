export type NotificationType =
  | 'system'
  | 'message'
  | 'reminder'
  | 'achievement'
  | 'warning'
  | 'info';

export type NotificationPriority = 'low' | 'medium' | 'high';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  readAt?: Date;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  avatarUrl?: string;
  senderName?: string;
}

export interface NotificationGroup {
  date: string;
  data: Notification[];
}

// Push notification specific types
export interface PushToken {
  id: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  device_name: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: {
    screen?: string;
    [key: string]: any;
  };
  badge?: number;
  sound?: string | boolean;
}

export interface SendNotificationRequest {
  user_ids?: string[];
  tokens?: string[];
  notification: NotificationPayload;
  scheduled_at?: string;
}

export interface NotificationHistory {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data?: any;
  status: 'sent' | 'delivered' | 'failed';
  sent_at: Date;
  delivered_at?: Date;
  read_at?: Date;
  error?: string;
}