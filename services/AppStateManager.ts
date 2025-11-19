import { AppState, AppStateStatus } from 'react-native';
import { syncManager } from '@/services/offline/syncManager';
import { calendarSyncService } from '@/services/calendarSync.service';
import { useBookingStore } from '@/store/bookingStore';
import { useClubStore } from '@/store/clubStore';
import { useFacebookStore } from '@/store/facebookStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuthStore } from '@/store/authStore';
import NetInfo from '@react-native-community/netinfo';

class AppStateManager {
  private static instance: AppStateManager;
  private appStateSubscription: any = null;
  private isInitialized = false;
  private lastActiveTime: number = 0;
  private syncInProgress = false;
  private MIN_SYNC_INTERVAL = 60000; // 1 minute minimum between syncs

  static getInstance(): AppStateManager {
    if (!this.instance) {
      this.instance = new AppStateManager();
    }
    return this.instance;
  }

  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;

    // Initialize sub-systems
    syncManager.initialize();
    calendarSyncService.initialize();

    // Set up single app state listener
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );

    // Initial sync if authenticated
    const authState = useAuthStore.getState();
    if (authState.isAuthenticated) {
      this.performInitialSync();
    }
  }

  private async handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
    if (nextAppState === 'active') {
      const authState = useAuthStore.getState();

      if (!authState.isAuthenticated) {
        return;
      }

      const now = Date.now();
      const timeSinceLastActive = now - this.lastActiveTime;

      // Only sync if enough time has passed
      if (timeSinceLastActive < this.MIN_SYNC_INTERVAL) {
        console.log('[AppStateManager] Skipping sync, too soon since last sync');
        return;
      }

      console.log('[AppStateManager] App became active, checking for sync');
      this.lastActiveTime = now;

      // Check network status
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('[AppStateManager] No network, skipping sync');
        return;
      }

      // Perform sync
      await this.performBackgroundSync();
    }
  }

  private async performInitialSync(): Promise<void> {
    if (this.syncInProgress) {
      console.log('[AppStateManager] Sync already in progress, skipping');
      return;
    }

    this.syncInProgress = true;

    try {
      const authState = useAuthStore.getState();
      const user = authState.user;

      if (!user) {
        return;
      }

      console.log('[AppStateManager] Performing initial sync');

      // Initialize notifications
      const notificationStore = useNotificationStore.getState();
      notificationStore.initialize();

      // Load core data in parallel
      await Promise.all([
        this.syncBookings(false), // Use cached data if available
        this.syncClubs(),
        user.is_admin ? this.syncFacebookPages() : Promise.resolve(),
      ]);

    } catch (error) {
      console.error('[AppStateManager] Initial sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async performBackgroundSync(): Promise<void> {
    if (this.syncInProgress) {
      console.log('[AppStateManager] Sync already in progress, skipping');
      return;
    }

    this.syncInProgress = true;

    try {
      const authState = useAuthStore.getState();
      const user = authState.user;

      if (!user) {
        return;
      }

      console.log('[AppStateManager] Performing background sync');

      // Sync data in background
      await Promise.all([
        this.syncBookings(false), // Don't force refresh, use incremental sync
        this.syncClubs(),
        user.is_admin ? this.syncFacebookPages() : Promise.resolve(),
        this.syncNotifications(),
      ]);

      // Process offline queue if any
      await syncManager.sync();

    } catch (error) {
      console.error('[AppStateManager] Background sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncBookings(forceRefresh = false): Promise<void> {
    try {
      const bookingStore = useBookingStore.getState();

      // Check if we already have recent data
      if (!forceRefresh && bookingStore.isInitialized) {
        const lastSync = bookingStore.lastSyncTimestamp;
        if (lastSync) {
          const timeSinceSync = Date.now() - new Date(lastSync).getTime();
          if (timeSinceSync < 5 * 60 * 1000) { // 5 minutes
            console.log('[AppStateManager] Bookings are fresh, skipping sync');
            return;
          }
        }
      }

      await bookingStore.fetchBookings(forceRefresh);
    } catch (error) {
      console.error('[AppStateManager] Failed to sync bookings:', error);
    }
  }

  private async syncClubs(): Promise<void> {
    try {
      const clubStore = useClubStore.getState();
      await clubStore.fetchClubs();
    } catch (error) {
      console.error('[AppStateManager] Failed to sync clubs:', error);
    }
  }

  private async syncFacebookPages(): Promise<void> {
    try {
      const facebookStore = useFacebookStore.getState();

      // Check if we have recent data
      if (facebookStore.pages.length > 0 && facebookStore.lastSync) {
        const timeSinceSync = Date.now() - new Date(facebookStore.lastSync).getTime();
        if (timeSinceSync < 10 * 60 * 1000) { // 10 minutes for Facebook data
          console.log('[AppStateManager] Facebook pages are fresh, skipping sync');
          return;
        }
      }

      await facebookStore.fetchFacebookPages();
    } catch (error) {
      console.error('[AppStateManager] Failed to sync Facebook pages:', error);
    }
  }

  private async syncNotifications(): Promise<void> {
    try {
      const notificationStore = useNotificationStore.getState();
      await notificationStore.fetchNotifications();
    } catch (error) {
      console.error('[AppStateManager] Failed to sync notifications:', error);
    }
  }

  async forceSync(): Promise<void> {
    console.log('[AppStateManager] Force sync requested');
    this.lastActiveTime = 0; // Reset timer to allow immediate sync
    await this.performBackgroundSync();
  }

  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    syncManager.cleanup();
    calendarSyncService.dispose();
    this.isInitialized = false;
  }

  getSyncStatus(): {
    isSyncing: boolean;
    lastSyncTime: number;
  } {
    return {
      isSyncing: this.syncInProgress,
      lastSyncTime: this.lastActiveTime,
    };
  }
}

export const appStateManager = AppStateManager.getInstance();