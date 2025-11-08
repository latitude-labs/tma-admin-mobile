import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Card } from '@/components/ui';
import { Theme } from '@/constants/Theme';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import { FacebookCardSkeleton } from '@/components/FacebookCardSkeleton';
import { useFacebookStore } from '@/store/facebookStore';
import { TimeRange, TimeRangeOption } from '@/types/facebook';
import { useAuthStore } from '@/store/authStore';
import { Picker } from '@react-native-picker/picker';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  FadeIn,
  FadeInDown,
  FadeInUp,
  Layout,
  Easing,
  SlideInRight,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Chip } from '@/components/ui/Chip';

const AnimatedCard = Animated.createAnimatedComponent(Card);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const timeRangeOptions: TimeRangeOption[] = [
  {
    label: 'Today',
    value: 'today',
    getDates: () => {
      const today = new Date().toISOString().split('T')[0];
      return { start: today, end: today };
    },
  },
  {
    label: 'Yesterday',
    value: 'yesterday',
    getDates: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const date = yesterday.toISOString().split('T')[0];
      return { start: date, end: date };
    },
  },
  {
    label: 'Last 7 days',
    value: 'last7days',
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 6);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      };
    },
  },
  {
    label: 'Last 30 days',
    value: 'last30days',
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 29);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      };
    },
  },
];

export default function FacebookScreen() {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { user } = useAuthStore();
  const {
    isLoading,
    isLoadingMetrics,
    error,
    isOffline,
    lastSync,
    searchQuery,
    selectedTimeRange,
    fetchFacebookPages,
    refreshPages,
    setSearchQuery,
    setTimeRange,
    getFilteredPages,
  } = useFacebookStore();

  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const searchFocused = useSharedValue(0);
  const pulseOpacity = useSharedValue(0.3);
  const filteredPages = getFilteredPages();

  // Sort pages by cost per booking (worst performing first)
  const sortedPages = [...filteredPages].sort((a, b) => {
    // Handle pages without metrics
    if (!a.metrics && !b.metrics) return 0;
    if (!a.metrics) return 1; // Put pages without metrics at the end
    if (!b.metrics) return -1;

    const aCost = a.metrics.cost_per_booking;
    const bCost = b.metrics.cost_per_booking;
    const aSpend = a.metrics.total_spend;
    const bSpend = b.metrics.total_spend;

    // Both have no bookings - sort by spend (highest spend = worst)
    if (aCost === null && bCost === null) {
      // Pages with no spend go to the end (inactive pages)
      if (aSpend === 0 && bSpend === 0) return 0;
      if (aSpend === 0) return 1;  // a is inactive, goes last
      if (bSpend === 0) return -1; // b is inactive, goes last
      // Both have spend but no bookings - highest spend first (worst)
      return bSpend - aSpend;
    }

    // One has no bookings (infinite cost) - compare with the other
    if (aCost === null) {
      // a has no bookings - only put it first if it has significant spend
      if (aSpend === 0) return 1; // a is inactive, goes after pages with bookings
      // a has spend but no bookings - always worse than any page with bookings
      return -1;
    }
    if (bCost === null) {
      // b has no bookings - only put it first if it has significant spend
      if (bSpend === 0) return -1; // b is inactive, goes after pages with bookings
      // b has spend but no bookings - always worse than any page with bookings
      return 1;
    }

    // Both have bookings, sort by cost per booking descending (highest/worst first)
    return bCost - aCost;
  });

  useEffect(() => {
    // Debug logging
    console.log('FacebookScreen - User:', user);
    console.log('FacebookScreen - Is Admin:', user?.is_admin);

    // Fetch pages on mount - the API will handle admin check
    fetchFacebookPages();
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearchQuery]);

  useEffect(() => {
    if (isLoading && sortedPages.length === 0) {
      pulseOpacity.value = withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
      );
    }
  }, [isLoading, sortedPages.length]);

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Loading state
  if (isLoading && sortedPages.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Animated.View style={loadingAnimatedStyle}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.tint} />
            <Text style={styles.loadingText}>Loading ad performance...</Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  // Error state
  if (error && sortedPages.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Animated.View
          entering={FadeIn.duration(400)}
          style={styles.errorContainer}
        >
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={56} color={palette.statusError} />
          </View>
          <Text style={styles.errorTitle}>Unable to load ads</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              fetchFacebookPages();
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const searchAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: withSpring(
      searchFocused.value ? palette.tint : palette.borderDefault,
      { damping: 15, stiffness: 150 }
    ),
    borderWidth: withSpring(searchFocused.value ? 2 : 1),
  }));

  const getPerformanceColor = (costPerBooking: number | null) => {
    if (costPerBooking === null) return palette.statusError; // No bookings
    if (costPerBooking < 10) return palette.statusSuccess;
    if (costPerBooking < 20) return palette.statusWarning;
    return palette.statusError;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshPages}
            colors={[palette.tint]}
            tintColor={palette.tint}
          />
        }>
        <View style={styles.content}>
          {/* Header */}
          <Animated.View
            entering={FadeInDown.duration(400).springify()}
            style={styles.header}
          >
            <View style={styles.titleContainer}>
              <View>
                <Text style={styles.title}>Ad Performance</Text>
                <Text style={styles.subtitle}>Facebook Advertising Dashboard</Text>
              </View>
              {isOffline && (
                <Animated.View
                  entering={FadeIn.duration(300)}
                  style={styles.offlineBadge}
                >
                  <Ionicons name="cloud-offline" size={14} color="#FFF" />
                  <Text style={styles.offlineText}>Offline</Text>
                </Animated.View>
              )}
            </View>
            {lastSync && (
              <Animated.Text
                entering={FadeIn.delay(200).duration(300)}
                style={styles.syncText}
              >
                Last synced {new Date(lastSync).toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Animated.Text>
            )}
          </Animated.View>

          {/* Search Bar */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(400).springify()}
            style={[styles.searchContainer, searchAnimatedStyle]}
          >
            <Ionicons name="search" size={20} color={palette.textSecondary} />
            <AnimatedTextInput
              style={styles.searchInput}
              placeholder="Search Facebook pages..."
              placeholderTextColor={palette.textTertiary}
              value={localSearchQuery}
              onChangeText={setLocalSearchQuery}
              onFocus={() => {
                searchFocused.value = 1;
              }}
              onBlur={() => {
                searchFocused.value = 0;
              }}
            />
            {localSearchQuery !== '' && (
              <Animated.View entering={FadeIn.duration(200)}>
                <TouchableOpacity
                  onPress={() => {
                    setLocalSearchQuery('');
                    if (Platform.OS === 'ios') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  <Ionicons name="close-circle" size={20} color={palette.textSecondary} />
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>

          {/* Time Range Selector */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(400).springify()}
            style={styles.timeRangeContainer}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {timeRangeOptions.map((option, index) => (
                <Animated.View
                  key={option.value}
                  entering={SlideInRight.delay(index * 50).duration(300).springify()}
                >
                  <Chip
                    label={option.label}
                    selected={selectedTimeRange === option.value}
                    onPress={() => {
                      setTimeRange(option.value);
                      if (Platform.OS === 'ios') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    style={styles.timeRangeChip}
                  />
                </Animated.View>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Facebook Pages List */}
          {sortedPages.length === 0 && !isLoading ? (
            <Animated.View
              entering={FadeIn.duration(400)}
              style={styles.emptyState}
            >
              <View style={styles.emptyIconContainer}>
                <Ionicons name="search-outline" size={64} color={palette.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>No pages found</Text>
              <Text style={styles.emptyMessage}>
                No Facebook pages match your search criteria
              </Text>
            </Animated.View>
          ) : (
            <View style={styles.pagesList}>
              {sortedPages.map((page, index) =>
                // Show skeleton if metrics are still loading for this page
                !page.metrics ? (
                  <FacebookCardSkeleton key={page.id} />
                ) : (
                  <AnimatedPressable
                    key={page.id}
                    onPress={() => {
                      if (Platform.OS === 'ios') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                  >
                    <AnimatedCard
                      variant="elevated"
                      style={styles.card}
                      entering={FadeInDown.delay(index * 80).duration(400).springify()}
                      layout={Layout.springify()}
                    >
                      {/* Page Header */}
                      <View style={styles.pageHeader}>
                        <View style={styles.pageIconContainer}>
                          <Ionicons name="logo-facebook" size={28} color="#1877F2" />
                        </View>
                        <View style={styles.pageInfo}>
                          <Text style={styles.pageName}>{page.name}</Text>
                          <View style={styles.statusContainer}>
                            <View
                              style={[
                                styles.statusDot,
                                { backgroundColor: page.status === 'active'
                                  ? palette.statusSuccess
                                  : palette.textTertiary
                                }
                              ]}
                            />
                            <Text style={styles.statusText}>
                              {page.status === 'active' ? 'Active' : 'Inactive'}
                            </Text>
                          </View>
                        </View>
                        {page.metrics && (
                          <View style={[
                            styles.performanceIndicator,
                            { backgroundColor: `${getPerformanceColor(page.metrics.cost_per_booking)}15` }
                          ]}>
                            <Ionicons
                              name={
                                page.metrics.cost_per_booking === null ? 'trending-down' :
                                page.metrics.cost_per_booking < 10 ? 'trending-up' :
                                'trending-down'
                              }
                              size={20}
                              color={getPerformanceColor(page.metrics.cost_per_booking)}
                            />
                          </View>
                        )}
                      </View>

                      {/* Metrics Grid */}
                      {page.metrics ? (
                        <>
                          <View style={styles.metricsGrid}>
                            <View style={[styles.metricCard, { backgroundColor: `${palette.tint}10` }]}>
                              <Ionicons name="cash" size={20} color={palette.tint} />
                              <Text style={styles.metricValue}>
                                {formatCurrency(page.metrics.total_spend)}
                              </Text>
                              <Text style={styles.metricLabel}>Ad Spend</Text>
                            </View>

                            <View style={[styles.metricCard, { backgroundColor: `${palette.statusSuccess}10` }]}>
                              <Ionicons name="calendar" size={20} color={palette.statusSuccess} />
                              <Text style={styles.metricValue}>
                                {page.metrics.total_bookings}
                              </Text>
                              <Text style={styles.metricLabel}>Bookings</Text>
                            </View>

                            <View style={[
                              styles.metricCard,
                              { backgroundColor: `${getPerformanceColor(page.metrics.cost_per_booking)}10` }
                            ]}>
                              <Ionicons
                                name="analytics"
                                size={20}
                                color={getPerformanceColor(page.metrics.cost_per_booking)}
                              />
                              <Text style={[
                                styles.metricValue,
                                { color: getPerformanceColor(page.metrics.cost_per_booking) }
                              ]}>
                                {page.metrics.cost_per_booking
                                  ? formatCurrency(page.metrics.cost_per_booking)
                                  : '∞'}
                              </Text>
                              <Text style={styles.metricLabel}>Per Booking</Text>
                            </View>
                          </View>

                          {/* Club Breakdown */}
                          {page.metrics.club_bookings && page.metrics.club_bookings.length > 0 && (
                            <Animated.View
                              entering={FadeIn.delay(200).duration(300)}
                              style={styles.clubBreakdownContainer}
                            >
                              <View style={styles.clubBreakdownHeader}>
                                <View style={styles.clubBreakdownIconContainer}>
                                  <Ionicons name="business" size={16} color={palette.statusInfo} />
                                </View>
                                <Text style={styles.clubBreakdownTitle}>Bookings by Club</Text>
                              </View>
                              <View style={styles.clubGrid}>
                                {page.metrics.club_bookings
                                  .sort((a, b) => b.bookings - a.bookings)
                                  .map((club) => (
                                    <View key={club.club_id} style={styles.clubPill}>
                                      <Text style={styles.clubName}>{club.club_name}</Text>
                                      <View style={styles.clubBookingBadge}>
                                        <Text style={styles.clubBookingsCount}>{club.bookings}</Text>
                                      </View>
                                    </View>
                                  ))}
                              </View>
                            </Animated.View>
                          )}
                        </>
                      ) : (
                        <View style={styles.noMetrics}>
                          <Ionicons name="bar-chart-outline" size={32} color={palette.textTertiary} />
                          <Text style={styles.noMetricsText}>No metrics available for this period</Text>
                        </View>
                      )}
                    </AnimatedCard>
                  </AnimatedPressable>
                )
              )}
            </View>
          )}
        </View>
      </ScrollView>
      </View>
    </>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.backgroundSecondary,
    paddingTop: 60,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: Theme.spacing['2xl'],
    backgroundColor: palette.background,
    borderRadius: Theme.borderRadius.xl,
    ...Theme.shadows.md,
  },
  loadingText: {
    marginTop: Theme.spacing.lg,
    fontSize: Theme.typography.sizes.md,
    color: palette.textSecondary,
    fontFamily: Theme.typography.fonts.medium,
  },
  errorContainer: {
    alignItems: 'center',
    padding: Theme.spacing['2xl'],
    backgroundColor: palette.background,
    borderRadius: Theme.borderRadius.xl,
    ...Theme.shadows.md,
    maxWidth: 320,
  },
  errorIconContainer: {
    padding: Theme.spacing.lg,
    backgroundColor: `${palette.statusError}15`,
    borderRadius: Theme.borderRadius.full,
    marginBottom: Theme.spacing.lg,
  },
  errorTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  errorMessage: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: palette.tint,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
    ...Theme.shadows.sm,
  },
  retryButtonText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
  },
  content: {
    padding: Theme.spacing.lg,
  },
  header: {
    marginBottom: Theme.spacing.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.xs,
  },
  title: {
    fontSize: Theme.typography.sizes['2xl'],
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
  },
  subtitle: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    marginTop: 2,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.statusWarning,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    gap: Theme.spacing.xs,
    ...Theme.shadows.sm,
  },
  offlineText: {
    color: '#FFF',
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.semibold,
  },
  syncText: {
    fontSize: Theme.typography.sizes.xs,
    color: palette.textTertiary,
    fontFamily: Theme.typography.fonts.regular,
    marginBottom: Theme.spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.background,
    borderRadius: Theme.borderRadius.lg,
    paddingHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    height: 48,
    ...Theme.shadows.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    fontSize: Theme.typography.sizes.md,
    color: palette.textPrimary,
    fontFamily: Theme.typography.fonts.regular,
  },
  timeRangeContainer: {
    marginBottom: Theme.spacing.lg,
  },
  timeRangeChip: {
    marginRight: Theme.spacing.sm,
  },
  pagesList: {
    gap: Theme.spacing.md,
  },
  card: {
    marginBottom: 0,
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  pageIconContainer: {
    width: 48,
    height: 48,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: `${palette.statusInfo}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  pageInfo: {
    flex: 1,
  },
  pageName: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Theme.borderRadius.full,
  },
  statusText: {
    fontSize: Theme.typography.sizes.sm,
    color: palette.textSecondary,
    fontFamily: Theme.typography.fonts.medium,
  },
  performanceIndicator: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.lg,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
  },
  metricValue: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
    marginTop: Theme.spacing.xs,
  },
  metricLabel: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
    marginTop: 2,
  },
  noMetrics: {
    paddingVertical: Theme.spacing['2xl'],
    alignItems: 'center',
  },
  noMetricsText: {
    fontSize: Theme.typography.sizes.sm,
    color: palette.textTertiary,
    fontFamily: Theme.typography.fonts.regular,
    marginTop: Theme.spacing.md,
  },
  emptyState: {
    paddingVertical: Theme.spacing['3xl'],
    alignItems: 'center',
  },
  emptyIconContainer: {
    padding: Theme.spacing.xl,
    backgroundColor: `${palette.textTertiary}10`,
    borderRadius: Theme.borderRadius.full,
    marginBottom: Theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  emptyMessage: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  clubBreakdownContainer: {
    paddingTop: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.borderLight,
  },
  clubBreakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  clubBreakdownIconContainer: {
    width: 28,
    height: 28,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: `${palette.statusInfo}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.sm,
  },
  clubBreakdownTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  clubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  clubPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.backgroundSecondary,
    paddingLeft: Theme.spacing.md,
    paddingRight: Theme.spacing.xs,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    gap: Theme.spacing.sm,
  },
  clubName: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textPrimary,
  },
  clubBookingBadge: {
    backgroundColor: palette.tint,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  clubBookingsCount: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textInverse,
  },
});
