import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Card } from '@/components/ui';
import { Theme } from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import { FacebookCardSkeleton } from '@/components/FacebookCardSkeleton';
import { useFacebookStore } from '@/store/facebookStore';
import { TimeRange, TimeRangeOption } from '@/types/facebook';
import { useAuthStore } from '@/store/authStore';
import { Picker } from '@react-native-picker/picker';

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
  const filteredPages = getFilteredPages();

  // Sort pages by cost per booking (worst performing first)
  const sortedPages = [...filteredPages].sort((a, b) => {
    // Handle pages without metrics
    if (!a.metrics && !b.metrics) return 0;
    if (!a.metrics) return 1; // Put pages without metrics at the end
    if (!b.metrics) return -1;

    // Handle null cost_per_booking (no bookings = infinite cost)
    const aCost = a.metrics.cost_per_booking;
    const bCost = b.metrics.cost_per_booking;

    // Both have no bookings (infinite cost)
    if (aCost === null && bCost === null) return 0;

    // Pages with no bookings (infinite cost) should appear first
    if (aCost === null) return -1; // a has infinite cost, goes first
    if (bCost === null) return 1;  // b has infinite cost, goes first

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

  // Temporarily comment out the admin check to test
  // if (!user?.is_admin) {
  //   return (
  //     <View style={[styles.container, styles.centerContent]}>
  //       <Ionicons name="lock-closed" size={48} color={Theme.colors.text.secondary} />
  //       <Text style={styles.errorText}>Admin access required</Text>
  //       <Text style={styles.errorText}>Debug: user.is_admin = {String(user?.is_admin)}</Text>
  //     </View>
  //   );
  // }

  // Don't show initial loading state if we have cached pages
  // The skeletons will show during metrics loading instead

  if (error && sortedPages.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle" size={48} color={Theme.colors.status.error} />
        <Text style={styles.errorText}>{error}</Text>
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

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshPages}
            colors={[Theme.colors.primary]}
          />
        }>
        <View style={styles.content}>
          <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Ad Performance</Text>
            {isOffline && (
              <View style={styles.offlineBadge}>
                <Ionicons name="cloud-offline" size={16} color="#FFF" />
                <Text style={styles.offlineText}>Offline</Text>
              </View>
            )}
          </View>
          {lastSync && (
            <Text style={styles.syncText}>
              Last synced:{' '}
              {new Date(lastSync).toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          )}
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Theme.colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Facebook pages..."
            placeholderTextColor={Theme.colors.text.tertiary}
            value={localSearchQuery}
            onChangeText={setLocalSearchQuery}
          />
          {localSearchQuery !== '' && (
            <TouchableOpacity onPress={() => setLocalSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Theme.colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <Text style={styles.timeRangeLabel}>Time Range:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedTimeRange}
              onValueChange={(value: TimeRange) => setTimeRange(value)}
              style={styles.picker}
              itemStyle={styles.pickerItem}>
              {timeRangeOptions.map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Facebook Pages List */}
        {sortedPages.length === 0 && !isLoading ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={Theme.colors.text.tertiary} />
            <Text style={styles.emptyText}>No Facebook pages found</Text>
          </View>
        ) : (
          sortedPages.map((page) =>
            // Show skeleton if metrics are still loading for this page
            !page.metrics ? (
              <FacebookCardSkeleton key={page.id} />
            ) : (
            <Card key={page.id} variant="elevated" style={styles.card}>
              <View style={styles.pageHeader}>
                <View style={styles.pageIcon}>
                  <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                </View>
                <View style={styles.pageInfo}>
                  <Text style={styles.pageName}>{page.name}</Text>
                  <View style={styles.statusContainer}>
                    <View
                      style={[
                        styles.statusDot,
                        page.status === 'active' ? styles.statusActive : styles.statusInactive,
                      ]}
                    />
                    <Text style={styles.statusText}>{page.status}</Text>
                  </View>
                </View>
              </View>

              {/* Metrics */}
              {page.metrics ? (
                <View style={styles.metricsContainer}>
                  <View style={styles.metricRow}>
                    <Ionicons name="cash-outline" size={18} color={Theme.colors.primary} />
                    <Text style={styles.metricLabel}>Ad Spend:</Text>
                    <Text style={styles.metricValue}>
                      {formatCurrency(page.metrics.total_spend)}
                    </Text>
                  </View>

                  <View style={styles.metricRow}>
                    <Ionicons name="calendar-outline" size={18} color={Theme.colors.status.success} />
                    <Text style={styles.metricLabel}>Bookings:</Text>
                    <Text style={styles.metricValue}>
                      {page.metrics.total_bookings}
                    </Text>
                  </View>

                  <View style={styles.metricRow}>
                    <Ionicons name="trending-up" size={18} color={Theme.colors.status.warning} />
                    <Text style={styles.metricLabel}>Cost/Booking:</Text>
                    <Text style={styles.metricValue}>
                      {page.metrics.cost_per_booking
                        ? formatCurrency(page.metrics.cost_per_booking)
                        : 'N/A'}
                    </Text>
                  </View>

                  {/* Club Breakdown */}
                  {page.metrics.club_bookings && page.metrics.club_bookings.length > 0 && (
                    <View style={styles.clubBreakdownContainer}>
                      <Text style={styles.clubBreakdownTitle}>Bookings by Club:</Text>
                      {page.metrics.club_bookings
                        .sort((a, b) => b.bookings - a.bookings)
                        .map((club) => (
                          <View key={club.club_id} style={styles.clubRow}>
                            <Text style={styles.clubName}>{club.club_name}</Text>
                            <View style={styles.clubBookings}>
                              <Text style={styles.clubBookingsCount}>{club.bookings}</Text>
                              <Text style={styles.clubBookingsLabel}>
                                {club.bookings === 1 ? 'booking' : 'bookings'}
                              </Text>
                            </View>
                          </View>
                        ))}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.noMetrics}>
                  <Text style={styles.noMetricsText}>No metrics available for this period</Text>
                </View>
              )}
            </Card>
            )
          )
        )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.secondary,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  errorText: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
  },
  content: {
    padding: Theme.spacing.lg,
  },
  header: {
    marginBottom: Theme.spacing.lg,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  title: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: Theme.colors.text.primary,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.status.warning,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.sm,
    gap: 4,
  },
  offlineText: {
    color: '#FFF',
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.medium,
  },
  syncText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.text.secondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background.primary,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.text.primary,
    fontFamily: Theme.typography.fonts.regular,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  timeRangeLabel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.primary,
    marginRight: Theme.spacing.md,
  },
  pickerWrapper: {
    flex: 1,
    backgroundColor: Theme.colors.background.primary,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
  },
  picker: {
    height: 44,
  },
  pickerItem: {
    fontSize: Theme.typography.sizes.md,
    height: 44,
  },
  card: {
    marginBottom: Theme.spacing.lg,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  pageIcon: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.background.secondary,
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
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Theme.spacing.xs,
  },
  statusActive: {
    backgroundColor: Theme.colors.status.success,
  },
  statusInactive: {
    backgroundColor: Theme.colors.text.tertiary,
  },
  statusText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.text.secondary,
    fontFamily: Theme.typography.fonts.regular,
  },
  metricsContainer: {
    gap: Theme.spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background.secondary,
    padding: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.sm,
    gap: Theme.spacing.sm,
  },
  metricLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.secondary,
    flex: 1,
  },
  metricValue: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
  },
  noMetrics: {
    paddingVertical: Theme.spacing.lg,
    alignItems: 'center',
  },
  noMetricsText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.text.tertiary,
    fontFamily: Theme.typography.fonts.regular,
  },
  emptyState: {
    paddingVertical: Theme.spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.text.tertiary,
    fontFamily: Theme.typography.fonts.regular,
  },
  clubBreakdownContainer: {
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border.light,
  },
  clubBreakdownTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.secondary,
    marginBottom: Theme.spacing.sm,
  },
  clubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
    backgroundColor: Theme.colors.background.tertiary,
    borderRadius: Theme.borderRadius.xs,
    marginBottom: Theme.spacing.xs,
  },
  clubName: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.primary,
    flex: 1,
  },
  clubBookings: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  clubBookingsCount: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.bold,
    color: Theme.colors.primary,
  },
  clubBookingsLabel: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
  },
});