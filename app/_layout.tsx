import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import {
  Manrope_200ExtraLight,
  Manrope_300Light,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { useAuthStore } from '../store/authStore';
import { LoadingScreen } from '../components/LoadingScreen';
import { useClubStore } from '../store/clubStore';
import { useFacebookStore } from '../store/facebookStore';
import { AuthStatusProvider } from '../components/AuthStatusProvider';
import { ApiHealthProvider } from '../components/ApiHealthProvider';
import { apiClient } from '../services/api/client';
import { syncManager } from '../services/offline/syncManager';
import { NetworkStatusBanner } from '../components/NetworkStatusBanner';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
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
  const { isAuthenticated, isInitialized, checkAuth, user, forceLogout } = useAuthStore();
  const { fetchClubs } = useClubStore();
  const { fetchFacebookPages } = useFacebookStore();

  useEffect(() => {
    // Register logout callback with API client
    apiClient.setLogoutCallback(forceLogout);

    // Initialize offline sync manager
    syncManager.initialize();

    // Check authentication status on app start
    checkAuth();
  }, []);

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
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated, user]);

  useEffect(() => {
    // Only redirect after initialization is complete
    if (isInitialized) {
      if (isAuthenticated && user) {
        // Navigate based on user role
        if (user.is_admin) {
          router.replace('/(drawer)/dashboard');
        } else {
          router.replace('/(drawer)/coach-dashboard');
        }
      } else if (!isAuthenticated) {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isInitialized, user]);

  // Show loading screen while checking auth status
  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ApiHealthProvider>
        <AuthStatusProvider>
          <Stack>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            <Stack.Screen name="design-system" options={{ title: 'Design System' }} />
          </Stack>
        </AuthStatusProvider>
      </ApiHealthProvider>
    </ThemeProvider>
  );
}
