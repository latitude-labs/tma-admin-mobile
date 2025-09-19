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