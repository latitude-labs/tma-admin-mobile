import ColorPalette from '@/constants/Colors';
import { Notification, NotificationType } from '@/types/notification';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated';

interface NotificationItemProps {
  notification: Notification;
  onPress?: () => void;
  onMarkAsRead?: () => void;
  onClear?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onMarkAsRead,
  onClear,
}) => {
  const swipeX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const colorScheme = useColorScheme();
  const colors = ColorPalette[colorScheme ?? 'light'];
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const getNotificationIcon = (type: NotificationType) => {
    const iconMap = {
      system: 'settings-outline',
      message: 'chatbubble-outline',
      reminder: 'time-outline',
      achievement: 'trophy-outline',
      warning: 'warning-outline',
      info: 'information-circle-outline',
    };
    return iconMap[type] || 'notifications-outline';
  };

  const getIconColor = (type: NotificationType) => {
    const colorMap: Record<NotificationType, string> = {
      system: colors.textSecondary,
      message: colors.tint,
      reminder: colors.statusInfo,
      achievement: colors.statusSuccess,
      warning: colors.statusWarning,
      info: colors.statusInfo,
    };
    return colorMap[type] ?? colors.tint;
  };

  const formatTimestamp = (date: Date) => {
    if (isToday(date)) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  const handlePress = () => {
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead();
    }
    if (onPress) {
      onPress();
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[
        styles.container,
        !notification.read && {
          backgroundColor: colors.notificationUnread,
          borderLeftWidth: 3,
          borderLeftColor: colors.tint,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {notification.avatarUrl ? (
            <Image source={{ uri: notification.avatarUrl }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: `${getIconColor(notification.type)}20` },
              ]}
            >
              <Ionicons
                name={getNotificationIcon(notification.type) as any}
                size={20}
                color={getIconColor(notification.type)}
              />
            </View>
          )}
          {!notification.read && <View style={styles.unreadDot} />}
        </View>

        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {notification.title}
            </Text>
            {notification.priority === 'high' && (
              <View style={styles.priorityBadge}>
                <Ionicons name="alert-circle" size={14} color={colors.statusError} />
              </View>
            )}
          </View>

          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>

          <View style={styles.footer}>
            <Text style={styles.timestamp}>
              {formatTimestamp(notification.timestamp)}
            </Text>

            {notification.actionLabel && (
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionText}>{notification.actionLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {onClear && (
          <TouchableOpacity
            onPress={onClear}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
    </AnimatedPressable>
  );
};

type Palette = (typeof ColorPalette)['light'];

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    container: {
      backgroundColor: palette.background,
      marginHorizontal: 16,
      marginVertical: 4,
      borderRadius: 12,
      padding: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    iconContainer: {
      position: 'relative',
      marginRight: 12,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    unreadDot: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: palette.tint,
      borderWidth: 2,
      borderColor: palette.background,
    },
    textContainer: {
      flex: 1,
      marginRight: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    title: {
      fontSize: 15,
      fontFamily: 'Manrope_600SemiBold',
      color: palette.textPrimary,
      flex: 1,
    },
    priorityBadge: {
      marginLeft: 8,
    },
    message: {
      fontSize: 14,
      fontFamily: 'Manrope_400Regular',
      color: palette.textSecondary,
      lineHeight: 20,
      marginBottom: 8,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    timestamp: {
      fontSize: 12,
      fontFamily: 'Manrope_400Regular',
      color: palette.textTertiary,
    },
    actionButton: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      backgroundColor: palette.tint,
      borderRadius: 16,
    },
    actionText: {
      fontSize: 12,
      fontFamily: 'Manrope_600SemiBold',
      color: palette.textInverse,
    },
    clearButton: {
      padding: 4,
    },
  });
