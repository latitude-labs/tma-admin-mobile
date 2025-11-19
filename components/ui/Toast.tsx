import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  SlideInUp,
  SlideOutUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import * as Haptics from 'expo-haptics';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
  visible: boolean;
  action?: {
    label: string;
    onPress: () => void;
  };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  warning: 'warning',
  info: 'information-circle',
};

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onHide,
  visible,
  action,
}) => {
  const palette = useThemeColors();
  const styles = React.useMemo(() => createStyles(palette), [palette]);
  const insets = useSafeAreaInsets();
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (visible) {
      // Haptic feedback on show
      if (type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (type === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Auto hide
      if (duration > 0 && !action) {
        hideTimeoutRef.current = setTimeout(() => {
          onHide?.();
        }, duration);
      }
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [visible, duration, type, action, onHide]);

  if (!visible) return null;

  const getToastColor = () => {
    switch (type) {
      case 'success':
        return palette.statusSuccess;
      case 'error':
        return palette.statusError;
      case 'warning':
        return palette.statusWarning;
      case 'info':
      default:
        return palette.statusInfo;
    }
  };

  const toastColor = getToastColor();

  return (
    <Animated.View
      entering={SlideInUp.duration(300)}
      exiting={SlideOutUp.duration(250)}
      style={[
        styles.container,
        {
          top: insets.top + Theme.spacing.md,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: palette.background,
            borderLeftColor: toastColor,
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${toastColor}15` }]}>
          <Ionicons name={ICONS[type]} size={24} color={toastColor} />
        </View>

        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>

        {action && (
          <View style={styles.actionContainer}>
            <Text
              style={[styles.actionText, { color: toastColor }]}
              onPress={action.onPress}
            >
              {action.label}
            </Text>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
};

// Toast Manager for global usage
class ToastManager {
  private static instance: ToastManager;
  private showToastCallback?: (props: Omit<ToastProps, 'visible' | 'onHide'>) => void;

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  setShowToastCallback(callback: (props: Omit<ToastProps, 'visible' | 'onHide'>) => void) {
    this.showToastCallback = callback;
  }

  show(message: string, type: ToastType = 'info', duration?: number, action?: ToastProps['action']) {
    this.showToastCallback?.({ message, type, duration, action });
  }

  success(message: string, duration?: number) {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number) {
    this.show(message, 'error', duration);
  }

  info(message: string, duration?: number) {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration?: number) {
    this.show(message, 'warning', duration);
  }
}

export const toast = ToastManager.getInstance();

// Provider component to be added to app root
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toastProps, setToastProps] = React.useState<
    (Omit<ToastProps, 'visible' | 'onHide'> & { id: number }) | null
  >(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    toast.setShowToastCallback((props) => {
      setToastProps({ ...props, id: Date.now() });
      setVisible(true);
    });
  }, []);

  const handleHide = () => {
    setVisible(false);
    setTimeout(() => setToastProps(null), 300); // Wait for exit animation
  };

  return (
    <>
      {children}
      {toastProps && (
        <Toast
          {...toastProps}
          visible={visible}
          onHide={handleHide}
        />
      )}
    </>
  );
};

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      left: Theme.spacing.lg,
      right: Theme.spacing.lg,
      zIndex: 9999,
      elevation: 999,
    },
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Theme.spacing.md,
      borderRadius: Theme.borderRadius.lg,
      borderLeftWidth: 4,
      ...Theme.shadows.lg,
      minHeight: 64,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: Theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Theme.spacing.md,
    },
    message: {
      flex: 1,
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textPrimary,
      lineHeight: 20,
    },
    actionContainer: {
      marginLeft: Theme.spacing.sm,
    },
    actionText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.semibold,
      textTransform: 'uppercase',
    },
  });