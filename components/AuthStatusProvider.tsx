import React, { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../store/authStore';
import { router } from 'expo-router';

export const AuthStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, error } = useAuthStore();
  const hasShownAlert = useRef(false);
  const lastAuthState = useRef(isAuthenticated);

  useEffect(() => {
    // Show alert only when transitioning from authenticated to unauthenticated
    if (lastAuthState.current && !isAuthenticated && !hasShownAlert.current) {
      hasShownAlert.current = true;
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please log in again.',
        [
          {
            text: 'OK',
            onPress: () => {
              hasShownAlert.current = false;
            },
          },
        ],
        { cancelable: false }
      );
    }

    lastAuthState.current = isAuthenticated;
  }, [isAuthenticated]);

  // Reset the flag when user logs back in
  useEffect(() => {
    if (isAuthenticated) {
      hasShownAlert.current = false;
    }
  }, [isAuthenticated]);

  return <>{children}</>;
};