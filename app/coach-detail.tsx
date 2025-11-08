import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Theme } from '@/constants/Theme';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { ScreenHeader, Dropdown } from '@/components/ui';
import { Coach, CoachStats, DateRangeFilter, dateRangeOptions } from '@/types/coaches';
import { coachesService } from '@/services/api/coaches.service';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function CoachDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const coachId = Number(params.coachId);
  const coachName = params.coachName as string;

  const [coach, setCoach] = useState<Coach | null>(null);
  const [stats, setStats] = useState<CoachStats | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeFilter>('past_month');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load coach data and stats
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const [coachData, statsData] = await Promise.all([
        coachesService.getCoachById(coachId),
        coachesService.getCoachStats(coachId, selectedDateRange),
      ]);

      setCoach(coachData);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading coach data:', err);
      setError('Failed to load coach data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [coachId, selectedDateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDateRangeChange = (value: string) => {
    setSelectedDateRange(value as DateRangeFilter);
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/coach-form',
      params: {
        coachId: coachId,
        mode: 'edit',
      },
    });
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Coach',
      `Are you sure you want to delete ${coach?.name || 'this coach'}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await coachesService.deleteCoach(coachId);
              router.back();
            } catch (err) {
              console.error('Error deleting coach:', err);
              Alert.alert('Error', 'Failed to delete coach. Please try again.');
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  // Render stat card
  const renderStatCard = (
    title: string,
    value: number,
    icon: keyof typeof Ionicons.glyphMap,
    subtitle: string,
    color: string
  ) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value.toFixed(1)}%</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );

  // Loading state
  if (isLoading && !coach) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title={coachName || 'Coach'} onBackPress={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Loading coach data...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error && !coach) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title={coachName || 'Coach'} onBackPress={() => router.back()} />
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
      </View>
    );
  }

  if (!coach || !stats) return null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={coach.name || ''}
        onBackPress={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            colors={[Theme.colors.primary]}
          />
        }
      >
        {/* Coach Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={20} color={palette.textSecondary} />
            <Text style={styles.infoText}>{coach.email || ''}</Text>
          </View>
          {coach.phone_number ? (
            <View style={styles.infoRow}>
              <Ionicons name="call" size={20} color={palette.textSecondary} />
              <Text style={styles.infoText}>{coach.phone_number}</Text>
            </View>
          ) : null}
        </View>

        {/* Date Range Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Date Range</Text>
          <Dropdown
            value={selectedDateRange}
            options={dateRangeOptions}
            onValueChange={handleDateRangeChange}
            placeholder="Select date range"
          />
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Performance Stats</Text>

          {renderStatCard(
            'Enrollment Rate (On Day)',
            stats.enrollment_rate_on_day,
            'flash',
            `${stats.total_on_day_enrollments_period} enrolled on day / ${stats.total_trials_period} trials`,
            Theme.colors.primary
          )}

          {renderStatCard(
            'Enrollment Rate (Year-to-Date)',
            stats.enrollment_rate_ytd,
            'trending-up',
            `${stats.total_enrollments_ytd} total enrolled / ${stats.total_trials_ytd} trials`,
            Theme.colors.status.success
          )}
        </View>

        {/* Additional Stats Cards */}
        <View style={styles.additionalStatsSection}>
          <View style={styles.miniStatCard}>
            <Text style={styles.miniStatLabel}>Trials (Period)</Text>
            <Text style={[styles.miniStatValue, { color: Theme.colors.primary }]}>
              {stats.total_trials_period}
            </Text>
          </View>
          <View style={styles.miniStatCard}>
            <Text style={styles.miniStatLabel}>Trials (YTD)</Text>
            <Text style={[styles.miniStatValue, { color: Theme.colors.status.success }]}>
              {stats.total_trials_ytd}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={handleEdit}
          >
            <Ionicons name="create-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Edit Coach</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Delete Coach</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.backgroundSecondary,
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
      borderRadius: Theme.borderRadius.md,
    },
    retryButtonText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: '#FFFFFF',
    },
    infoSection: {
      backgroundColor: palette.background,
      marginHorizontal: 16,
      marginTop: 16,
      padding: 16,
      borderRadius: Theme.borderRadius.lg,
      gap: 12,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    infoText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textPrimary,
    },
    filterSection: {
      marginHorizontal: 16,
      marginTop: 24,
    },
    filterLabel: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    statsSection: {
      marginTop: 24,
      marginHorizontal: 16,
    },
    sectionTitle: {
      fontSize: Theme.typography.sizes.lg,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
      marginBottom: 16,
    },
    statCard: {
      backgroundColor: palette.background,
      borderRadius: Theme.borderRadius.lg,
      padding: 20,
      marginBottom: 16,
      borderLeftWidth: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    statHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    statIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    statTitle: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
    },
    statValue: {
      fontSize: Theme.typography.sizes['2xl'],
      fontFamily: Theme.typography.fonts.bold,
      marginBottom: 8,
    },
    statSubtitle: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
    },
    additionalStatsSection: {
      flexDirection: 'row',
      marginHorizontal: 16,
      gap: 12,
      marginBottom: 24,
    },
    miniStatCard: {
      flex: 1,
      backgroundColor: palette.background,
      borderRadius: Theme.borderRadius.lg,
      padding: 16,
      alignItems: 'center',
    },
    miniStatLabel: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textTertiary,
      marginBottom: 8,
      textAlign: 'center',
    },
    miniStatValue: {
      fontSize: Theme.typography.sizes.xl,
      fontFamily: Theme.typography.fonts.bold,
    },
    actionsSection: {
      marginHorizontal: 16,
      gap: 12,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: Theme.borderRadius.md,
      gap: 8,
    },
    editButton: {
      backgroundColor: Theme.colors.primary,
    },
    deleteButton: {
      backgroundColor: Theme.colors.status.error,
    },
    actionButtonText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: '#FFFFFF',
    },
    bottomPadding: {
      height: 40,
    },
  });
