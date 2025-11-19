import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
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
  const { 
    isBiometricAvailable, 
    biometricType, 
    isAuthenticating, 
    loginWithBiometrics, 
    checkAndPromptEnrollment 
  } = useBiometricAuth();
  
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
        await checkAndPromptEnrollment(
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

  const showLoading = isLoading || isAuthenticating;

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
                  editable={!showLoading}
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
                  editable={!showLoading}
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

            {isBiometricAvailable && (
              <>
                <View style={styles.divider}>
                  <View style={[styles.dividerLine, { backgroundColor: palette.borderDefault }]} />
                  <Text style={[styles.dividerText, { color: palette.textTertiary }]}>OR</Text>
                  <View style={[styles.dividerLine, { backgroundColor: palette.borderDefault }]} />
                </View>

                <Button
                  variant="outline"
                  onPress={loginWithBiometrics}
                  loading={isAuthenticating}
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
