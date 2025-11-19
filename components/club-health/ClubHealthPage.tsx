import React, { useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { ClubHealthData } from '@/types/clubHealth';
import { MetricsCard } from './MetricsCard';
import { FacebookAdsCard } from './FacebookAdsCard';
import { Ionicons } from '@expo/vector-icons';

interface ClubHealthPageProps {
  clubData: ClubHealthData | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const ClubHealthPage: React.FC<ClubHealthPageProps> = ({
  clubData,
  isLoading = false,
  onRefresh,
}) => {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  if (isLoading && !clubData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Loading club data...</Text>
      </View>
    );
  }

  if (!clubData) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="warning-outline" size={48} color={palette.textTertiary} />
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return Theme.colors.status.success;
    if (score >= 60) return Theme.colors.status.warning;
    return Theme.colors.status.error;
  };

  // Calculate a simple health score based on metrics
  const calculateHealthScore = () => {
    const { metrics } = clubData;
    let score = 50;
    score += (metrics.enrollment_rate / 100) * 30;
    score += (metrics.attendance_rate / 100) * 20;
    score -= metrics.no_show_rate * 0.5;
    return Math.min(100, Math.max(0, Math.round(score)));
  };

  const healthScore = calculateHealthScore();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={Theme.colors.primary}
          />
        ) : undefined
      }
    >
      {/* Club Header */}
      <View style={styles.clubHeader}>
        <View style={styles.clubInfo}>
          <Text style={styles.clubName}>{clubData.club.name}</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color={palette.textSecondary} />
            <Text style={styles.clubAddress}>
              {clubData.club.address}, {clubData.club.postcode}
            </Text>
          </View>
        </View>
        <View style={styles.healthScoreContainer}>
          <Text style={styles.healthScoreLabel}>Health Score</Text>
          <Text style={[styles.healthScore, { color: getHealthScoreColor(healthScore) }]}>
            {healthScore}
          </Text>
        </View>
      </View>

      {/* Key Metrics */}
      <MetricsCard metrics={clubData.metrics} />

      {/* Facebook Ads */}
      {clubData.facebook_ads && (
        <FacebookAdsCard metrics={clubData.facebook_ads} />
      )}

      {/* Quick Stats Grid */}
      <View style={styles.quickStatsContainer}>
        <Text style={styles.quickStatsTitle}>Quick Stats</Text>
        <View style={styles.quickStatsGrid}>
          <View style={styles.quickStatItem}>
            <Ionicons name="person-add" size={20} color={Theme.colors.status.success} />
            <Text style={styles.quickStatValue}>{clubData.metrics.new_students}</Text>
            <Text style={styles.quickStatLabel}>New Students</Text>
          </View>

          <View style={styles.quickStatItem}>
            <Ionicons name="refresh" size={20} color={Theme.colors.status.info} />
            <Text style={styles.quickStatValue}>{clubData.metrics.returning_students}</Text>
            <Text style={styles.quickStatLabel}>Returning</Text>
          </View>

          <View style={styles.quickStatItem}>
            <Ionicons name="school" size={20} color={Theme.colors.primary} />
            <Text style={styles.quickStatValue}>
              {clubData.metrics.average_class_size || '—'}
            </Text>
            <Text style={styles.quickStatLabel}>Avg Class</Text>
          </View>
        </View>
      </View>

      {/* Last Updated */}
      <View style={styles.footer}>
        <Text style={styles.lastUpdated}>
          Last updated: {new Date(clubData.last_updated).toLocaleString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            day: 'numeric',
            month: 'short',
          })}
        </Text>
      </View>
    </ScrollView>
  );
};

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.backgroundSecondary,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textTertiary,
  },
  clubHeader: {
    backgroundColor: palette.background,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clubInfo: {
    flex: 1,
    gap: 4,
  },
  clubName: {
    fontSize: 20,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clubAddress: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
  },
  healthScoreContainer: {
    alignItems: 'center',
    backgroundColor: palette.backgroundSecondary,
    padding: 12,
    borderRadius: 12,
    minWidth: 80,
  },
  healthScoreLabel: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    marginBottom: 4,
  },
  healthScore: {
    fontSize: 28,
    fontFamily: Theme.typography.fonts.bold,
  },
  quickStatsContainer: {
    backgroundColor: palette.background,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: palette.borderLight,
  },
  quickStatsTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: 16,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  quickStatValue: {
    fontSize: 20,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginTop: 4,
  },
  quickStatLabel: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  lastUpdated: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textTertiary,
  },
});