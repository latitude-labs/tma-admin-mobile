import {
  Manrope_200ExtraLight,
  Manrope_300Light,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/components/useColorScheme';
import { ApiHealthProvider } from '../components/ApiHealthProvider';
import { AuthStatusProvider } from '../components/AuthStatusProvider';
import { LoadingScreen } from '../components/LoadingScreen';
import { ToastProvider } from '@/components/ui/Toast';
import { apiClient } from '../services/api/client';
import { syncManager } from '../services/offline/syncManager';
import { useAuthStore } from '../store/authStore';
import { useClubStore } from '../store/clubStore';
import { useFacebookStore } from '../store/facebookStore';
import { useNotificationStore } from '../store/notificationStore';
import { useOffline } from '../hooks/useOffline';
import NetInfo from '@react-native-community/netinfo';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Start with login screen by default
  initialRouteName: 'login',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Manrope_200ExtraLight,
    Manrope_300Light,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isInitialized, checkAuth, user, forceLogout, twoFactorPending } = useAuthStore();
  const { fetchClubs } = useClubStore();
  const { fetchFacebookPages } = useFacebookStore();
  const { initialize: initializeNotifications } = useNotificationStore();
  const { isConnected } = useOffline();

  useEffect(() => {
    // Register logout callback with API client
    apiClient.setLogoutCallback(forceLogout);

    // Initialize offline sync manager
    syncManager.initialize();

    // Check authentication status on app start
    checkAuth();

    // Initialize push notifications
    initializeNotifications();
  }, []);

  // Re-initialize notifications when user authenticates
  useEffect(() => {
    if (isAuthenticated && user) {
      // Re-initialize notifications when authenticated
      initializeNotifications();
    }
  }, [isAuthenticated, user]);

  // Sync data when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated) {
        // Sync all data when app becomes active
        console.log('App became active, syncing data...');
        fetchClubs();

        // Only fetch Facebook pages if user is admin
        if (user?.is_admin) {
          fetchFacebookPages();
        }

        // Re-initialize notifications when app becomes active
        initializeNotifications();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated, user, isConnected]);

  useEffect(() => {
    // Only redirect after initialization is complete
    if (isInitialized) {
      // Don't redirect if 2FA is pending
      if (twoFactorPending) {
        // User is in the middle of 2FA verification, don't redirect
        return;
      }

      if (isAuthenticated && user) {
        // Navigate to tabs dashboard (handles both admin and coach)
        router.replace('/(tabs)/dashboard');
      } else if (!isAuthenticated) {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isInitialized, user, twoFactorPending]);

  // Show loading screen while checking auth status
  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <ToastProvider>
          <ApiHealthProvider>
            <AuthStatusProvider>
              <Stack>
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="two-factor-verify" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                <Stack.Screen name="design-system" options={{ title: 'Design System' }} />
                <Stack.Screen name="club-health" options={{ headerShown: false }} />
              </Stack>
            </AuthStatusProvider>
          </ApiHealthProvider>
        </ToastProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
