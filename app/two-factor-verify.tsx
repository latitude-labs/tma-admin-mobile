import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/store/authStore';
import { twoFactorService, TwoFactorMethod } from '@/services/twoFactor.service';
import { biometricService } from '@/services/biometric.service';
import { Button } from '@/components/ui/Button';
import { OTPInput } from '@/components/auth/OTPInput';
import { BiometricPrompt } from '@/components/auth/BiometricPrompt';
import * as Haptics from 'expo-haptics';

type VerificationMethod = 'biometric' | 'otp';

export default function TwoFactorVerifyScreen() {
  const colors = useThemeColors();
  const { completeLogin } = useAuthStore();

  const [method, setMethod] = useState<VerificationMethod>('biometric');
  const [otpCode, setOtpCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    checkBiometricAvailability();
    checkPreferredMethod();
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const checkBiometricAvailability = async () => {
    const availability = await twoFactorService.checkBiometricAvailability();
    setBiometricAvailable(availability.available && availability.enrolled);

    if (availability.available && availability.enrolled) {
      // Auto-trigger biometric on mount if available
      setTimeout(() => setShowBiometricPrompt(true), 500);
    } else {
      // Switch to OTP if biometric not available
      setMethod('otp');
      await sendOTP();
    }
  };

  const checkPreferredMethod = async () => {
    const preferred = await twoFactorService.getPreferredMethod();
    setMethod(preferred as VerificationMethod);
  };

  const sendOTP = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const pendingAuth = await twoFactorService.getPendingAuth();
      if (pendingAuth) {
        await twoFactorService.sendOTP(pendingAuth.email);
        setResendTimer(60); // 60 seconds cooldown
      } else {
        // If no pending auth, try to get user email from auth store
        const authStore = useAuthStore.getState();
        if (authStore.user?.email) {
          await twoFactorService.sendOTP(authStore.user.email);
          setResendTimer(60);
        } else {
          throw new Error('Unable to send OTP - no email found');
        }
      }
    } catch (error: any) {
      setError(error.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPComplete = async (code: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await twoFactorService.verifyOTP(code, trustDevice);

      if (response.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await completeLogin(response.token, response.user, response.expires_at || '');

        // Navigate based on user role
        if (response.user.is_admin) {
          router.replace('/(tabs)/dashboard');
        } else {
          router.replace('/(tabs)/dashboard');
        }
      }
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(error.message || 'Invalid code. Please try again.');
      setOtpCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricSuccess = async () => {
    try {
      setShowBiometricPrompt(false);
      setIsLoading(true);
      setError(null);

      const response = await twoFactorService.verifyBiometric();

      if (response.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await completeLogin(response.token, response.user, response.expires_at || '');

        // Navigate based on user role
        if (response.user.is_admin) {
          router.replace('/(tabs)/dashboard');
        } else {
          router.replace('/(tabs)/dashboard');
        }
      }
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(error.message || 'Biometric authentication failed.');
      setShowBiometricPrompt(false);

      // Switch to OTP method
      setMethod('otp');
      await sendOTP();
    } finally {
      setIsLoading(false);
    }
  };

  const handleMethodSwitch = async (newMethod: VerificationMethod) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMethod(newMethod);
    setError(null);
    setOtpCode('');

    await twoFactorService.setPreferredMethod(newMethod as TwoFactorMethod);

    if (newMethod === 'biometric' && biometricAvailable) {
      setShowBiometricPrompt(true);
    } else if (newMethod === 'otp' && resendTimer === 0) {
      await sendOTP();
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer === 0) {
      await sendOTP();
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Verification',
      'Are you sure you want to cancel the verification process?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            await twoFactorService.clearPendingAuth();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const renderMethodSelector = () => {
    if (!biometricAvailable) return null;

    return (
      <View style={styles.methodSelector}>
        <Pressable
          onPress={() => handleMethodSwitch('biometric')}
          style={[
            styles.methodButton,
            method === 'biometric' && styles.methodButtonActive,
            { borderColor: method === 'biometric' ? colors.tint : colors.borderDefault },
          ]}
        >
          <Ionicons
            name="finger-print"
            size={24}
            color={method === 'biometric' ? colors.tint : colors.textSecondary}
          />
          <Text
            style={[
              styles.methodButtonText,
              { color: method === 'biometric' ? colors.tint : colors.textSecondary },
            ]}
          >
            Biometric
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleMethodSwitch('otp')}
          style={[
            styles.methodButton,
            method === 'otp' && styles.methodButtonActive,
            { borderColor: method === 'otp' ? colors.tint : colors.borderDefault },
          ]}
        >
          <Ionicons
            name="keypad"
            size={24}
            color={method === 'otp' ? colors.tint : colors.textSecondary}
          />
          <Text
            style={[
              styles.methodButtonText,
              { color: method === 'otp' ? colors.tint : colors.textSecondary },
            ]}
          >
            OTP Code
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="shield-checkmark" size={48} color={colors.tint} />
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Verify Your Identity
            </Text>

            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Complete the two-factor authentication to access your account
            </Text>
          </View>

          {renderMethodSelector()}

          <View style={styles.verificationContainer}>
            {method === 'otp' && (
              <>
                <OTPInput
                  value={otpCode}
                  onChange={setOtpCode}
                  onComplete={handleOTPComplete}
                  error={error || undefined}
                  disabled={isLoading}
                  autoFocus
                />

                {/* Development Mode Indicator */}
                {__DEV__ && process.env.EXPO_PUBLIC_USE_MOCK_2FA !== 'false' && (
                  <View style={[styles.devModeIndicator, { backgroundColor: colors.statusWarning + '20' }]}>
                    <Ionicons name="construct" size={16} color={colors.statusWarning} />
                    <Text style={[styles.devModeText, { color: colors.statusWarning }]}>
                      Development Mode: Enter any 6 digits
                    </Text>
                  </View>
                )}

                <View style={styles.resendContainer}>
                  <Text style={[styles.resendText, { color: colors.textSecondary }]}>
                    Didn't receive the code?
                  </Text>
                  <Button
                    variant="text"
                    onPress={handleResendOTP}
                    disabled={resendTimer > 0 || isLoading}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                  </Button>
                </View>

                <View style={styles.trustDeviceContainer}>
                  <View style={styles.trustDeviceRow}>
                    <Text style={[styles.trustDeviceText, { color: colors.textPrimary }]}>
                      Trust this device for 30 days
                    </Text>
                    <Switch
                      value={trustDevice}
                      onValueChange={setTrustDevice}
                      trackColor={{ false: colors.borderDefault, true: colors.tint }}
                      thumbColor={colors.background}
                    />
                  </View>
                  <Text style={[styles.trustDeviceHint, { color: colors.textSecondary }]}>
                    You won't need to verify on this device for 30 days
                  </Text>
                </View>
              </>
            )}

            {method === 'biometric' && biometricAvailable && (
              <View style={styles.biometricContainer}>
                <Button
                  variant="primary"
                  onPress={() => setShowBiometricPrompt(true)}
                  loading={isLoading}
                  fullWidth
                  size="lg"
                >
                  <Ionicons name="finger-print" size={20} color="white" />
                  {' '}Authenticate with Biometric
                </Button>

                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { color: colors.statusError }]}>
                      {error}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <Button
              variant="text"
              onPress={handleCancel}
              disabled={isLoading}
            >
              Cancel Verification
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BiometricPrompt
        visible={showBiometricPrompt}
        onSuccess={handleBiometricSuccess}
        onCancel={() => setShowBiometricPrompt(false)}
        onFallback={() => {
          setShowBiometricPrompt(false);
          handleMethodSwitch('otp');
        }}
        title="Verify Your Identity"
        subtitle="Use your biometric authentication to continue"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  title: {
    fontSize: Theme.typography.sizes['2xl'],
    fontFamily: Theme.typography.fonts.bold,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    textAlign: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  methodSelector: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    paddingVertical: Theme.spacing.md,
    borderWidth: 2,
    borderRadius: Theme.borderRadius.lg,
  },
  methodButtonActive: {
    backgroundColor: 'rgba(255, 129, 51, 0.1)',
  },
  methodButtonText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
  },
  verificationContainer: {
    marginBottom: Theme.spacing.xl,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: Theme.spacing.lg,
  },
  resendText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    marginBottom: Theme.spacing.xs,
  },
  trustDeviceContainer: {
    marginTop: Theme.spacing.xl,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  trustDeviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  trustDeviceText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
  },
  trustDeviceHint: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
  },
  biometricContainer: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
  },
  errorContainer: {
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  errorText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: Theme.spacing.xl,
  },
  devModeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
  },
  devModeText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
  },
});