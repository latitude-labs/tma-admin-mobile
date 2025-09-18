import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/auth.service';
import { User, LoginRequest } from '../types/auth';
import { apiClient } from '../services/api/client';
import { router } from 'expo-router';
import { useSyncStore } from './syncStore';
import { useEndOfDayStore } from './endOfDayStore';
import { useBookingStore } from './bookingStore';
import { useClubStore } from './clubStore';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  expiresAt: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  forceLogout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

// Helper function to clear all app data
const clearAllAppData = async () => {
  // Clear persisted storage keys including offline storage
  const keysToRemove = [
    '@tma_admin:token',
    'auth-storage',
    'clubs-storage',
    'facebook-storage',
    'student-storage',
    'sync-storage',
    'api-health-storage',
    // Offline storage keys
    '@tma_clubs',
    '@tma_bookings',
    '@tma_class_times',
    '@tma_coach_classes',
    '@tma_last_sync'
  ];

  try {
    await AsyncStorage.multiRemove(keysToRemove);
  } catch (e) {
    console.error('Error clearing storage:', e);
  }

  // Reset in-memory store states
  // These stores don't persist but hold cached data that should be cleared
  // Using setState to properly reset the store states
  useBookingStore.setState({
    bookings: [],
    filters: {},
    isOffline: false,
    lastSync: null,
    error: null,
    isLoading: false
  });

  useClubStore.setState({
    clubs: [],
    isOffline: false,
    lastSync: null,
    error: null,
    isLoading: false
  });

  useEndOfDayStore.setState({
    reports: [],
    currentReport: null,
    error: null,
    loading: false,
    pagination: null
  });

  // Also reset the wizard
  const endOfDayStore = useEndOfDayStore.getState();
  endOfDayStore.resetWizard();

  // Clear sync queue and errors
  const syncStore = useSyncStore.getState();
  syncStore.clearQueue();
  syncStore.clearSyncErrors();
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      expiresAt: null,
      isLoading: false,
      isInitialized: false,
      error: null,

      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(credentials);
          set({
            isAuthenticated: true,
            user: response.user,
            token: response.token,
            expiresAt: response.expires_at,
            isLoading: false,
            error: null,
          });
          return response.user;
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Login failed',
            isAuthenticated: false,
            user: null,
            token: null,
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          // Only call logout API if we have a token
          const token = get().token;
          if (token) {
            await authService.logout();
          }
        } catch (error) {
          // Still proceed with logout even if API call fails
          console.error('Logout API call failed:', error);
        } finally {
          // Clear all auth state
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            expiresAt: null,
            isLoading: false,
            error: null,
          });

          // Clear all app data (persisted storage and in-memory stores)
          await clearAllAppData();

          // Navigate to login screen
          router.replace('/login');
        }
      },

      forceLogout: async () => {
        // This is called from the API interceptor on 401
        // Don't try to call the logout API endpoint since we're already unauthorized

        // Clear all auth state immediately without API call
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          expiresAt: null,
          isLoading: false,
          error: null,
        });

        // Clear all app data (persisted storage and in-memory stores)
        await clearAllAppData();

        // Navigate to login screen
        router.replace('/login');
      },

      checkAuth: async () => {
        const state = get();

        // Mark as initialized after checking
        if (!state.token || !state.expiresAt) {
          set({ isAuthenticated: false, user: null, token: null, isInitialized: true });
          return;
        }

        // Check if token is expired
        const isExpired = new Date(state.expiresAt) < new Date();
        if (isExpired) {
          set({ isAuthenticated: false, user: null, token: null, expiresAt: null, isInitialized: true });
          return;
        }

        // Verify token with server
        const isValid = await authService.checkAuthStatus();
        if (!isValid) {
          set({ isAuthenticated: false, user: null, token: null, expiresAt: null, isInitialized: true });
        } else {
          set({ isInitialized: true });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      onRehydrateStorage: () => (state) => {
        // Register logout callback with API client after rehydration
        if (state) {
          apiClient.setLogoutCallback(state.forceLogout);
        }
      },
    },
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
        expiresAt: state.expiresAt,
      }),
    }
  )
);