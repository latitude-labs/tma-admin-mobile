import { NotificationItem } from '@/components/ui/NotificationItem';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { useNotificationStore } from '@/store/notificationStore';
import { Notification, NotificationGroup } from '@/types/notification';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  Layout
} from 'react-native-reanimated';

export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
    startPolling,
    stopPolling,
    filter,
    setFilter,
    isLoading,
  } = useNotificationStore();
  const [refreshing, setRefreshing] = useState(false);
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  useEffect(() => {
    // Just fetch notifications when screen is opened
    // Polling is handled at app level in _layout.tsx
    fetchNotifications();
  }, []);

  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {};

    notifications.forEach((notification) => {
      const date = notification.timestamp;
      let key: string;

      if (isToday(date)) {
        key = 'Today';
      } else if (isYesterday(date)) {
        key = 'Yesterday';
      } else {
        key = format(date, 'MMMM d, yyyy');
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(notification);
    });

    return Object.entries(groups).map(([date, notifications]) => ({
      date,
      data: notifications.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      ),
    }));
  }, [notifications]);

  const handleMarkAsRead = useCallback((notificationId: string) => {
    markAsRead(notificationId);
  }, [markAsRead]);

  const handleMarkAllAsRead = useCallback(() => {
    Alert.alert(
      'Mark All as Read',
      'Are you sure you want to mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All',
          onPress: () => {
            markAllAsRead();
          },
        },
      ]
    );
  }, [markAllAsRead]);

  const handleDeleteNotification = useCallback((notificationId: string) => {
    deleteNotification(notificationId);
  }, [deleteNotification]);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            // Delete all notifications one by one
            for (const notification of notifications) {
              await deleteNotification(notification.id);
            }
          },
        },
      ]
    );
  }, [notifications, deleteNotification]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const renderSectionHeader = ({ section }: { section: NotificationGroup }) => (
    <Animated.View
      entering={FadeInDown.duration(300)}
      style={styles.sectionHeader}
    >
      <Text style={styles.sectionTitle}>{section.date}</Text>
    </Animated.View>
  );

  const renderNotification = ({ item, index }: { item: Notification; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(400)}
      exiting={FadeOutUp.duration(300)}
      layout={Layout.springify()}
    >
      <NotificationItem
        notification={item}
        onPress={() => console.log('Notification pressed:', item.id)}
        onMarkAsRead={() => handleMarkAsRead(item.id)}
        onClear={() => handleDeleteNotification(item.id)}
      />
    </Animated.View>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons
          name="notifications-off-outline"
          size={64}
          color={palette.textTertiary}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {filter === 'unread' ? 'No unread notifications' :
         filter === 'read' ? 'No read notifications' :
         'No notifications'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'unread'
          ? "You're all caught up!"
          : filter === 'read'
          ? 'No notifications have been marked as read yet'
          : 'When you receive notifications, they will appear here'}
      </Text>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSubtitle}>
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        <View style={styles.headerActions}>
          {notifications.length > 0 && (
            <>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleMarkAllAsRead}
              >
                <Ionicons
                  name="checkmark-done"
                  size={20}
                  color={palette.tint}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleClearAll}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={palette.textTertiary}
                />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'all' && styles.filterTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'unread' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('unread')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'unread' && styles.filterTextActive,
            ]}
          >
            Unread
          </Text>
          {unreadCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'read' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('read')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'read' && styles.filterTextActive,
            ]}
          >
            Read
          </Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={groupedNotifications}
        keyExtractor={(item) => item.id}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={palette.tint}
          />
        }
        ListEmptyComponent={EmptyState}
      />
      </View>
    </>
  );
}

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.backgroundSecondary,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: palette.background,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderLight,
    },
    headerTitle: {
      fontSize: 28,
      fontFamily: 'Manrope_700Bold',
      color: palette.textPrimary,
    },
    headerSubtitle: {
      fontSize: 14,
      fontFamily: 'Manrope_400Regular',
      color: palette.textSecondary,
      marginTop: 4,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 12,
    },
    headerButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: palette.backgroundSecondary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: palette.background,
      gap: 12,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: palette.backgroundSecondary,
      gap: 6,
    },
    filterButtonActive: {
      backgroundColor: palette.tint,
    },
    filterText: {
      fontSize: 14,
      fontFamily: 'Manrope_500Medium',
      color: palette.textSecondary,
    },
    filterTextActive: {
      color: palette.textInverse,
    },
    filterBadge: {
      backgroundColor: palette.background,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
      minWidth: 20,
      alignItems: 'center',
    },
    filterBadgeText: {
      fontSize: 12,
      fontFamily: 'Manrope_600SemiBold',
      color: palette.tint,
    },
    listContent: {
      paddingBottom: 20,
      flexGrow: 1,
    },
    sectionHeader: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
      backgroundColor: palette.backgroundSecondary,
    },
    sectionTitle: {
      fontSize: 13,
      fontFamily: 'Manrope_600SemiBold',
      color: palette.textTertiary,
      textTransform: 'uppercase',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 40,
    },
    emptyIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: palette.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: 'Manrope_600SemiBold',
      color: palette.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 14,
      fontFamily: 'Manrope_400Regular',
      color: palette.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
