import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SectionList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withTiming,
  FadeInDown,
  FadeOutUp,
  Layout,
} from 'react-native-reanimated';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { Colors } from '@/constants/Colors';
import { NotificationItem } from '@/components/ui/NotificationItem';
import { Notification, NotificationGroup } from '@/types/notification';
import { mockNotifications } from '@/utils/mockNotifications';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    return filter === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications;
  }, [notifications, filter]);

  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {};

    filteredNotifications.forEach((notification) => {
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
  }, [filteredNotifications]);

  const handleMarkAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, read: true, readAt: new Date() }
          : n
      )
    );
  }, []);

  const handleMarkAllAsRead = useCallback(() => {
    Alert.alert(
      'Mark All as Read',
      'Are you sure you want to mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All',
          onPress: () => {
            const now = new Date();
            setNotifications((prev) =>
              prev.map((n) => ({ ...n, read: true, readAt: now }))
            );
          },
        },
      ]
    );
  }, []);

  const handleClearNotification = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  }, []);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            setNotifications([]);
          },
        },
      ]
    );
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

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
        onClear={() => handleClearNotification(item.id)}
      />
    </Animated.View>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons
          name="notifications-off-outline"
          size={64}
          color={Colors.text.tertiary}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'unread'
          ? "You're all caught up!"
          : 'When you receive notifications, they will appear here'}
      </Text>
    </View>
  );

  return (
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
                  color={Colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleClearAll}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={Colors.text.tertiary}
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
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={EmptyState}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Manrope_700Bold',
    color: Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    color: Colors.text.secondary,
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
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.background.primary,
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: Colors.text.secondary,
  },
  filterTextActive: {
    color: Colors.text.inverse,
  },
  filterBadge: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: Colors.primary,
  },
  listContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: Colors.background.secondary,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: Colors.text.tertiary,
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
    backgroundColor: Colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Manrope_600SemiBold',
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});