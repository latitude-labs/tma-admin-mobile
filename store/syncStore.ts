import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'booking' | 'attendance' | 'trial' | 'student' | 'endOfDay';
  operation: string;
  data: any;
  timestamp: number;
  retries: number;
  lastError?: string;
  // For generic API calls
  endpoint?: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncQueue: SyncQueueItem[];
  syncErrors: string[];
  syncAttempts: { timestamp: number }[];
  addToQueue: (item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>) => void;
  updateQueueItemError: (id: string, error: string) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  setSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: number) => void;
  addSyncError: (error: string) => void;
  clearSyncErrors: () => void;
  incrementRetries: (id: string) => void;
  canSync: () => boolean;
  recordSyncAttempt: () => void;
  getRemainingWaitTime: () => number;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      isSyncing: false,
      lastSyncTime: null,
      syncQueue: [],
      syncErrors: [],
      syncAttempts: [],
      addToQueue: (item) =>
        set((state) => ({
          syncQueue: [
            ...state.syncQueue,
            {
              ...item,
              id: Date.now().toString(),
              timestamp: Date.now(),
              retries: 0,
            },
          ],
        })),
      removeFromQueue: (id) =>
        set((state) => ({
          syncQueue: state.syncQueue.filter((item) => item.id !== id),
        })),
      clearQueue: () => set({ syncQueue: [] }),
      setSyncing: (syncing) => set({ isSyncing: syncing }),
      setLastSyncTime: (time) => set({ lastSyncTime: time }),
      addSyncError: (error) =>
        set((state) => ({
          syncErrors: [...state.syncErrors, error],
        })),
      clearSyncErrors: () => set({ syncErrors: [] }),
      incrementRetries: (id) =>
        set((state) => ({
          syncQueue: state.syncQueue.map((item) =>
            item.id === id ? { ...item, retries: item.retries + 1 } : item
          ),
        })),
      updateQueueItemError: (id, error) =>
        set((state) => ({
          syncQueue: state.syncQueue.map((item) =>
            item.id === id ? { ...item, lastError: error } : item
          ),
        })),
      canSync: () => {
        const state = get();
        const now = Date.now();
        const twoMinutes = 2 * 60 * 1000;

        // Clean up old attempts (older than 2 minutes)
        const recentAttempts = state.syncAttempts.filter(
          attempt => now - attempt.timestamp < twoMinutes
        );

        // Update state if we cleaned up old attempts
        if (recentAttempts.length !== state.syncAttempts.length) {
          set({ syncAttempts: recentAttempts });
        }

        return recentAttempts.length < 3;
      },
      recordSyncAttempt: () => {
        set((state) => ({
          syncAttempts: [...state.syncAttempts, { timestamp: Date.now() }]
        }));
      },
      getRemainingWaitTime: () => {
        const state = get();
        const now = Date.now();
        const twoMinutes = 2 * 60 * 1000;

        const recentAttempts = state.syncAttempts.filter(
          attempt => now - attempt.timestamp < twoMinutes
        );

        if (recentAttempts.length < 3) return 0;

        // Find the oldest attempt in the window
        const oldestAttempt = Math.min(...recentAttempts.map(a => a.timestamp));
        const timeUntilOldestExpires = (oldestAttempt + twoMinutes) - now;

        return Math.max(0, timeUntilOldestExpires);
      },
    }),
    {
      name: 'sync-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);