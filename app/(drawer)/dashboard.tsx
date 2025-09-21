import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, RefreshControl, Animated, Alert } from 'react-native';
import { Card, Badge, Button } from '@/components/ui';
import { Theme } from '@/constants/Theme';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { router } from 'expo-router';
import { useOffline } from '@/hooks/useOffline';
import { useSyncStore } from '@/store/syncStore';
import { useBookingStore } from '@/store/bookingStore';
import { useClubStore } from '@/store/clubStore';
import { useFacebookStore } from '@/store/facebookStore';
import { useAuthStore } from '@/store/authStore';
import { bookingsService } from '@/services/api/bookings.service';
import { clubsService } from '@/services/api/clubs.service';

export default function DashboardScreen() {
  const { isOffline } = useOffline();
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const {
    lastSyncTime,
    isSyncing,
    setSyncing,
    setLastSyncTime,
    canSync,
    recordSyncAttempt,
    getRemainingWaitTime
  } = useSyncStore();
  const { user } = useAuthStore();

  // This dashboard is only for admin users
  // Non-admin users should be routed to coach-dashboard by the root layout
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({
    monthlyBookings: 0,
    todaysBookings: 0,
    upcomingBookings: 0,
    totalClubs: 0
  });
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const {
    bookings,
    fetchBookings,
    refreshBookings,
    getTodaysBookings,
    getUpcomingBookings,
  } = useBookingStore();
  const {
    clubs,
    fetchClubs,
  } = useClubStore();
  const {
    fetchFacebookPages,
  } = useFacebookStore();

  const fetchStats = async () => {
    try {
      console.log('Fetching stats...');
      setStatsLoading(true);
      const [bookingTotals, clubsCount] = await Promise.all([
        bookingsService.getBookingsTotals(),
        clubsService.getClubsCount()
      ]);

      console.log('Bookings totals:', bookingTotals);
      console.log('Clubs count:', clubsCount);

      setStats({
        monthlyBookings: bookingTotals.month || 0,
        todaysBookings: bookingTotals.today || 0,
        upcomingBookings: bookingTotals.upcoming || 0,
        totalClubs: clubsCount.total || 0
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStatsLoading(false);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    // Small delay to ensure auth is fully ready
    const loadData = async () => {
      // Wait a bit to ensure token is available
      await new Promise(resolve => setTimeout(resolve, 100));

      fetchClubs();
      fetchBookings();
      fetchStats();

      // Fetch Facebook pages if user is admin
      if (user?.is_admin) {
        fetchFacebookPages();
      }
    };

    loadData();
  }, [user]);

  // Debug logging for stats
  useEffect(() => {
    console.log('Stats state updated:', stats);
    console.log('Stats loading:', statsLoading);
  }, [stats, statsLoading]);

  // Flashing animation for sync icon
  useEffect(() => {
    if (isSyncing || isRefreshing) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [isSyncing, isRefreshing]);

  const todaysBookings = getTodaysBookings();
  const upcomingBookings = getUpcomingBookings(7);

  const formatSyncTime = (time: number | null) => {
    if (!time) return 'Never';
    const diff = Date.now() - time;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const handleRefresh = async () => {
    if (!canSync()) {
      const waitTime = getRemainingWaitTime();
      const seconds = Math.ceil(waitTime / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;

      Alert.alert(
        'Sync Rate Limited',
        `You've reached the sync limit (3 times per 2 minutes).\n\nPlease wait ${minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`} before syncing again.`,
        [{ text: 'OK' }]
      );
      return;
    }

    recordSyncAttempt();
    setIsRefreshing(true);
    setSyncing(true);

    try {
      await Promise.all([
        fetchClubs(),
        refreshBookings(),
        fetchStats(),
        user?.is_admin ? fetchFacebookPages() : Promise.resolve(),
      ]);
      setLastSyncTime(Date.now());
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsRefreshing(false);
      setSyncing(false);
    }
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const formatTrialDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[palette.tint]}
        />
      }>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome, {user?.name || 'Coach'}!</Text>
          <View style={styles.syncStatus}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons
                name={isOffline ? 'cloud-offline' : (isSyncing || isRefreshing) ? 'sync' : 'cloud-done'}
                size={20}
                color={isOffline ? palette.statusError : (isSyncing || isRefreshing) ? palette.tint : palette.statusSuccess}
              />
            </Animated.View>
            <Text style={styles.syncText}>
              {isOffline ? 'Offline' : (isSyncing || isRefreshing) ? 'Syncing...' : `Synced ${formatSyncTime(lastSyncTime)}`}
            </Text>
          </View>
        </View>

        <Card variant="elevated" style={styles.statsCard}>
          <Text style={styles.statsTitle}>Overview</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <Ionicons name="calendar" size={20} color={palette.tint} />
              <Text style={styles.statRowLabel}>This Month:</Text>
              {statsLoading ? (
                <SkeletonLoader width={60} height={20} style={styles.statRowSkeleton} />
              ) : (
                <Text style={styles.statRowValue}>{stats.monthlyBookings} bookings</Text>
              )}
            </View>

            <View style={styles.statRow}>
              <Ionicons name="time" size={20} color={palette.statusSuccess} />
              <Text style={styles.statRowLabel}>Today:</Text>
              {statsLoading ? (
                <SkeletonLoader width={60} height={20} style={styles.statRowSkeleton} />
              ) : (
                <Text style={styles.statRowValue}>{stats.todaysBookings} bookings</Text>
              )}
            </View>

            <View style={styles.statRow}>
              <Ionicons name="trending-up" size={20} color={palette.statusWarning} />
              <Text style={styles.statRowLabel}>Upcoming:</Text>
              {statsLoading ? (
                <SkeletonLoader width={60} height={20} style={styles.statRowSkeleton} />
              ) : (
                <Text style={styles.statRowValue}>{stats.upcomingBookings} bookings</Text>
              )}
            </View>

            <View style={styles.statRow}>
              <Ionicons name="business" size={20} color={palette.statusInfo} />
              <Text style={styles.statRowLabel}>Total Clubs:</Text>
              {statsLoading ? (
                <SkeletonLoader width={60} height={20} style={styles.statRowSkeleton} />
              ) : (
                <Text style={styles.statRowValue}>{stats.totalClubs}</Text>
              )}
            </View>
          </View>
        </Card>

        <Card variant="filled" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="person-add" size={24} color={palette.tint} />
              <Text style={styles.actionText}>Add Student</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="checkmark-done" size={24} color={palette.tint} />
              <Text style={styles.actionText}>Take Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="calendar-outline" size={24} color={palette.tint} />
              <Text style={styles.actionText}>View Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="document-text" size={24} color={palette.tint} />
              <Text style={styles.actionText}>Lesson Plans</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Card variant="elevated" style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Bookings</Text>
            <Badge variant="info">{todaysBookings.length} Bookings</Badge>
          </View>
          {todaysBookings.length > 0 ? (
            <View>
              {todaysBookings.slice(0, 3).map((booking) => {
                const startTime = new Date(booking.start_time);
                return (
                  <View key={booking.id} style={styles.classItem}>
                    <View style={styles.classTime}>
                      <Text style={styles.classTimeText}>
                        {startTime.getHours().toString().padStart(2, '0')}:
                        {startTime.getMinutes().toString().padStart(2, '0')}
                      </Text>
                    </View>
                    <View style={styles.classDetails}>
                      <Text style={styles.className}>{booking.names}</Text>
                      <Text style={styles.classInfo}>
                        {booking.club?.name} • {booking.class_time?.name || 'Class'}
                      </Text>
                      <View style={styles.classStats}>
                        {booking.class_time?.name && (
                          <Badge
                            variant={booking.class_time.name.toLowerCase().includes('kid') ? 'warning' : 'info'}
                            size="sm"
                          >
                            {booking.class_time.name}
                          </Badge>
                        )}
                        <Text style={styles.enrollmentText}>
                          {booking.channel_display_name || booking.channel}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No bookings for today</Text>
            </View>
          )}
        </Card>

        <Card variant="elevated" style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
            <Badge variant="success">{upcomingBookings.length} Scheduled</Badge>
          </View>
          {upcomingBookings.length > 0 ? (
            <View>
              {upcomingBookings.slice(0, 3).map((booking) => (
                <View key={booking.id} style={styles.trialItem}>
                  <View style={styles.trialDate}>
                    <Text style={styles.trialDateText}>
                      {formatTrialDate(booking.start_time)}
                    </Text>
                  </View>
                  <View style={styles.trialDetails}>
                    <Text style={styles.trialName}>
                      {booking.names}
                    </Text>
                    {booking.phone && (
                      <Text style={styles.trialParent}>{booking.phone}</Text>
                    )}
                    <View style={styles.trialInfo}>
                      {booking.class_time?.name && (
                        <Badge
                          variant={booking.class_time.name.toLowerCase().includes('kid') ? 'warning' : 'info'}
                          size="sm"
                        >
                          {booking.class_time.name}
                        </Badge>
                      )}
                      <Text style={styles.trialClub}>
                        {booking.club?.name}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No upcoming bookings</Text>
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.backgroundSecondary,
  },
  content: {
    padding: Theme.spacing.lg,
  },
  header: {
    marginBottom: Theme.spacing.xl,
  },
  greeting: {
    fontSize: Theme.typography.sizes['2xl'],
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  syncText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
  },
  statsCard: {
    marginBottom: Theme.spacing.xl,
  },
  statsTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.md,
  },
  statsContainer: {
    gap: Theme.spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  statRowLabel: {
    flex: 1,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    marginLeft: Theme.spacing.md,
  },
  statRowValue: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  statRowSkeleton: {
    marginLeft: 'auto',
  },
  sectionCard: {
    marginBottom: Theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: Theme.spacing.md,
    backgroundColor: palette.background,
    borderRadius: Theme.borderRadius.md,
  },
  actionText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textPrimary,
    marginTop: Theme.spacing.sm,
  },
  emptyState: {
    paddingVertical: Theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textTertiary,
  },
  classItem: {
    flexDirection: 'row',
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  classTime: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classTimeText: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.tint,
  },
  classDetails: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  className: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  classInfo: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    marginBottom: Theme.spacing.sm,
  },
  classStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  enrollmentText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
  },
  trialItem: {
    flexDirection: 'row',
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  trialDate: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialDateText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.statusSuccess,
    textAlign: 'center',
  },
  trialDetails: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  trialName: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  trialParent: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    marginBottom: Theme.spacing.sm,
  },
  trialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  trialClub: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
  },
});
