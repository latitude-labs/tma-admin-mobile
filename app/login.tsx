import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { biometricService } from '@/services/biometric.service';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Theme } from '../constants/Theme';
import { useAuthStore } from '../store/authStore';
import { LoginRequest } from '../types/auth';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const { login } = useAuthStore();
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const capabilities = await biometricService.checkBiometricCapabilities();
      const isEnrolled = await biometricService.isBiometricEnrolled();

      if (capabilities.hasHardware && capabilities.isEnrolled && isEnrolled) {
        setBiometricAvailable(true);
        setBiometricType(" " + biometricService.getBiometricTypeString(capabilities.biometricType));
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const authResult = await biometricService.authenticate(
        'Authenticate to access your TMA Admin account'
      );

      if (authResult.success) {
        // Get stored credentials
        const credentials = await biometricService.getStoredCredentials();

        if (credentials) {
          setIsLoading(true);
          try {
            // Use the stored credentials to log in
            await login(credentials);

            // Check authentication state
            const state = useAuthStore.getState();
            if (state.isAuthenticated && state.user) {
              // Ensure token is fully propagated before navigation
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
          } finally {
            setIsLoading(false);
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
    }
  };

  const checkAndPromptBiometricEnrollment = async (userId: string, email: string, password: string) => {
    try {
      // Check if biometric is available on the device
      const capabilities = await biometricService.checkBiometricCapabilities();

      // Only prompt if device has biometric hardware, user has enrolled biometric on device,
      // but hasn't enrolled for this app yet
      if (capabilities.hasHardware && capabilities.isEnrolled) {
        const isAppEnrolled = await biometricService.isBiometricEnrolled();

        if (!isAppEnrolled) {
          const biometricType = " " + biometricService.getBiometricTypeString(capabilities.biometricType);

          // Delay to let the login animation complete
          await new Promise(resolve => setTimeout(resolve, 1000));

          Alert.alert(
            `Enable ${biometricType}?`,
            `Would you like to use ${biometricType} for faster and more secure login in the future?`,
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
                text: `Enable ${biometricType}`,
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
                      `${biometricType} has been enabled! You can use it for your next login.`,
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

  const onSubmit = async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      await login(data);
      // Navigation is now handled inside the login function
      // If 2FA is required, it will navigate to the 2FA verification screen
      // If not, it will complete login and we navigate based on user role
      const state = useAuthStore.getState();
      if (state.isAuthenticated && state.user) {
        // Ensure token is fully propagated before navigation
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check for biometric enrollment - pass the credentials
        await checkAndPromptBiometricEnrollment(
          state.user.id.toString(),
          data.email,
          data.password
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.message || 'Invalid email or password. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Logo width={192} variant={palette.isDark ? 'dark' : 'light'} />
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              rules={{
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  placeholder="coach@templemanchester.co.uk"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={errors.email?.message}
                  editable={!isLoading}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              rules={{
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  error={errors.password?.message}
                  editable={!isLoading}
                />
              )}
            />

            <Button
              variant="primary"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              style={styles.submitButton}
            >
              Sign In
            </Button>

            {biometricAvailable && (
              <>
                <View style={styles.divider}>
                  <View style={[styles.dividerLine, { backgroundColor: palette.borderDefault }]} />
                  <Text style={[styles.dividerText, { color: palette.textTertiary }]}>OR</Text>
                  <View style={[styles.dividerLine, { backgroundColor: palette.borderDefault }]} />
                </View>

                <Button
                  variant="outline"
                  onPress={handleBiometricLogin}
                  loading={isLoading}
                  style={styles.biometricButton}
                >
                  Sign in with Face ID
                </Button>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: Theme.spacing.lg,
    },
    header: {
      alignItems: 'center',
      marginBottom: Theme.spacing.xl,
      gap: Theme.spacing.md,
    },
    title: {
      fontSize: Theme.typography.sizes.xxl,
      fontWeight: '700',
      color: palette.textPrimary,
      marginBottom: Theme.spacing.xs,
    },
    subtitle: {
      fontSize: Theme.typography.sizes.md,
      color: palette.textSecondary,
    },
    form: {
      gap: Theme.spacing.lg,
    },
    submitButton: {
      marginTop: Theme.spacing.md,
    },
    footer: {
      alignItems: 'center',
      marginTop: Theme.spacing.xl,
    },
    footerText: {
      fontSize: Theme.typography.sizes.sm,
      color: palette.textSecondary,
    },
    footerLink: {
      fontSize: Theme.typography.sizes.sm,
      color: palette.primary,
      marginTop: Theme.spacing.xs,
      fontWeight: '600',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: Theme.spacing.lg,
    },
    dividerLine: {
      flex: 1,
      height: 1,
    },
    dividerText: {
      marginHorizontal: Theme.spacing.md,
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
    },
    biometricButton: {
      marginTop: 0,
    },
  });
