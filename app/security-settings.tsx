import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { twoFactorService, TwoFactorStatus } from '@/services/twoFactor.service';
import { biometricService } from '@/services/biometric.service';
import * as Haptics from 'expo-haptics';

export default function SecuritySettingsScreen() {
  const colors = useThemeColors();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');

  useEffect(() => {
    loadSecurityStatus();
  }, []);

  const loadSecurityStatus = async () => {
    setIsLoading(true);
    try {
      // Check 2FA status
      const status = await twoFactorService.getStatus();
      setTwoFactorStatus(status);

      // Check biometric availability
      const capabilities = await biometricService.checkBiometricCapabilities();
      setBiometricAvailable(capabilities.hasHardware && capabilities.isEnrolled);
      setBiometricType(biometricService.getBiometricTypeString(capabilities.biometricType));
    } catch (error) {
      console.error('Error loading security status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    if (!twoFactorStatus) return;

    if (twoFactorStatus.enabled) {
      // Disable 2FA
      Alert.alert(
        'Disable Two-Factor Authentication',
        'Are you sure you want to disable 2FA? This will make your account less secure.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              Alert.prompt(
                'Verify Your Identity',
                'Enter your password or current OTP code to disable 2FA',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Confirm',
                    onPress: async (code) => {
                      if (!code) return;
                      try {
                        await twoFactorService.disable2FA(code);
                        await loadSecurityStatus();
                        Alert.alert('Success', '2FA has been disabled');
                      } catch (error: any) {
                        Alert.alert('Error', error.message || 'Failed to disable 2FA');
                      }
                    },
                  },
                ],
                'secure-text'
              );
            },
          },
        ]
      );
    } else {
      // Enable 2FA
      Alert.alert(
        'Enable Two-Factor Authentication',
        'You will need to verify your identity using an OTP code sent to your email.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              try {
                await twoFactorService.setup2FA('otp');
                await twoFactorService.sendOTP(user?.email);
                Alert.alert('Success', 'Check your email for the verification code');
                await loadSecurityStatus();
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to enable 2FA');
              }
            },
          },
        ]
      );
    }
  };

  const handleEnrollBiometric = async () => {
    if (!user || !biometricAvailable) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await twoFactorService.enrollBiometric(
        user.id,
        `${biometricType} on Mobile`
      );

      if (result.enrolled) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', `${biometricType} has been enrolled for quick authentication`);
        await loadSecurityStatus();
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Failed', `Unable to enroll ${biometricType}`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to enroll biometric');
    }
  };

  const handleRemoveTrustedDevice = async (deviceId: string) => {
    Alert.alert(
      'Remove Trusted Device',
      'This device will need to verify with 2FA on next login',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await twoFactorService.removeTrustedDevice(deviceId);
              await loadSecurityStatus();
              Alert.alert('Success', 'Device removed from trusted list');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove device');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading security settings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeIn.duration(300)}>
          {/* 2FA Status Card */}
          <Card variant="filled" style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons
                name="shield-checkmark"
                size={32}
                color={twoFactorStatus?.enabled ? colors.statusSuccess : colors.textTertiary}
              />
              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  Two-Factor Authentication
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  {twoFactorStatus?.enabled
                    ? 'Your account is protected with 2FA'
                    : 'Add an extra layer of security'}
                </Text>
              </View>
              <Switch
                value={twoFactorStatus?.enabled || false}
                onValueChange={handleToggle2FA}
                trackColor={{ false: colors.border, true: colors.tint }}
                thumbColor={colors.background}
              />
            </View>

            {twoFactorStatus?.enabled && (
              <View style={styles.methodsList}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Available Methods
                </Text>
                <View style={styles.methodItem}>
                  <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
                  <Text style={[styles.methodText, { color: colors.textSecondary }]}>
                    Email OTP
                  </Text>
                  <View style={[styles.badge, { backgroundColor: colors.statusSuccess }]}>
                    <Text style={[styles.badgeText, { color: 'white' }]}>Active</Text>
                  </View>
                </View>
              </View>
            )}
          </Card>

          {/* Biometric Authentication Card */}
          {biometricAvailable && (
            <Card variant="filled" style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialIcons
                  name="fingerprint"
                  size={32}
                  color={twoFactorStatus?.biometricEnrolled ? colors.statusSuccess : colors.textTertiary}
                />
                <View style={styles.cardHeaderText}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    {biometricType} Authentication
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                    {twoFactorStatus?.biometricEnrolled
                      ? `${biometricType} is enabled for quick login`
                      : `Use ${biometricType} for faster authentication`}
                  </Text>
                </View>
              </View>

              {!twoFactorStatus?.biometricEnrolled && twoFactorStatus?.enabled && (
                <Button
                  variant="outline"
                  onPress={handleEnrollBiometric}
                  fullWidth
                  style={styles.enrollButton}
                >
                  Enable {biometricType}
                </Button>
              )}
            </Card>
          )}

          {/* Trusted Devices Card */}
          {twoFactorStatus?.enabled && twoFactorStatus.trustedDevices.length > 0 && (
            <Card variant="filled" style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Trusted Devices
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                These devices won't need 2FA for 30 days
              </Text>

              <View style={styles.devicesList}>
                {twoFactorStatus.trustedDevices.map((device) => (
                  <View key={device.id} style={styles.deviceItem}>
                    <Ionicons
                      name={device.isCurrent ? 'phone-portrait' : 'laptop-outline'}
                      size={24}
                      color={colors.textSecondary}
                    />
                    <View style={styles.deviceInfo}>
                      <Text style={[styles.deviceName, { color: colors.textPrimary }]}>
                        {device.name}
                      </Text>
                      <Text style={[styles.deviceDate, { color: colors.textTertiary }]}>
                        Last used: {new Date(device.lastUsed).toLocaleDateString()}
                      </Text>
                    </View>
                    {!device.isCurrent && (
                      <Button
                        variant="text"
                        onPress={() => handleRemoveTrustedDevice(device.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Security Tips Card */}
          <Card variant="outlined" style={styles.card}>
            <View style={styles.tipsHeader}>
              <Ionicons name="information-circle" size={24} color={colors.statusInfo} />
              <Text style={[styles.tipsTitle, { color: colors.textPrimary }]}>
                Security Tips
              </Text>
            </View>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              • Enable 2FA to protect your account from unauthorized access
            </Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              • Use biometric authentication for convenient and secure login
            </Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              • Regularly review your trusted devices
            </Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              • Never share your OTP codes with anyone
            </Text>
          </Card>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
  },
  card: {
    marginBottom: Theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  cardTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    marginBottom: Theme.spacing.xs,
  },
  cardSubtitle: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
  },
  methodsList: {
    marginTop: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    marginBottom: Theme.spacing.md,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
  },
  methodText: {
    flex: 1,
    marginLeft: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
  },
  badge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
  },
  badgeText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.semibold,
  },
  enrollButton: {
    marginTop: Theme.spacing.md,
  },
  devicesList: {
    marginTop: Theme.spacing.md,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  deviceInfo: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  deviceName: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
  },
  deviceDate: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    marginTop: Theme.spacing.xs,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  tipsTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    marginLeft: Theme.spacing.sm,
  },
  tipText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    marginBottom: Theme.spacing.sm,
    lineHeight: 20,
  },
});