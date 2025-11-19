# Notification System API Requirements

## Overview
This document outlines the backend API requirements for implementing the notification system in the TMA Admin mobile application. The notification system should support real-time notifications, persistent storage, user preferences, and tracking of notification interactions.

## Database Schema

### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL, -- 'system', 'message', 'reminder', 'achievement', 'warning', 'info'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  seen_at TIMESTAMP WITH TIME ZONE, -- When user first viewed the notification
  action_url TEXT,
  action_label VARCHAR(100),
  metadata JSONB, -- Additional data for the notification
  avatar_url TEXT,
  sender_name VARCHAR(255),
  sender_id UUID REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_timestamp ON notifications(timestamp DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
```

### Notification Preferences Table
```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,

  -- Notification type preferences
  system_notifications BOOLEAN DEFAULT TRUE,
  message_notifications BOOLEAN DEFAULT TRUE,
  reminder_notifications BOOLEAN DEFAULT TRUE,
  achievement_notifications BOOLEAN DEFAULT TRUE,
  warning_notifications BOOLEAN DEFAULT TRUE,
  info_notifications BOOLEAN DEFAULT TRUE,

  -- Timing preferences
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,

  -- Device tokens for push notifications
  push_tokens JSONB DEFAULT '[]', -- Array of {token, platform, updated_at}

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### 1. Get Notifications
```http
GET /api/v1/notifications
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Query Parameters:**
- `limit` (integer, default: 50): Maximum number of notifications to return
- `offset` (integer, default: 0): Pagination offset
- `filter` (string): 'all', 'unread', 'read'
- `type` (string): Filter by notification type
- `priority` (string): Filter by priority
- `sort` (string, default: 'timestamp:desc'): Sort order

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "message",
        "priority": "high",
        "title": "New message from John Doe",
        "message": "Hey, I wanted to discuss...",
        "timestamp": "2025-01-19T10:30:00Z",
        "read": false,
        "readAt": null,
        "seenAt": null,
        "actionUrl": "/messages/123",
        "actionLabel": "View Message",
        "metadata": {
          "messageId": "123",
          "conversationId": "456"
        },
        "avatarUrl": "https://example.com/avatar.jpg",
        "senderName": "John Doe",
        "senderId": "user-uuid"
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    },
    "unreadCount": 12
  }
}
```

### 2. Mark Notification as Read
```http
PATCH /api/v1/notifications/{notificationId}/read
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Request Body:**
```json
{
  "readAt": "2025-01-19T10:35:00Z",
  "seenAt": "2025-01-19T10:35:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### 3. Mark Multiple Notifications as Read
```http
PATCH /api/v1/notifications/bulk-read
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Request Body:**
```json
{
  "notificationIds": ["uuid1", "uuid2", "uuid3"],
  "readAt": "2025-01-19T10:35:00Z",
  "seenAt": "2025-01-19T10:35:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "3 notifications marked as read"
}
```

### 4. Delete Notification
```http
DELETE /api/v1/notifications/{notificationId}
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification deleted"
}
```

### 5. Clear All Notifications
```http
DELETE /api/v1/notifications/clear-all
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Query Parameters:**
- `userId` (UUID): User ID to clear notifications for

**Response:**
```json
{
  "success": true,
  "message": "All notifications cleared",
  "deletedCount": 45
}
```

### 6. Get Notification Preferences
```http
GET /api/v1/notifications/preferences
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pushEnabled": true,
    "emailEnabled": true,
    "inAppEnabled": true,
    "systemNotifications": true,
    "messageNotifications": true,
    "reminderNotifications": true,
    "achievementNotifications": true,
    "warningNotifications": true,
    "infoNotifications": true,
    "quietHoursEnabled": false,
    "quietHoursStart": null,
    "quietHoursEnd": null
  }
}
```

### 7. Update Notification Preferences
```http
PUT /api/v1/notifications/preferences
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Request Body:**
```json
{
  "pushEnabled": true,
  "emailEnabled": false,
  "messageNotifications": true,
  "quietHoursEnabled": true,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "08:00"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Preferences updated successfully"
}
```

### 8. Register Push Token
```http
POST /api/v1/notifications/push-token
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Request Body:**
```json
{
  "token": "ExponentPushToken[xxxxxx]",
  "platform": "ios", // or "android"
  "deviceId": "device-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Push token registered"
}
```

### 9. Create Notification (Admin/System Use)
```http
POST /api/v1/notifications
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}",
  "X-Admin-Key": "{admin-key}"
}
```

**Request Body:**
```json
{
  "userId": "user-uuid", // or "userIds": ["uuid1", "uuid2"] for bulk
  "type": "message",
  "priority": "high",
  "title": "New message",
  "message": "You have a new message",
  "actionUrl": "/messages/123",
  "actionLabel": "View",
  "metadata": {
    "custom": "data"
  },
  "sendPush": true,
  "sendEmail": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notificationId": "uuid",
    "sent": {
      "inApp": true,
      "push": true,
      "email": false
    }
  }
}
```

## WebSocket/Real-time Events

### WebSocket Connection
```javascript
ws://api.example.com/notifications/realtime?token={auth-token}
```

### Event Types

#### New Notification
```json
{
  "event": "notification:new",
  "data": {
    "id": "uuid",
    "type": "message",
    "title": "New message",
    "message": "You have a new message",
    "timestamp": "2025-01-19T10:30:00Z",
    // ... full notification object
  }
}
```

#### Notification Updated
```json
{
  "event": "notification:updated",
  "data": {
    "id": "uuid",
    "changes": {
      "read": true,
      "readAt": "2025-01-19T10:35:00Z"
    }
  }
}
```

#### Notification Deleted
```json
{
  "event": "notification:deleted",
  "data": {
    "id": "uuid"
  }
}
```

## Push Notification Payload

### iOS (APNs)
```json
{
  "aps": {
    "alert": {
      "title": "New message from John Doe",
      "body": "Hey, I wanted to discuss..."
    },
    "badge": 5,
    "sound": "default",
    "category": "MESSAGE"
  },
  "data": {
    "notificationId": "uuid",
    "type": "message",
    "actionUrl": "/messages/123"
  }
}
```

### Android (FCM)
```json
{
  "notification": {
    "title": "New message from John Doe",
    "body": "Hey, I wanted to discuss...",
    "icon": "ic_notification",
    "color": "#FF8133"
  },
  "data": {
    "notificationId": "uuid",
    "type": "message",
    "actionUrl": "/messages/123"
  },
  "priority": "high"
}
```

## Business Logic Requirements

### 1. Notification Creation Triggers
- **New Message**: When a user receives a direct message or comment
- **Training Reminder**: 30 minutes before scheduled training session
- **Achievement**: When team reaches milestones (e.g., 100 sessions)
- **System Alert**: For maintenance, updates, or important announcements
- **Warning**: For incomplete tasks or required actions
- **Info**: For new features or tips

### 2. Automatic Cleanup
- Delete read notifications older than 30 days
- Delete unread notifications older than 90 days
- Keep maximum 1000 notifications per user
- Archive important notifications instead of deleting

### 3. Rate Limiting
- Maximum 100 notifications per user per hour
- Maximum 500 notifications per user per day
- Batch similar notifications (e.g., "You have 5 new messages")

### 4. Priority Handling
- **High Priority**: Send push notification immediately
- **Medium Priority**: Include in next batch (5-minute intervals)
- **Low Priority**: Only show in-app, no push

### 5. Seen vs Read Tracking
- **Seen At**: Timestamp when notification first appears on user's screen
- **Read At**: Timestamp when user interacts with notification
- Use for analytics and engagement metrics

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Users can only access their own notifications
3. **Admin Access**: Special admin endpoints require additional API key
4. **Data Sanitization**: Sanitize HTML in notification messages
5. **Rate Limiting**: Implement per-user and per-IP rate limits
6. **Encryption**: Encrypt sensitive metadata in database

## Performance Optimizations

1. **Pagination**: Always paginate large result sets
2. **Caching**: Cache unread count for quick access
3. **Indexing**: Index frequently queried columns
4. **Batch Operations**: Support bulk updates/deletes
5. **Async Processing**: Queue notification sending for better performance

## Monitoring & Analytics

Track the following metrics:
- Notification delivery rate
- Read rate by notification type
- Time to read (seen_at to read_at)
- Click-through rate for action buttons
- Push notification opt-out rate
- Most/least engaging notification types

## Testing Checklist

- [ ] Create notifications for all types
- [ ] Test pagination with large datasets
- [ ] Verify real-time updates via WebSocket
- [ ] Test push notifications on iOS and Android
- [ ] Verify rate limiting works correctly
- [ ] Test bulk operations performance
- [ ] Verify automatic cleanup jobs
- [ ] Test notification preferences enforcement
- [ ] Check security and authorization
- [ ] Load test with concurrent users