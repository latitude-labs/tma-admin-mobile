import { ClubHealthCard } from '@/components/club-health/ClubHealthCard';
import { Chip } from '@/components/ui';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Theme } from '@/constants/Theme';
import { useOffline } from '@/hooks/useOffline';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { ClubHealthFilters, clubHealthNewService } from '@/services/api/clubHealthNew.service';
import { useAuthStore } from '@/store/authStore';
import {
  ClubHealthScore,
  DateRange,
  HealthStatus,
  dateRangeOptions,
} from '@/types/clubHealth';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ClubHealthOverviewScreen() {
  const router = useRouter();
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { user } = useAuthStore();
  const { isOffline } = useOffline();

  const [clubsData, setClubsData] = useState<ClubHealthScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>('last_30_days');
  const [selectedStatus, setSelectedStatus] = useState<HealthStatus | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Load data
  const loadData = useCallback(async (isRefresh = false) => {
    if (isOffline) {
      setError('You are offline. Club health data requires an internet connection.');
      setIsLoading(false);
      return;
    }

    if (!user?.is_admin) {
      setError('This feature is only available to administrators.');
      setIsLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const filters: ClubHealthFilters = {
        date_range: selectedDateRange,
        status: selectedStatus || undefined,
        latest_only: true,
      };

      const clubs = await clubHealthNewService.getAllClubsHealth(filters);

      // Sort clubs by score (lowest first - clubs needing attention)
      const sortedClubs = clubs.sort((a, b) => a.overall_score - b.overall_score);

      setClubsData(sortedClubs);
    } catch (err) {
      console.error('Error loading club health data:', err);
      setError('Failed to load club health data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isOffline, user, selectedDateRange, selectedStatus]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute summary from clubsData
  const summary = useMemo(() => {
    if (clubsData.length === 0) return null;

    const totalClubs = clubsData.length;
    const averageScore = clubsData.reduce((sum, club) => sum + club.overall_score, 0) / totalClubs;

    const byStatus = {
      critical: 0,
      poor: 0,
      needs_attention: 0,
      good: 0,
      excellent: 0,
    };

    clubsData.forEach(club => {
      byStatus[club.health_status]++;
    });

    return {
      total_clubs: totalClubs,
      average_score: averageScore,
      by_status: byStatus,
    };
  }, [clubsData]);

  // Handle club press
  const handleClubPress = (club: ClubHealthScore) => {
    router.push({
      pathname: '/club-health-detail',
      params: {
        clubId: club.club_id,
        clubName: club.club_name,
      },
    });
  };

  // Render filter modal
  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Clubs</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color={palette.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Date Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Date Range</Text>
              <View style={styles.filterOptions}>
                {dateRangeOptions.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    selected={selectedDateRange === option.value}
                    onPress={() => setSelectedDateRange(option.value)}
                    style={styles.filterChip}
                  />
                ))}
              </View>
            </View>

            {/* Health Status */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Health Status</Text>
              <View style={styles.filterOptions}>
                <Chip
                  label="All"
                  selected={selectedStatus === null}
                  onPress={() => setSelectedStatus(null)}
                  style={styles.filterChip}
                />
                {['critical', 'poor', 'needs_attention', 'good', 'excellent'].map((status) => (
                  <Chip
                    key={status}
                    label={clubHealthNewService.getHealthStatusLabel(status as HealthStatus)}
                    selected={selectedStatus === status}
                    onPress={() => setSelectedStatus(status as HealthStatus)}
                    style={styles.filterChip}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: Theme.colors.primary }]}
            onPress={() => {
              setShowFilterModal(false);
              loadData();
            }}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Render summary header
  const renderSummaryHeader = () => {
    if (!summary) return null;

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Overview</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>{summary.total_clubs}</Text>
              <Text style={styles.summaryStatLabel}>Total Clubs</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatValue, { color: clubHealthNewService.getScoreColor(summary.average_score) }]}>
                {Math.round(summary.average_score)}
              </Text>
              <Text style={styles.summaryStatLabel}>Avg Score</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatValue, { color: '#ef4444' }]}>
                {summary.by_status.critical + summary.by_status.poor}
              </Text>
              <Text style={styles.summaryStatLabel}>Need Attention</Text>
            </View>
          </View>
        </View>

        {/* Status breakdown */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusBreakdown}>
          {Object.entries(summary.by_status).map(([status, count]) => (
            <View
              key={status}
              style={[
                styles.statusChip,
                { backgroundColor: clubHealthNewService.getHealthStatusColor(status as HealthStatus) + '15' }
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: clubHealthNewService.getHealthStatusColor(status as HealthStatus) }
                ]}
              />
              <Text style={styles.statusCount}>{count}</Text>
              <Text style={styles.statusLabel}>
                {clubHealthNewService.getHealthStatusLabel(status as HealthStatus)}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="business-outline" size={64} color={palette.textTertiary} />
      <Text style={styles.emptyTitle}>No Clubs Found</Text>
      <Text style={styles.emptyText}>
        {selectedStatus
          ? `No clubs with "${clubHealthNewService.getHealthStatusLabel(selectedStatus)}" status`
          : 'There are no clubs available to display'}
      </Text>
      {selectedStatus && (
        <TouchableOpacity
          style={styles.clearFilterButton}
          onPress={() => {
            setSelectedStatus(null);
            loadData();
          }}
        >
          <Text style={[styles.clearFilterText, { color: Theme.colors.primary }]}>
            Clear Filters
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={64} color={Theme.colors.status.error} />
      <Text style={styles.errorTitle}>Error Loading Data</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: Theme.colors.primary }]}
        onPress={() => loadData()}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // Render loading state
  if (isLoading && clubsData.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Club Health" onBackPress={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Loading club health data...</Text>
        </View>
      </View>
    );
  }

  // Render error state
  if (error && clubsData.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Club Health" onBackPress={() => router.back()} />
        {renderErrorState()}
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ScreenHeader
          title="Club Health"
          onBackPress={() => router.back()}
        />

      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowFilterModal(true)}
      >
        <Ionicons name="filter" size={24} color={palette.textPrimary} />
      </TouchableOpacity>

      <FlatList
        data={clubsData}
        keyExtractor={(item) => item.club_id.toString()}
        renderItem={({ item, index }) => (
          <ClubHealthCard
            clubData={item}
            onPress={() => handleClubPress(item)}
            index={index}
          />
        )}
        ListHeaderComponent={renderSummaryHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            colors={[Theme.colors.primary]}
          />
        }
        contentContainerStyle={clubsData.length === 0 ? styles.emptyListContainer : styles.listContent}
        showsVerticalScrollIndicator={false}
      />

        {renderFilterModal()}
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
    filterButton: {
      position: 'absolute',
      top: 50,
      right: 16,
      zIndex: 10,
      padding: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
    },
    listContent: {
      paddingBottom: 20,
    },
    emptyListContainer: {
      flex: 1,
    },
    summaryContainer: {
      paddingTop: 16,
    },
    summaryCard: {
      backgroundColor: palette.background,
      marginHorizontal: 16,
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    summaryTitle: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
      marginBottom: 12,
    },
    summaryStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    summaryStat: {
      alignItems: 'center',
    },
    summaryStatValue: {
      fontSize: Theme.typography.sizes.xl,
      fontFamily: Theme.typography.fonts.bold,
      color: palette.textPrimary,
    },
    summaryStatLabel: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textTertiary,
      marginTop: 4,
    },
    statusBreakdown: {
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    statusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
      gap: 6,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusCount: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
    },
    statusLabel: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: Theme.typography.sizes.xl,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
      textAlign: 'center',
    },
    clearFilterButton: {
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    clearFilterText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.semibold,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    errorTitle: {
      fontSize: Theme.typography.sizes.xl,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
      marginTop: 16,
      marginBottom: 8,
    },
    errorText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    retryButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: '#FFFFFF',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: palette.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 20,
      paddingBottom: 40,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: Theme.typography.sizes.lg,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
    },
    filterSection: {
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    filterLabel: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textSecondary,
      marginBottom: 12,
      textTransform: 'uppercase',
    },
    filterOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    filterChip: {
      marginBottom: 8,
    },
    applyButton: {
      marginHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 20,
    },
    applyButtonText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: '#FFFFFF',
    },
  });