import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/auth.service';
import { User, LoginRequest, LoginResponse } from '../types/auth';
import { apiClient } from '../services/api/client';
import { router } from 'expo-router';
import { useSyncStore } from './syncStore';
import { useEndOfDayStore } from './endOfDayStore';
import { useBookingStore } from './bookingStore';
import { useClubStore } from './clubStore';
import { useNotificationStore } from './notificationStore';
import { twoFactorService } from '../services/twoFactor.service';
import { secureStorage, STORAGE_KEYS } from '../utils/secureStorage';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  expiresAt: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  twoFactorRequired: boolean;
  twoFactorPending: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  completeLogin: (token: string, user: User, expiresAt: string) => Promise<void>;
  logout: () => Promise<void>;
  forceLogout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setTwoFactorRequired: (required: boolean) => void;
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
      twoFactorRequired: false,
      twoFactorPending: false,

      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(credentials);

          console.log('📱 LOGIN RESPONSE:', {
            hasToken: !!response.token,
            tokenLength: response.token?.length,
            tokenPrefix: response.token?.substring(0, 50),
            hasUser: !!response.user,
            userId: response.user?.id,
            userEmail: response.user?.email,
            requires2FA: response.requires_2fa,
            tempToken: response.temp_token,
            expiresAt: response.expires_at
          });

          // Check if we should use mock 2FA (only if explicitly enabled AND backend doesn't bypass)
          const useMock2FA = __DEV__ &&
                           process.env.EXPO_PUBLIC_USE_MOCK_2FA === 'true' &&
                           !response.token; // Only mock if backend didn't provide token

          if (useMock2FA) {
            console.log('🔧 MOCK MODE: Enabled for 2FA testing');
            // Store email for mock flow
            const SecureStore = await import('expo-secure-store');
            await SecureStore.setItemAsync('tma_mock_email', credentials.email);
          }

          // Check if 2FA is required (real or mock)
          if (response.requires_2fa || useMock2FA) {
            // Store pending auth credentials and temp token for 2FA flow
            await twoFactorService.storePendingAuth(credentials.email, credentials.password);

            // Store temp token for 2FA verification
            if (response.temp_token || useMock2FA) {
              await secureStorage.setItem('tma_temp_token', response.temp_token || 'mock-temp-token');
            }

            set({
              isLoading: false,
              twoFactorRequired: true,
              twoFactorPending: true,
              error: null,
            });

            // Navigate to 2FA verification screen
            router.push('/two-factor-verify');
            return;
          }

          // No 2FA required, complete login
          if (!response.token) {
            throw new Error('No token received from server');
          }

          // The auth service already stored the token, just store user data
          await secureStorage.setSecureObject(STORAGE_KEYS.USER_DATA, response.user);

          // Verify token is actually available in storage before setting authenticated
          const verifyToken = await secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
          if (!verifyToken) {
            console.error('❌ Token not found in storage after login!');
            throw new Error('Failed to store authentication token');
          }

          console.log('✅ Token verified in storage, completing login');

          // Small delay to ensure token propagates through the system
          await new Promise(resolve => setTimeout(resolve, 200));

          set({
            isAuthenticated: true,
            user: response.user,
            token: response.token,
            expiresAt: response.expires_at,
            isLoading: false,
            error: null,
            twoFactorRequired: false,
            twoFactorPending: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Login failed',
            isAuthenticated: false,
            user: null,
            token: null,
            twoFactorRequired: false,
            twoFactorPending: false,
          });
          throw error;
        }
      },

      completeLogin: async (token: string, user: User, expiresAt: string) => {
        console.log('📱 completeLogin called with:', {
          hasToken: !!token,
          tokenLength: token?.length,
          tokenPrefix: token?.substring(0, 20) + '...',
          user: user?.email,
          isAdmin: user?.is_admin
        });

        // Complete login after successful 2FA
        set({
          isAuthenticated: true,
          user,
          token,
          expiresAt,
          isLoading: false,
          error: null,
          twoFactorRequired: false,
          twoFactorPending: false,
        });

        // Clear pending auth
        await twoFactorService.clearPendingAuth();

        // Store in secure storage AND set it on the API client
        await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        await secureStorage.setSecureObject(STORAGE_KEYS.USER_DATA, user);

        // Set the token on the API client
        await apiClient.setAuthToken(token);

        console.log('✅ Token stored in secure storage and set on API client');
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
          // Cleanup notifications (removes push token from backend)
          await useNotificationStore.getState().cleanup();

          // Clear all auth state
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            expiresAt: null,
            isLoading: false,
            error: null,
            twoFactorRequired: false,
            twoFactorPending: false,
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

        // Cleanup notifications (removes push token from backend)
        await useNotificationStore.getState().cleanup();

        // Clear all auth state immediately without API call
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          expiresAt: null,
          isLoading: false,
          error: null,
          twoFactorRequired: false,
          twoFactorPending: false,
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

      setTwoFactorRequired: (required: boolean) => set({ twoFactorRequired: required }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
        expiresAt: state.expiresAt,
        twoFactorRequired: state.twoFactorRequired,
        twoFactorPending: state.twoFactorPending,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('🔄 AUTH STORE: Rehydrating state', {
          hasState: !!state,
          hasToken: !!state?.token,
          tokenLength: state?.token?.length,
          isAuthenticated: state?.isAuthenticated
        });

        // Register logout callback with API client after rehydration
        if (state) {
          apiClient.setLogoutCallback(state.forceLogout);

          // If there's a token in the rehydrated state, ensure it's set on the API client
          if (state.token) {
            console.log('🔑 AUTH STORE: Setting token from rehydrated state');
            // This needs to be awaited but onRehydrateStorage is sync
            // So we use a promise that won't be awaited but will still execute
            apiClient.setAuthToken(state.token).then(() => {
              console.log('✅ AUTH STORE: Token set from rehydration');
            });
          }
        }
      },
    }
  )
);