# Testing Offline Mode

## Setup

1. **Run the app on a physical device or emulator**
   ```bash
   npm run ios
   # or
   npm run android
   ```

2. **Login to the app** with your credentials

## Testing Scenarios

### 1. Basic Offline Read Test
1. Load the bookings screen while online
2. Enable Airplane Mode on your device
3. Navigate around the app - data should still be visible
4. Check the Network Status Banner - should show "Offline Mode"

### 2. Offline Write Operations
1. While in Airplane Mode:
   - Mark a booking as "no-show"
   - Update a booking status
   - Submit an attendance record
2. Notice the UI updates immediately (optimistic updates)
3. Check the Network Status Banner - should show pending operations count
4. Tap the banner to see details of queued operations

### 3. Sync on Reconnection
1. With pending operations in the queue, disable Airplane Mode
2. Watch the Network Status Banner change to "Syncing..."
3. Operations should process automatically
4. Banner should disappear when all operations complete

### 4. Error Handling
1. Create operations while offline
2. Before reconnecting, modify data on the server (to create a conflict)
3. Reconnect and observe error handling
4. Check if retry button appears in the banner

### 5. App Background/Foreground
1. Queue some operations while offline
2. Put the app in background
3. Reconnect to network
4. Bring app to foreground
5. Sync should trigger automatically

## Verification Points

✅ **Network Status Banner**
- Shows when offline
- Shows pending operations count
- Shows sync progress
- Shows errors with retry option

✅ **Data Persistence**
- Data remains available offline
- Changes persist across app restarts
- Queue persists across app restarts

✅ **Optimistic Updates**
- UI updates immediately when offline
- No lag or freezing

✅ **Automatic Sync**
- Triggers on network reconnection
- Processes queue in order
- Handles failures with retries

## Debug Commands (React Native Debugger)

```javascript
// Check sync queue status
import { useSyncStore } from '@/store/syncStore';
console.log(useSyncStore.getState().syncQueue);

// Force sync
import { syncManager } from '@/services/offline/syncManager';
syncManager.forceSyncNow();

// Check offline status
import { offlineStorage } from '@/services/offline/storage';
await offlineStorage.isOnline();
```

## Common Issues

### Queue not processing
- Check if rate limiting is active (3 attempts per 2 minutes)
- Verify network connectivity
- Check for API errors in console

### Data not showing offline
- Ensure data was loaded while online first
- Check if cache has expired
- Pull-to-refresh while online to populate cache

### Sync errors
- Check API endpoint availability
- Verify authentication token hasn't expired
- Review error details in Network Status Banner

## Performance Testing

1. **Large Queue Test**
   - Create 20+ operations while offline
   - Verify all sync successfully
   - Check for performance issues

2. **Poor Network Test**
   - Use Network Link Conditioner (iOS) or similar
   - Test with high latency/packet loss
   - Verify retry mechanism works

3. **Storage Limit Test**
   - Cache large amounts of data
   - Verify cleanup mechanisms
   - Check for storage warnings