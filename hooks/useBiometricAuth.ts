
import { biometricService } from '@/services/biometric.service';
import { useAuthStore } from '@/store/authStore';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

export const useBiometricAuth = () => {
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { login } = useAuthStore();

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    try {
      const capabilities = await biometricService.checkBiometricCapabilities();
      const isEnrolled = await biometricService.isBiometricEnrolled();

      if (capabilities.hasHardware && capabilities.isEnrolled && isEnrolled) {
        setIsBiometricAvailable(true);
        setBiometricType(" " + biometricService.getBiometricTypeString(capabilities.biometricType));
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  const loginWithBiometrics = async () => {
    setIsAuthenticating(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const authResult = await biometricService.authenticate(
        'Authenticate to access your TMA Admin account'
      );

      if (authResult.success) {
        // Get stored credentials
        const credentials = await biometricService.getStoredCredentials();

        if (credentials) {
          try {
            // Use the stored credentials to log in
            await login(credentials);

            // Check authentication state
            const state = useAuthStore.getState();
            if (state.isAuthenticated && state.user) {
              // Ensure token is fully propagated before navigation
              // Using a small delay is still a practical workaround for async storage propagation
              await new Promise(resolve => setTimeout(resolve, 500));

              // Navigate to dashboard
              router.replace('/(tabs)/dashboard');
            }
          } catch (error: any) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
              'Login Failed',
              'Failed to authenticate with stored credentials. Please try logging in manually.',
              [{ text: 'OK' }]
            );
          }
        } else {
          Alert.alert(
            'Setup Required',
            'Please log in with your credentials first to set up biometric authentication.',
            [{ text: 'OK' }]
          );
        }
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        if (authResult.error && authResult.error !== 'Authentication was cancelled') {
          Alert.alert('Authentication Failed', authResult.error, [{ text: 'OK' }]);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to authenticate', [{ text: 'OK' }]);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const checkAndPromptEnrollment = async (userId: string, email: string, password: string) => {
    try {
      // Check if biometric is available on the device
      const capabilities = await biometricService.checkBiometricCapabilities();

      // Only prompt if device has biometric hardware, user has enrolled biometric on device,
      // but hasn't enrolled for this app yet
      if (capabilities.hasHardware && capabilities.isEnrolled) {
        const isAppEnrolled = await biometricService.isBiometricEnrolled();

        if (!isAppEnrolled) {
          const typeString = " " + biometricService.getBiometricTypeString(capabilities.biometricType);

          // Delay to let the login animation complete
          await new Promise(resolve => setTimeout(resolve, 1000));

          Alert.alert(
            `Enable ${typeString}?`,
            `Would you like to use ${typeString} for faster and more secure login in the future?`,
            [
              {
                text: 'Not Now',
                style: 'cancel',
                onPress: () => {
                  // Continue to dashboard
                  router.replace('/(tabs)/dashboard');
                }
              },
              {
                text: `Enable ${typeString}`,
                onPress: async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                  const result = await biometricService.enrollBiometric(
                    userId,
                    email,
                    password
                  );

                  if (result) {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert(
                      'Success',
                      `${typeString} has been enabled! You can use it for your next login.`,
                      [{ text: 'OK', onPress: () => router.replace('/(tabs)/dashboard') }]
                    );
                  } else {
                    // Continue to dashboard even if enrollment failed
                    router.replace('/(tabs)/dashboard');
                  }
                }
              }
            ]
          );
        } else {
          // Biometric already enrolled, continue to dashboard
          router.replace('/(tabs)/dashboard');
        }
      } else {
        // No biometric available, continue to dashboard
        router.replace('/(tabs)/dashboard');
      }
    } catch (error) {
      console.error('Error checking biometric enrollment:', error);
      // Continue to dashboard on error
      router.replace('/(tabs)/dashboard');
    }
  };

  return {
    isBiometricAvailable,
    biometricType,
    isAuthenticating,
    loginWithBiometrics,
    checkAndPromptEnrollment
  };
};
