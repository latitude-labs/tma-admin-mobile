import { queueProcessor } from './queueProcessor';
import { useSyncStore } from '@/store/syncStore';
import { offlineStorage } from './storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';

class SyncManager {
  private static instance: SyncManager;
  private isInitialized: boolean = false;
  private appStateSubscription: any;

  static getInstance(): SyncManager {
    if (!this.instance) {
      this.instance = new SyncManager();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;

    // Listen for app state changes (foreground/background)
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );

    // Check and process queue on startup
    const isOnline = await offlineStorage.isOnline();
    if (isOnline) {
      await this.sync();
    }

    // Set up periodic sync check (every 30 seconds when online)
    setInterval(async () => {
      const isOnline = await offlineStorage.isOnline();
      const syncStore = useSyncStore.getState();

      if (isOnline && syncStore.syncQueue.length > 0 && !syncStore.isSyncing) {
        await this.sync();
      }
    }, 30000);
  }

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'active') {
      // App came to foreground, try to sync
      this.sync();
    }
  }

  async sync(): Promise<void> {
    try {
      await queueProcessor.processQueue();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  async forceSyncNow(): Promise<void> {
    const syncStore = useSyncStore.getState();

    // Clear any rate limiting to allow immediate sync
    syncStore.clearSyncErrors();

    // Force process the queue
    await queueProcessor.forceSync();
  }

  getQueueStatus(): {
    pendingCount: number;
    isSyncing: boolean;
    lastSyncTime: number | null;
    hasErrors: boolean;
  } {
    const syncStore = useSyncStore.getState();
    return {
      pendingCount: syncStore.syncQueue.length,
      isSyncing: syncStore.isSyncing,
      lastSyncTime: syncStore.lastSyncTime,
      hasErrors: syncStore.syncErrors.length > 0,
    };
  }

  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }
}

export const syncManager = SyncManager.getInstance();