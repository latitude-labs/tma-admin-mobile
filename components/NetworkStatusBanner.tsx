import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useOffline } from '@/hooks/useOffline';
import { useSyncStore } from '@/store/syncStore';
import { syncManager } from '@/services/offline/syncManager';
import { Ionicons } from '@expo/vector-icons';

export const NetworkStatusBanner: React.FC = () => {
  const { isOffline } = useOffline();
  const { isSyncing, syncQueue, syncErrors, lastSyncTime } = useSyncStore();
  const [showDetails, setShowDetails] = useState(false);

  // Don't show banner if online and no pending items
  if (!isOffline && syncQueue.length === 0 && !isSyncing) {
    return null;
  }

  const getStatusColor = () => {
    if (isOffline) return '#ef4444'; // red
    if (isSyncing) return '#f59e0b'; // amber
    if (syncErrors.length > 0) return '#f59e0b'; // amber
    return '#10b981'; // green
  };

  const getStatusIcon = () => {
    if (isOffline) return 'cloud-offline';
    if (isSyncing) return 'sync';
    if (syncErrors.length > 0) return 'alert-circle';
    return 'cloud-done';
  };

  const getStatusText = () => {
    if (isOffline) {
      return `Offline Mode${syncQueue.length > 0 ? ` (${syncQueue.length} pending)` : ''}`;
    }
    if (isSyncing) {
      return `Syncing... (${syncQueue.length} remaining)`;
    }
    if (syncErrors.length > 0) {
      return `Sync Errors (${syncErrors.length})`;
    }
    if (syncQueue.length > 0) {
      return `${syncQueue.length} items pending sync`;
    }
    return 'All synced';
  };

  const handleRetrySync = async () => {
    await syncManager.forceSyncNow();
  };

  return (
    <View
      style={{
        backgroundColor: getStatusColor(),
        paddingHorizontal: 16,
        paddingVertical: 8,
      }}
    >
      <TouchableOpacity
        onPress={() => setShowDetails(!showDetails)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Ionicons name={getStatusIcon()} size={20} color="white" />
          <Text
            style={{
              color: 'white',
              marginLeft: 8,
              fontSize: 14,
              fontWeight: '600',
            }}
          >
            {getStatusText()}
          </Text>
          {isSyncing && (
            <ActivityIndicator
              size="small"
              color="white"
              style={{ marginLeft: 8 }}
            />
          )}
        </View>
        {(syncQueue.length > 0 || syncErrors.length > 0) && !isSyncing && (
          <TouchableOpacity
            onPress={handleRetrySync}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 4,
            }}
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
              Retry
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {showDetails && (syncQueue.length > 0 || syncErrors.length > 0) && (
        <View
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255, 255, 255, 0.2)',
          }}
        >
          {syncQueue.length > 0 && (
            <View style={{ marginBottom: 4 }}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                Pending Operations:
              </Text>
              {syncQueue.slice(0, 3).map((item, index) => (
                <Text
                  key={item.id}
                  style={{ color: 'white', fontSize: 11, marginLeft: 8 }}
                >
                  • {item.entity}: {item.operation}
                  {item.retries > 0 && ` (retry ${item.retries})`}
                </Text>
              ))}
              {syncQueue.length > 3 && (
                <Text style={{ color: 'white', fontSize: 11, marginLeft: 8 }}>
                  • ... and {syncQueue.length - 3} more
                </Text>
              )}
            </View>
          )}

          {syncErrors.length > 0 && (
            <View>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                Recent Errors:
              </Text>
              {syncErrors.slice(0, 2).map((error, index) => (
                <Text
                  key={index}
                  style={{ color: 'white', fontSize: 11, marginLeft: 8 }}
                >
                  • {error}
                </Text>
              ))}
            </View>
          )}

          {lastSyncTime && (
            <Text style={{ color: 'white', fontSize: 10, marginTop: 4 }}>
              Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};