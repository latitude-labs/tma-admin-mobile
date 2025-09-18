# Offline Functionality Documentation

## Overview

The TMA Admin mobile app implements offline-first functionality to ensure coaches can use the app even in venues without reliable internet connectivity. The system captures operations while offline and automatically syncs when the device reconnects.

## Architecture

### Core Components

#### 1. Queue Processor (`services/offline/queueProcessor.ts`)
Handles processing of queued operations when the device comes online.

- **Purpose**: Process sync queue operations in order
- **Features**:
  - Automatic retry with exponential backoff
  - Priority-based processing (high, normal, low)
  - Batch processing for efficiency
  - Network state monitoring

#### 2. Sync Store (`store/syncStore.ts`)
Manages the queue of operations waiting to be synced.

- **Persisted Data**:
  - Queue of pending operations
  - Last sync timestamp
  - Sync errors
  - Rate limiting state

#### 3. Offline Storage (`services/offline/storage.ts`)
Handles local data caching using AsyncStorage.

- **Cached Data**:
  - Clubs
  - Bookings
  - Class times
  - Coach classes
  - Last sync times

## How It Works

### Read Operations (Always Available Offline)

1. **Cache-First Loading**: When data is requested, the app first loads from local cache
2. **Background Refresh**: If online, fresh data is fetched in the background
3. **Fallback**: If the API fails, cached data is used

Example flow for loading bookings:
```
User opens bookings → Load from cache → Display immediately → Fetch fresh data (if online) → Update display
```

### Write Operations (Queued When Offline)

1. **Immediate UI Update**: Changes appear instantly in the app (optimistic updates)
2. **Queue Operation**: The operation is added to the sync queue
3. **Sync When Online**: Queue is processed automatically when connectivity returns

Example flow for marking attendance:
```
Coach marks student present → UI updates immediately → Operation queued → Synced when online
```

## Supported Offline Operations

### Bookings
- Update booking status (completed, no-show)
- Mark attendance
- Cancel bookings

### Attendance
- Mark students present/absent
- Bulk attendance updates

### Trials
- Create new trials
- Update trial status
- Convert trials to memberships

### End of Day Reports
- Submit reports
- Update existing reports

## Queue Command Structure

Each queued operation contains:
```typescript
{
  id: string;                    // Unique identifier
  type: 'create' | 'update' | 'delete';
  entity: string;                // What type of data
  operation: string;             // Specific operation
  data: any;                     // Operation payload
  metadata: {
    timestamp: number;           // When created
    priority: 'high' | 'normal' | 'low';
    version: number;             // For conflict resolution
  };
  retries: number;              // Retry count
  maxRetries: number;           // Maximum retry attempts
}
```

## Sync Process

### Automatic Sync
The app automatically syncs when:
- Device comes back online
- App is opened while online
- User performs pull-to-refresh

### Manual Sync
Users can trigger sync by:
- Pull-to-refresh on any list screen
- Tapping the sync status indicator

### Rate Limiting
To prevent server overload:
- Maximum 3 sync attempts per 2-minute window
- Exponential backoff on failures: 1s, 2s, 4s, 8s, 16s

## Conflict Resolution

When the same data is modified both offline and online:

1. **Last-Write-Wins**: Default strategy for most operations
2. **Server Priority**: For critical data (e.g., payment status)
3. **Manual Resolution**: Complex conflicts stored for user review

## Error Handling

### Transient Errors (Retried)
- Network timeouts
- Server errors (5xx)
- Rate limiting

### Permanent Errors (Not Retried)
- Invalid data (400)
- Unauthorized (401)
- Not found (404)

### User Notification
- Sync errors displayed in banner
- Critical failures shown as alerts
- Conflict warnings for manual resolution

## UI Indicators

### Network Status Banner
Shows current connection state:
- 🟢 Online - All systems operational
- 🟡 Syncing - Processing queued operations
- 🔴 Offline - Working in offline mode

### Sync Progress
- Number of pending operations
- Current sync status
- Last successful sync time

### Data Freshness
- Visual indicators for stale data
- Last updated timestamps
- Automatic refresh prompts

## Storage Limits

### AsyncStorage Capacity
- Maximum ~6MB on Android
- Maximum ~10MB on iOS
- Automatic cleanup of old data

### Cache Expiration
- Bookings: 7 days
- Class times: 30 days
- Clubs: 30 days
- Coach classes: 7 days

## Testing Offline Mode

### Simulator Testing
1. Enable Airplane Mode
2. Perform operations (they'll be queued)
3. Disable Airplane Mode
4. Watch sync process

### Network Conditioning
Use device settings to simulate:
- Poor connectivity
- Intermittent connection
- High latency

## Troubleshooting

### Common Issues

**Queue not processing:**
- Check network connectivity
- Verify rate limiting hasn't been triggered
- Look for sync errors in the app

**Data not updating:**
- Pull-to-refresh to force sync
- Check last sync time
- Clear cache if data is corrupted

**Conflicts appearing:**
- Review conflict details
- Choose resolution strategy
- Contact support if unclear

### Debug Information
Access debug info through:
- Developer menu (shake device)
- Sync status details
- Error logs in console

## Best Practices

### For Developers
1. Always implement optimistic updates for better UX
2. Set appropriate priority levels for operations
3. Handle conflicts gracefully
4. Test offline scenarios thoroughly

### For Users
1. Sync before going to offline venues
2. Check sync status after returning online
3. Review any conflict notifications
4. Keep app updated for latest offline features

## Future Enhancements

Planned improvements:
- Selective sync for specific data types
- Compression for reduced storage
- Background sync on iOS
- Predictive pre-caching
- Offline analytics