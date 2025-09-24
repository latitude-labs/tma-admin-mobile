import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { NotificationItem } from './NotificationItem';
import { Notification } from '@/types/notification';

interface SwipeableNotificationItemProps {
  notification: Notification;
  onPress?: () => void;
  onMarkAsRead?: () => void;
  onClear?: () => void;
  onArchive?: () => void;
}

export const SwipeableNotificationItem: React.FC<SwipeableNotificationItemProps> = ({
  notification,
  onPress,
  onMarkAsRead,
  onClear,
  onArchive,
}) => {
  const swipeableRef = useRef<Swipeable>(null);
  const palette = useThemeColors();
  const actionVariantStyles = useMemo(
    () => ({
      read: { backgroundColor: palette.statusSuccess },
      archive: { backgroundColor: palette.statusInfo },
      delete: { backgroundColor: palette.statusError },
    }),
    [palette]
  );

  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.leftActionsContainer}>
        <Animated.View
          style={[
            styles.actionButton,
            actionVariantStyles.read,
            { transform: [{ scale }] },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              onMarkAsRead?.();
              swipeableRef.current?.close();
            }}
            style={styles.actionContent}
          >
            <Ionicons
              name={notification.read ? 'mail-unread' : 'checkmark-done'}
              size={24}
              color={palette.textInverse}
            />
            <Text style={[styles.actionText, { color: palette.textInverse }]}>
              {notification.read ? 'Unread' : 'Read'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.rightActionsContainer}>
        {onArchive && (
          <Animated.View
            style={[
              styles.actionButton,
              actionVariantStyles.archive,
              { transform: [{ scale }] },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                onArchive?.();
                swipeableRef.current?.close();
              }}
              style={styles.actionContent}
            >
              <Ionicons name="archive" size={24} color={palette.textInverse} />
              <Text style={[styles.actionText, { color: palette.textInverse }]}>Archive</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <Animated.View
          style={[
            styles.actionButton,
            actionVariantStyles.delete,
            { transform: [{ scale }] },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              onClear?.();
              swipeableRef.current?.close();
            }}
            style={styles.actionContent}
          >
            <Ionicons name="trash" size={24} color={palette.textInverse} />
            <Text style={[styles.actionText, { color: palette.textInverse }]}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      friction={2}
      leftThreshold={80}
      rightThreshold={80}
      overshootLeft={false}
      overshootRight={false}
    >
      <NotificationItem
        notification={notification}
        onPress={onPress}
        onMarkAsRead={onMarkAsRead}
        onClear={onClear}
      />
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  leftActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },
  rightActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '85%',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  actionContent: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    marginTop: 4,
  },
});
