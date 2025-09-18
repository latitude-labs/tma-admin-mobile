import React, { useEffect } from 'react';
import { Modal } from 'react-native';
import { useApiHealthStore } from '../store/apiHealthStore';
import { TechnicalDifficultiesScreen } from './TechnicalDifficultiesScreen';
import { apiClient } from '../services/api/client';
import { useClubStore } from '../store/clubStore';
import { useFacebookStore } from '../store/facebookStore';
import { useAuthStore } from '../store/authStore';

export const ApiHealthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isApiDown, retryAfter, attemptRetry, clearServerError } = useApiHealthStore();
  const { fetchClubs } = useClubStore();
  const { fetchFacebookPages } = useFacebookStore();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Register server error callback with API client
    apiClient.setServerErrorCallback(() => {
      // This will be called when a 5XX error occurs
      // The store handles the state updates
    });
  }, []);

  const handleRetry = async () => {
    // Clear the error state
    clearServerError();

    // Attempt to resync data if authenticated
    if (isAuthenticated) {
      try {
        // Try to fetch clubs first as a test
        await fetchClubs();

        // If successful, fetch other data
        if (user?.is_admin) {
          await fetchFacebookPages();
        }
      } catch (error) {
        // Error will be caught by the interceptor
        console.error('Retry failed:', error);
      }
    }
  };

  return (
    <>
      {children}
      <Modal
        visible={isApiDown}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
      >
        <TechnicalDifficultiesScreen
          onRetry={handleRetry}
          retryTime={retryAfter}
        />
      </Modal>
    </>
  );
};