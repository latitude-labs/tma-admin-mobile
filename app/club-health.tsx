import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { GlassView } from '@/components/ui/GlassView';
import PagerView from 'react-native-pager-view';
import { useRouter } from 'expo-router';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/store/authStore';
import { useClubHealthStore } from '@/store/clubHealthStore';
import { useOffline } from '@/hooks/useOffline';
import { ClubHealthPage } from '@/components/club-health/ClubHealthPage';
import { DateRangePicker } from '@/components/club-health/DateRangePicker';
import { DateRange } from '@/types/clubHealth';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ClubHealthScreen() {
  const router = useRouter();
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { user } = useAuthStore();
  const { isOffline } = useOffline();
  const pagerRef = useRef<PagerView>(null);

  const {
    clubs,
    clubsHealth,
    selectedDateRange,
    selectedClubId,
    isLoading,
    error,
    fetchClubs,
    fetchClubsHealth,
    setSelectedDateRange,
    setSelectedClubId,
    clearError,
  } = useClubHealthStore();

  const [currentPage, setCurrentPage] = useState(0);

  // Check if user is admin
  useEffect(() => {
    if (!user?.is_admin) {
      Alert.alert(
        'Access Denied',
        'This feature is only available to administrators.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [user, router]);

  // Fetch initial data
  useEffect(() => {
    if (!isOffline && user?.is_admin) {
      loadData();
    }
  }, [isOffline, user]);

  const loadData = async () => {
    await fetchClubs();
    await fetchClubsHealth(selectedDateRange);
  };

  // Handle date range change
  const handleDateRangeChange = async (range: DateRange) => {
    setSelectedDateRange(range);
    await fetchClubsHealth(range);
  };

  // Handle page change
  const handlePageSelected = (e: any) => {
    const pageIndex = e.nativeEvent.position;
    setCurrentPage(pageIndex);
    if (clubs[pageIndex]) {
      setSelectedClubId(clubs[pageIndex].id);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (!isOffline) {
      await fetchClubsHealth(selectedDateRange);
    }
  };

  // Show error
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  // Show offline message
  if (isOffline) {
    return (
      <View style={styles.container}>
      <LinearGradient colors={[palette.backgroundGradientStart, palette.backgroundGradientEnd]} style={StyleSheet.absoluteFillObject} />
        <ScreenHeader
          title="Club Health"
          onBackPress={() => router.back()}
        />
        <View style={styles.centerContainer}>
          <GlassView style={styles.stateGlass}>
            <Ionicons name="cloud-offline-outline" size={64} color={palette.textTertiary} />
            <Text style={styles.offlineTitle}>You're Offline</Text>
            <Text style={styles.offlineText}>
              Club health data requires an internet connection.
            </Text>
            <Text style={styles.offlineSubtext}>
              Please check your connection and try again.
            </Text>
          </GlassView>
        </View>
      </View>
    );
  }

  // Show loading
  if (isLoading && clubs.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[palette.backgroundGradientStart, palette.backgroundGradientEnd]} style={StyleSheet.absoluteFillObject} />
        <ScreenHeader
          title="Club Health"
          onBackPress={() => router.back()}
        />
        <View style={styles.centerContainer}>
          <GlassView style={styles.stateGlass}>
            <ActivityIndicator size="large" color={palette.tint} />
            <Text style={styles.loadingText}>Loading clubs...</Text>
          </GlassView>
        </View>
      </View>
    );
  }

  // Show empty state
  if (!isLoading && clubs.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[palette.backgroundGradientStart, palette.backgroundGradientEnd]} style={StyleSheet.absoluteFillObject} />
        <ScreenHeader
          title="Club Health"
          onBackPress={() => router.back()}
        />
        <View style={styles.centerContainer}>
          <GlassView style={styles.stateGlass}>
            <Ionicons name="business-outline" size={64} color={palette.textTertiary} />
            <Text style={styles.emptyTitle}>No Clubs Found</Text>
            <Text style={styles.emptyText}>
              There are no clubs available to display.
            </Text>
          </GlassView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Club Health"
        onBackPress={() => router.back()}
      />

      {/* Date Range Picker */}
      <DateRangePicker
        selectedRange={selectedDateRange}
        onRangeChange={handleDateRangeChange}
      />

      {/* Club Indicator */}
      <View style={styles.clubIndicator}>
        <Text style={styles.clubIndicatorText}>
          {clubs[currentPage]?.name || 'Loading...'}
        </Text>
        <View style={styles.pageIndicator}>
          {clubs.map((_, index) => (
            <View
              key={index}
              style={[
                styles.pageIndicatorDot,
                index === currentPage && styles.pageIndicatorDotActive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Swipeable Club Pages */}
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={handlePageSelected}
      >
        {clubs.map((club) => {
          const clubData = clubsHealth.find((ch) => ch.club.id === club.id);
          return (
            <View key={club.id} style={styles.page}>
              <ClubHealthPage
                clubData={clubData || null}
                isLoading={isLoading}
                onRefresh={handleRefresh}
              />
            </View>
          );
        })}
      </PagerView>

      {/* Swipe Hint */}
      {clubs.length > 1 && (
        <View style={styles.swipeHint}>
          <Ionicons name="swap-horizontal" size={20} color={palette.textTertiary} />
          <Text style={styles.swipeHintText}>
            Swipe to view other clubs
          </Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.backgroundSecondary,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Theme.spacing.xl,
    },
    stateGlass: {
      alignItems: 'center',
      padding: Theme.spacing['2xl'],
      borderRadius: Theme.borderRadius.xl,
      overflow: 'hidden',
      gap: Theme.spacing.sm,
    },
    offlineTitle: {
      fontSize: Theme.typography.sizes.xl,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
      marginTop: Theme.spacing.sm,
      marginBottom: Theme.spacing.xs,
    },
    offlineText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
      textAlign: 'center',
    },
    offlineSubtext: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textTertiary,
      textAlign: 'center',
    },
    loadingText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
      marginTop: Theme.spacing.sm,
    },
    emptyTitle: {
      fontSize: Theme.typography.sizes.xl,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
      marginTop: Theme.spacing.sm,
      marginBottom: Theme.spacing.xs,
    },
    emptyText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
      textAlign: 'center',
    },
    clubIndicator: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: palette.background,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderLight,
      alignItems: 'center',
    },
    clubIndicatorText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: 'System', fontWeight: '600',
      color: palette.textPrimary,
      marginBottom: 8,
    },
    pageIndicator: {
      flexDirection: 'row',
      gap: 6,
    },
    pageIndicatorDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: palette.borderDefault,
    },
    pageIndicatorDotActive: {
      backgroundColor: palette.textPrimary,
      width: 18,
    },
    pagerView: {
      flex: 1,
    },
    page: {
      flex: 1,
    },
    swipeHint: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      backgroundColor: palette.background,
      borderTopWidth: 1,
      borderTopColor: palette.borderLight,
    },
    swipeHintText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: 'System', fontWeight: '400',
      color: palette.textTertiary,
    },
  });