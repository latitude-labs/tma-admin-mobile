import { Theme } from '@/constants/Theme';
import { useOffline } from '@/hooks/useOffline';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { bookingsService } from '@/services/api/bookings.service';
import { clubsService } from '@/services/api/clubs.service';
import { useAuthStore } from '@/store/authStore';
import { useBookingStore } from '@/store/bookingStore';
import { useClubStore } from '@/store/clubStore';
import { useFacebookStore } from '@/store/facebookStore';
import { useSyncStore } from '@/store/syncStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

export default function AdminDashboardScreen() {
  const { isOffline } = useOffline();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    lastSyncTime,
    isSyncing,
    setLastSyncTime,
    canSync,
    recordSyncAttempt,
    getRemainingWaitTime
  } = useSyncStore();
  const { user } = useAuthStore();
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({
    monthlyBookings: 0,
    todaysBookings: 0,
    todaysTrials: 0,
    upcomingBookings: 0,
    totalClubs: 0
  });
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const {
    fetchBookings,
    refreshBookings,
    getTodaysBookings,
    getUpcomingBookings,
  } = useBookingStore();
  const {
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
        todaysTrials: bookingTotals.trials_today || 0,
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
    const loadData = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      // Only fetch stats - other data is handled by AppStateManager
      fetchStats();

      // Check if we need to load data (only if not already loaded)
      const bookingState = useBookingStore.getState();
      if (!bookingState.isInitialized || bookingState.allBookings.length === 0) {
        fetchBookings();
      }

      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      setLoading(false);
    };

    loadData();
  }, []);

  // Update current time every minute for sync time display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Debug logging for stats
  useEffect(() => {
    console.log('Stats state updated:', stats);
    console.log('Stats loading:', statsLoading);
  }, [stats, statsLoading]);

  // Rotation animation for sync icon
  useEffect(() => {
    let animationLoop: Animated.CompositeAnimation | null = null;

    if (isSyncing || isRefreshing) {
      animationLoop = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      animationLoop.start();
    } else {
      rotateAnim.stopAnimation();
      rotateAnim.setValue(0);
    }

    return () => {
      if (animationLoop) {
        animationLoop.stop();
      }
      rotateAnim.stopAnimation();
    };
  }, [isSyncing, isRefreshing]);

  const todaysBookings = getTodaysBookings();
  const upcomingBookings = getUpcomingBookings(7);

  const getLastSyncText = () => {
    if (!lastSyncTime) return '';

    const diff = currentTime - lastSyncTime;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (diff < 60000) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleRefresh = async () => {
    // Add haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isSyncing || isRefreshing) {
      return;
    }

    if (!canSync()) {
      const waitTime = getRemainingWaitTime();
      const seconds = Math.ceil(waitTime / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;

      Alert.alert(
        'Sync Rate Limited',
        `Please wait ${minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`} before syncing again.`,
        [{ text: 'OK' }]
      );
      return;
    }

    recordSyncAttempt();
    setIsRefreshing(true);

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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingEmoji}>
                {new Date().getHours() < 12 ? '☀️' : new Date().getHours() < 18 ? '🌤️' : '🌙'}
              </Text>
              <View>
                <Text style={styles.greeting}>
                  Hi {user?.name?.split(' ')[0] || 'Admin'} 👋
                </Text>
                <Text style={styles.greetingSubtext}>
                  Welcome back · {new Date().toLocaleDateString('en-GB', { weekday: 'long' })}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.syncBadge, isOffline && styles.syncBadgeOffline]}
              onPress={handleRefresh}
              disabled={isSyncing || isRefreshing}
            >
              <View style={styles.syncBadgeContent}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons
                    name={isOffline ? 'cloud-offline' : (isSyncing || isRefreshing) ? 'sync' : 'checkmark-circle'}
                    size={20}
                    color={isOffline ? colors.statusError : colors.tint}
                  />
                </Animated.View>
                {lastSyncTime && !isSyncing && !isRefreshing && (
                  <Text style={[styles.syncTimeText, isOffline && styles.syncTimeTextOffline]}>
                    {getLastSyncText()}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.overviewContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Overview</Text>
            {(stats.todaysBookings > 0 || stats.todaysTrials > 0) && <Text style={styles.celebrateEmoji}>🎉</Text>}
          </View>

          <View style={styles.statsGrid}>
            {/* Bookings Today Card */}
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: colors.statusSuccess + '08' }]}
              activeOpacity={0.95}
            >
              <View style={styles.statCardContent}>
                <View style={styles.statCardLeft}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.statusSuccess + '15' }]}>
                    <Ionicons name="calendar-outline" size={20} color={colors.statusSuccess} />
                  </View>
                  <View style={styles.statCardInfo}>
                    <Text style={styles.statCardLabel}>Bookings Today</Text>
                    <Text style={styles.statCardDescription}>New bookings made today</Text>
                  </View>
                </View>
                <View style={styles.statCardRight}>
                  <Text style={[styles.statCardValue, { color: colors.statusSuccess }]}>
                    {statsLoading ? '—' : stats.todaysBookings}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Trials Today Card */}
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: colors.statusInfo + '08' }]}
              activeOpacity={0.95}
            >
              <View style={styles.statCardContent}>
                <View style={styles.statCardLeft}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.statusInfo + '15' }]}>
                    <Ionicons name="people-outline" size={20} color={colors.statusInfo} />
                  </View>
                  <View style={styles.statCardInfo}>
                    <Text style={styles.statCardLabel}>Trials Today</Text>
                    <Text style={styles.statCardDescription}>Scheduled trial sessions</Text>
                  </View>
                </View>
                <View style={styles.statCardRight}>
                  <Text style={[styles.statCardValue, { color: colors.statusInfo }]}>
                    {statsLoading ? '—' : stats.todaysTrials}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Upcoming Week Card */}
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: colors.statusWarning + '08' }]}
              activeOpacity={0.95}
            >
              <View style={styles.statCardContent}>
                <View style={styles.statCardLeft}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.statusWarning + '15' }]}>
                    <Ionicons name="time-outline" size={20} color={colors.statusWarning} />
                  </View>
                  <View style={styles.statCardInfo}>
                    <Text style={styles.statCardLabel}>Upcoming Week</Text>
                    <Text style={styles.statCardDescription}>Next 7 days bookings</Text>
                  </View>
                </View>
                <View style={styles.statCardRight}>
                  <Text style={[styles.statCardValue, { color: colors.statusWarning }]}>
                    {statsLoading ? '—' : stats.upcomingBookings}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* This Month Card */}
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: colors.tint + '08' }]}
              activeOpacity={0.95}
            >
              <View style={styles.statCardContent}>
                <View style={styles.statCardLeft}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.tint + '15' }]}>
                    <Ionicons name="trending-up" size={20} color={colors.tint} />
                  </View>
                  <View style={styles.statCardInfo}>
                    <Text style={styles.statCardLabel}>This Month</Text>
                    <Text style={styles.statCardDescription}>Total bookings this month</Text>
                  </View>
                </View>
                <View style={styles.statCardRight}>
                  <Text style={[styles.statCardValue, { color: colors.tint }]}>
                    {statsLoading ? '—' : stats.monthlyBookings}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Active Clubs Card */}
            {!statsLoading && stats.totalClubs > 0 && (
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: colors.backgroundSecondary }]}
                activeOpacity={0.95}
              >
                <View style={styles.statCardContent}>
                  <View style={styles.statCardLeft}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.borderLight }]}>
                      <Ionicons name="business-outline" size={20} color={colors.textSecondary} />
                    </View>
                    <View style={styles.statCardInfo}>
                      <Text style={styles.statCardLabel}>Active Clubs</Text>
                      <Text style={styles.statCardDescription}>Total registered venues</Text>
                    </View>
                  </View>
                  <View style={styles.statCardRight}>
                    <Text style={[styles.statCardValue, { color: colors.textPrimary }]}>
                      {stats.totalClubs}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              activeOpacity={0.7}
              onPress={() => router.push('/reports')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.tint + '15' }]}>
                <Ionicons name="bar-chart" size={24} color={colors.tint} />
              </View>
              <Text style={styles.quickActionLabel}>Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              activeOpacity={0.7}
              onPress={() => router.push('/calendar')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.statusSuccess + '15' }]}>
                <Ionicons name="calendar" size={24} color={colors.statusSuccess} />
              </View>
              <Text style={styles.quickActionLabel}>Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              activeOpacity={0.7}
              onPress={() => router.push('/club-health')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.statusWarning + '15' }]}>
                <Ionicons name="fitness" size={24} color={colors.statusWarning} />
              </View>
              <Text style={styles.quickActionLabel}>Club Health</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              activeOpacity={0.7}
              onPress={() => router.push('/notification-settings')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.statusInfo + '15' }]}>
                <Ionicons name="settings" size={24} color={colors.statusInfo} />
              </View>
              <Text style={styles.quickActionLabel}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* <View style={styles.bookingsSection}>
          <View style={styles.sectionHeaderWithAction}>
            <Text style={styles.sectionTitle}>Today's Bookings</Text>
            {todaysBookings.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{todaysBookings.length}</Text>
              </View>
            )}
          </View>
          {todaysBookings.length > 0 ? (
            <View style={styles.bookingsList}>
              {todaysBookings.slice(0, 5).map((booking) => (
                <TouchableOpacity
                  key={booking.id}
                  style={styles.bookingCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.bookingHeader}>
                    <View style={styles.timeBadge}>
                      <Text style={styles.timeBadgeText}>
                        {formatTime(booking.start_time)}
                      </Text>
                    </View>
                    <View style={styles.bookingChannel}>
                      <Text style={styles.channelText}>
                        {booking.channel_display_name || booking.channel}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.bookingName} numberOfLines={1}>
                    {booking.names}
                  </Text>
                  <View style={styles.bookingFooter}>
                    <View style={styles.locationRow}>
                      <Ionicons name="location" size={14} color={colors.textTertiary} />
                      <Text style={styles.locationText}>
                        {booking.club?.name} · {booking.class_time?.name || 'Class'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyDay}>
              <Ionicons name="calendar-outline" size={32} color={colors.textTertiary} />
              <Text style={styles.emptyDayText}>No bookings for today</Text>
            </View>
          )}
        </View>

        <View style={styles.upcomingSection}>
          <View style={styles.sectionHeaderWithAction}>
            <Text style={styles.sectionTitle}>Upcoming Week</Text>
            {upcomingBookings.length > 0 && (
              <View style={[styles.countBadge, { backgroundColor: colors.statusSuccess + '15' }]}>
                <Text style={[styles.countBadgeText, { color: colors.statusSuccess }]}>
                  {upcomingBookings.length}
                </Text>
              </View>
            )}
          </View>
          {upcomingBookings.length > 0 ? (
            <View style={styles.upcomingList}>
              {upcomingBookings.slice(0, 5).map((booking) => (
                <TouchableOpacity
                  key={booking.id}
                  style={styles.upcomingCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.upcomingDate}>
                    <Text style={styles.upcomingDateText}>
                      {formatTrialDate(booking.start_time)}
                    </Text>
                    <Text style={styles.upcomingTimeText}>
                      {formatTime(booking.start_time)}
                    </Text>
                  </View>
                  <View style={styles.upcomingDetails}>
                    <Text style={styles.upcomingName} numberOfLines={1}>
                      {booking.names}
                    </Text>
                    <View style={styles.upcomingMeta}>
                      <View style={[styles.classTypeBadge, {
                        backgroundColor: booking.class_time?.name?.toLowerCase().includes('kid')
                          ? colors.statusWarning + '10'
                          : colors.statusInfo + '10'
                      }]}>
                        <Text style={[styles.classTypeText, {
                          color: booking.class_time?.name?.toLowerCase().includes('kid')
                            ? colors.statusWarning
                            : colors.statusInfo
                        }]}>
                          {booking.class_time?.name || 'Class'}
                        </Text>
                      </View>
                      <Text style={styles.upcomingClub} numberOfLines={1}>
                        {booking.club?.name}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyDay}>
              <Ionicons name="calendar-clear-outline" size={32} color={colors.textTertiary} />
              <Text style={styles.emptyDayText}>No upcoming bookings</Text>
            </View>
          )}
        </View> */}
        <View style={{ height: 150 }} />
      </ScrollView>
    </Animated.View>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.backgroundSecondary,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.backgroundSecondary,
  },
  loadingText: {
    fontSize: Theme.typography.sizes.md,
    color: palette.textSecondary,
    fontFamily: Theme.typography.fonts.medium,
    marginTop: Theme.spacing.md,
  },

  // Header Styles
  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.lg,
    backgroundColor: palette.background,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: Theme.spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  greetingEmoji: {
    fontSize: 32,
  },
  greeting: {
    fontSize: 24,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
  },
  greetingSubtext: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
    marginTop: 2,
  },
  syncBadge: {
    backgroundColor: palette.tint + '10',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.tint + '20',
  },
  syncBadgeOffline: {
    backgroundColor: palette.statusError + '10',
    borderColor: palette.statusError + '20',
  },
  syncBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncTimeText: {
    fontSize: 12,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.tint,
  },
  syncTimeTextOffline: {
    color: palette.statusError,
  },

  // Overview Styles
  overviewContainer: {
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  celebrateEmoji: {
    fontSize: 24,
  },

  // Modern Banking App Style Stats
  statsGrid: {
    gap: Theme.spacing.sm,
  },
  statCard: {
    backgroundColor: palette.background,
    borderRadius: 16,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: palette.borderLight,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Theme.spacing.md,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardInfo: {
    flex: 1,
  },
  statCardLabel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: 2,
  },
  statCardDescription: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textTertiary,
  },
  statCardRight: {
    alignItems: 'flex-end',
  },
  statCardValue: {
    fontSize: 28,
    fontFamily: Theme.typography.fonts.bold,
    lineHeight: 32,
  },

  // Quick Actions Styles
  quickActionsSection: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.md,
  },
  quickActionCard: {
    backgroundColor: palette.background,
    borderRadius: 12,
    padding: Theme.spacing.md,
    alignItems: 'center',
    flex: 1,
    minWidth: (screenWidth - Theme.spacing.lg * 2 - Theme.spacing.md) / 2 - 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: palette.borderLight,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.sm,
  },
  quickActionLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textPrimary,
  },

  // Bookings Section Styles
  bookingsSection: {
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  countBadge: {
    backgroundColor: palette.tint + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.tint,
  },
  bookingsList: {
    gap: Theme.spacing.sm,
  },
  bookingCard: {
    backgroundColor: palette.background,
    borderRadius: 12,
    padding: Theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: palette.tint,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: palette.borderLight,
    marginBottom: Theme.spacing.sm,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  timeBadge: {
    backgroundColor: palette.tint + '10',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeBadgeText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.tint,
  },
  bookingChannel: {
    backgroundColor: palette.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  channelText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
  },
  bookingName: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  bookingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textTertiary,
  },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
    backgroundColor: palette.backgroundSecondary + '50',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.borderLight,
    borderStyle: 'dashed',
  },
  emptyDayText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textTertiary,
    marginTop: Theme.spacing.sm,
  },

  // Upcoming Section Styles
  upcomingSection: {
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
  },
  upcomingList: {
    gap: Theme.spacing.sm,
  },
  upcomingCard: {
    flexDirection: 'row',
    backgroundColor: palette.background,
    borderRadius: 12,
    padding: Theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: palette.borderLight,
    marginBottom: Theme.spacing.sm,
  },
  upcomingDate: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: palette.borderLight,
    marginRight: Theme.spacing.md,
  },
  upcomingDateText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.statusSuccess,
  },
  upcomingTimeText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textTertiary,
    marginTop: 2,
  },
  upcomingDetails: {
    flex: 1,
  },
  upcomingName: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  upcomingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  classTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  classTypeText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.medium,
  },
  upcomingClub: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    flex: 1,
  },
});