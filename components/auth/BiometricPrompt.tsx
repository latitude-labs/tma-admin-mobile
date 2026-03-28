import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Theme } from '@/constants/Theme';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { biometricService, BiometricCapabilities } from '@/services/biometric.service';
import { Button } from '../ui/Button';
import * as Haptics from 'expo-haptics';

interface BiometricPromptProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  onFallback?: () => void;
  title?: string;
  subtitle?: string;
  fallbackButtonText?: string;
  cancelButtonText?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const BiometricPrompt: React.FC<BiometricPromptProps> = ({
  visible,
  onSuccess,
  onCancel,
  onFallback,
  title = 'Authenticate',
  subtitle = 'Use biometric authentication to continue',
  fallbackButtonText = 'Use OTP Instead',
  cancelButtonText = 'Cancel',
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);

  const iconScale = useSharedValue(1);
  const iconRotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (visible) {
      loadCapabilities();
      startAnimations();
    } else {
      stopAnimations();
      setError(null);
      setIsAuthenticating(false);
    }
  }, [visible]);

  const loadCapabilities = async () => {
    const caps = await biometricService.checkBiometricCapabilities();
    setCapabilities(caps);
  };

  const startAnimations = () => {
    // Pulse animation
    pulseScale.value = withRepeat(
      withTiming(1.3, {
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    pulseOpacity.value = withRepeat(
      withTiming(0, {
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    // Icon breathing animation
    iconScale.value = withRepeat(
      withSpring(1.1, {
        damping: 10,
        stiffness: 100,
      }),
      -1,
      true
    );
  };

  const stopAnimations = () => {
    iconScale.value = withTiming(1);
    iconRotation.value = withTiming(0);
    pulseScale.value = withTiming(1);
    pulseOpacity.value = withTiming(0.3);
  };

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    setError(null);

    // Provide haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await biometricService.authenticate(title, fallbackButtonText);

    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.error || 'Authentication failed');

      // Shake animation on error
      iconRotation.value = withRepeat(
        withTiming(10, { duration: 50 }),
        6,
        true
      );

      setTimeout(() => {
        iconRotation.value = withTiming(0);
      }, 300);
    }

    setIsAuthenticating(false);
  };

  const getBiometricIcon = () => {
    if (!capabilities) return 'lock-closed';

    switch (capabilities.biometricType) {
      case 'faceId':
        return 'scan';
      case 'fingerprint':
      case 'touchId':
        return 'finger-print';
      case 'iris':
        return 'eye';
      default:
        return 'lock-closed';
    }
  };

  const getBiometricIconComponent = () => {
    const iconName = getBiometricIcon();

    if (iconName === 'finger-print') {
      return (
        <MaterialIcons
          name="fingerprint"
          size={64}
          color={colors.tint}
        />
      );
    }

    return (
      <Ionicons
        name={iconName as any}
        size={64}
        color={colors.tint}
      />
    );
  };

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotation.value}deg` },
    ],
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
      >
        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(150)}
          exiting={SlideOutDown.duration(200)}
          style={styles.container}
        >
          <View style={styles.iconContainer}>
            {/* Pulse effect */}
            <Animated.View
              style={[
                styles.pulse,
                { backgroundColor: colors.tint },
                pulseAnimatedStyle,
              ]}
            />

            {/* Icon */}
            <Animated.View style={iconAnimatedStyle}>
              {getBiometricIconComponent()}
            </Animated.View>
          </View>

          <Text style={styles.title}>
            {title}
          </Text>

          <Text style={styles.subtitle}>
            {subtitle}
          </Text>

          {error && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={styles.errorContainer}
            >
              <Text style={[styles.errorText, { color: colors.statusError }]}>
                {error}
              </Text>
            </Animated.View>
          )}

          {isAuthenticating ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Authenticating...
              </Text>
            </View>
          ) : (
            <>
              <Button
                variant="primary"
                onPress={handleAuthenticate}
                fullWidth
                style={styles.authButton}
              >
                {capabilities
                  ? `Authenticate with ${biometricService.getBiometricTypeString(
                      capabilities.biometricType
                    )}`
                  : 'Authenticate'}
              </Button>

              <View style={styles.buttonContainer}>
                {onFallback && (
                  <Button
                    variant="outline"
                    onPress={onFallback}
                    fullWidth
                    style={styles.fallbackButton}
                  >
                    {fallbackButtonText}
                  </Button>
                )}

                <Button
                  variant="text"
                  onPress={onCancel}
                  fullWidth
                >
                  {cancelButtonText}
                </Button>
              </View>
            </>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Theme.spacing.lg,
    },
    container: {
      width: '100%',
      maxWidth: 400,
      borderRadius: Theme.borderRadius.xl,
      padding: Theme.spacing.xl,
      alignItems: 'center',
      backgroundColor: palette.background,
      ...Theme.shadows.elevated,
    },
    iconContainer: {
      width: 120,
      height: 120,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Theme.spacing.xl,
      position: 'relative',
    },
    pulse: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: 60,
    },
    title: {
      fontSize: Theme.typography.sizes.xl,
      fontWeight: '700',
      color: palette.textPrimary,
      marginBottom: Theme.spacing.sm,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: Theme.typography.sizes.md,
      fontWeight: '400',
      color: palette.textSecondary,
      textAlign: 'center',
      marginBottom: Theme.spacing.xl,
    },
    errorContainer: {
      backgroundColor: palette.statusError + '1A',
      paddingHorizontal: Theme.spacing.md,
      paddingVertical: Theme.spacing.sm,
      borderRadius: Theme.borderRadius.md,
      marginBottom: Theme.spacing.md,
      width: '100%',
    },
    errorText: {
      fontSize: Theme.typography.sizes.sm,
      fontWeight: '500',
      color: palette.statusError,
      textAlign: 'center',
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: Theme.spacing.xl,
    },
    loadingText: {
      fontSize: Theme.typography.sizes.sm,
      fontWeight: '400',
      color: palette.textSecondary,
      marginTop: Theme.spacing.md,
    },
    authButton: {
      marginBottom: Theme.spacing.md,
    },
    buttonContainer: {
      width: '100%',
      gap: Theme.spacing.sm,
    },
    fallbackButton: {
      marginBottom: Theme.spacing.sm,
    },
  });