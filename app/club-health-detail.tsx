import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { HealthScoreBadge } from '@/components/club-health/HealthScoreBadge';
import { Ionicons } from '@expo/vector-icons';
import { clubHealthNewService } from '@/services/api/clubHealthNew.service';
import {
  ClubHealthScore,
  ClubHealthTrend,
  DateRange,
  IndividualScores,
  dateRangeOptions,
} from '@/types/clubHealth';
import { format, formatDistanceToNow } from 'date-fns';
import { MetricsRadarChart } from '@/components/club-health/MetricsRadarChart';
import { LineGraph } from 'react-native-graph';
import { Button, Chip } from '@/components/ui';

const { width: screenWidth } = Dimensions.get('window');

export default function ClubHealthDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const clubId = Number(params.clubId);
  const clubName = params.clubName as string;

  const [healthData, setHealthData] = useState<ClubHealthScore | null>(null);
  const [trendData, setTrendData] = useState<ClubHealthTrend | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>('last_30_days');
  const [selectedTrendPeriod, setSelectedTrendPeriod] = useState<'7_days' | '30_days' | '3_months'>('30_days');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFullSummary, setShowFullSummary] = useState(false);

  // Load health data
  const loadHealthData = useCallback(async (recalculate = false) => {
    try {
      if (recalculate) {
        setIsRecalculating(true);
      } else if (!healthData) {
        setIsLoading(true);
      }

      const [health, trend] = await Promise.all([
        clubHealthNewService.getClubHealth(clubId, selectedDateRange, recalculate),
        clubHealthNewService.getClubHealthTrend(clubId, selectedTrendPeriod),
      ]);

      setHealthData(health);
      setTrendData(trend);
      setError(null);
    } catch (err) {
      console.error('Error loading club health data:', err);
      setError('Failed to load club health data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRecalculating(false);
      setIsRefreshing(false);
    }
  }, [clubId, selectedDateRange, selectedTrendPeriod, healthData]);

  // Initial load
  useEffect(() => {
    loadHealthData();
  }, []);

  // Handle date range change
  const handleDateRangeChange = (range: DateRange) => {
    setSelectedDateRange(range);
    loadHealthData();
  };

  // Handle trend period change
  const handleTrendPeriodChange = (period: '7_days' | '30_days' | '3_months') => {
    setSelectedTrendPeriod(period);
    loadHealthData();
  };

  // Render metric card
  const renderMetricCard = (
    label: string,
    value: number,
    icon: keyof typeof Ionicons.glyphMap,
    suffix = '',
    prefix = '',
    isPercentage = false
  ) => {
    const color = clubHealthNewService.getScoreColor(value);

    return (
      <View style={styles.metricCard}>
        <View style={[styles.metricIconContainer, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, { color }]}>
          {prefix}{isPercentage ? Math.round(value) : value.toFixed(1)}{suffix}
        </Text>
        <View style={styles.metricBar}>
          <View
            style={[
              styles.metricBarFill,
              { width: `${Math.min(value, 100)}%`, backgroundColor: color },
            ]}
          />
        </View>
      </View>
    );
  };

  // Render issues section
  const renderIssues = () => {
    if (!healthData?.key_issues || healthData.key_issues.length === 0) {
      return (
        <View style={styles.noIssuesContainer}>
          <Ionicons name="checkmark-circle" size={32} color="#10b981" />
          <Text style={styles.noIssuesText}>No critical issues detected</Text>
        </View>
      );
    }

    return (
      <View style={styles.issuesList}>
        {healthData.key_issues.map((issue, index) => (
          <View
            key={index}
            style={[
              styles.issueItem,
              {
                borderLeftColor: issue.severity === 'critical' ? '#ef4444' : '#f59e0b',
                backgroundColor: issue.severity === 'critical' ? '#ef444410' : '#f59e0b10',
              },
            ]}
          >
            <Ionicons
              name={issue.severity === 'critical' ? 'alert-circle' : 'warning'}
              size={20}
              color={issue.severity === 'critical' ? '#ef4444' : '#f59e0b'}
            />
            <View style={styles.issueContent}>
              <Text style={styles.issueMessage}>{issue.message}</Text>
              <View style={styles.issueMetaContainer}>
                <Text style={styles.issueMeta}>{issue.metric.replace(/_/g, ' ').toUpperCase()}</Text>
                {issue.value !== undefined && (
                  <Text style={styles.issueValue}>
                    {typeof issue.value === 'number' && issue.metric.includes('cost')
                      ? `£${issue.value.toFixed(2)}`
                      : typeof issue.value === 'number' && issue.metric.includes('rate')
                      ? `${issue.value}%`
                      : issue.value}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Render trend chart
  const renderTrendChart = () => {
    if (!trendData || !trendData.trend_points || trendData.trend_points.length < 2) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>Not enough data for trend analysis</Text>
        </View>
      );
    }

    // Prepare data for react-native-graph
    const graphData = trendData.trend_points.map((point) => ({
      value: point.overall_score,
      date: new Date(point.date),
    }));

    // Get min and max values for better scaling
    const values = graphData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    return (
      <View style={styles.chartContainer}>
        <View style={styles.graphWrapper}>
          <LineGraph
            points={graphData}
            animated={true}
            color={Theme.colors.primary}
            style={styles.graph}
            lineThickness={2}
            enablePanGesture={false}
          />

          {/* Y-axis labels */}
          <View style={styles.yAxisLabels}>
            <Text style={styles.axisLabel}>{Math.round(maxValue)}</Text>
            <Text style={styles.axisLabel}>{Math.round((maxValue + minValue) / 2)}</Text>
            <Text style={styles.axisLabel}>{Math.round(minValue)}</Text>
          </View>

          {/* X-axis labels */}
          <View style={styles.xAxisLabels}>
            {trendData.trend_points.filter((_, i) =>
              i === 0 || i === Math.floor(trendData.trend_points.length / 2) || i === trendData.trend_points.length - 1
            ).map((point, index) => (
              <Text key={index} style={styles.axisLabel}>
                {format(new Date(point.date), 'MMM d')}
              </Text>
            ))}
          </View>
        </View>

        {trendData && trendData.summary && (
          <View style={styles.trendSummary}>
            <View style={styles.trendStat}>
              <Text style={styles.trendStatLabel}>Start</Text>
              <Text style={[styles.trendStatValue, { color: clubHealthNewService.getScoreColor(trendData.summary.start_score) }]}>
                {Math.round(trendData.summary.start_score)}
              </Text>
            </View>
            <View style={styles.trendStat}>
              <Text style={styles.trendStatLabel}>Current</Text>
              <Text style={[styles.trendStatValue, { color: clubHealthNewService.getScoreColor(trendData.summary.end_score) }]}>
                {Math.round(trendData.summary.end_score)}
              </Text>
            </View>
            <View style={styles.trendStat}>
              <Text style={styles.trendStatLabel}>Change</Text>
              <View style={styles.trendChange}>
                <Ionicons
                  name={trendData.summary.improvement > 0 ? 'trending-up' : trendData.summary.improvement < 0 ? 'trending-down' : 'remove'}
                  size={16}
                  color={trendData.summary.improvement > 0 ? '#10b981' : trendData.summary.improvement < 0 ? '#ef4444' : palette.textTertiary}
                />
                <Text style={[
                  styles.trendStatValue,
                  { color: trendData.summary.improvement > 0 ? '#10b981' : trendData.summary.improvement < 0 ? '#ef4444' : palette.textTertiary }
                ]}>
                  {Math.abs(trendData.summary.improvement)}%
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Loading state
  if (isLoading && !healthData) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={clubName} onBackPress={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Loading health data...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error && !healthData) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={clubName} onBackPress={() => router.back()} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Theme.colors.status.error} />
          <Text style={styles.errorTitle}>Error Loading Data</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            onPress={() => loadHealthData()}
            variant="primary"
          >
            Retry
          </Button>
        </View>
      </View>
    );
  }

  if (!healthData) return null;

  // Parse the date safely
  let timeAgo = 'Recently';
  try {
    const calculatedDate = new Date(healthData.calculated_at);
    if (!isNaN(calculatedDate.getTime())) {
      timeAgo = formatDistanceToNow(calculatedDate, { addSuffix: true });
    }
  } catch (error) {
    console.error('Error parsing calculated_at date:', healthData.calculated_at);
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={clubName}
        onBackPress={() => router.back()}
      />

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={() => loadHealthData(true)}
        disabled={isRecalculating}
      >
        {isRecalculating ? (
          <ActivityIndicator size="small" color={palette.textPrimary} />
        ) : (
          <Ionicons name="refresh" size={24} color={palette.textPrimary} />
        )}
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadHealthData();
            }}
            colors={[Theme.colors.primary]}
          />
        }
      >
        {/* Overall Score */}
        <View style={styles.scoreSection}>
          <HealthScoreBadge
            score={healthData.overall_score}
            status={healthData.health_status}
            size="large"
            animated={true}
          />
          <Text style={styles.lastUpdated}>Updated {timeAgo}</Text>
        </View>

        {/* Date Range Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateRangeContainer}
        >
          {dateRangeOptions.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={selectedDateRange === option.value}
              onPress={() => handleDateRangeChange(option.value)}
              style={styles.dateRangeChip}
            />
          ))}
        </ScrollView>

        {/* AI Summary */}
        {healthData.ai_summary && healthData.ai_summary !== null && (
          <View style={styles.summarySection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sparkles" size={20} color={Theme.colors.primary} />
              <Text style={styles.sectionTitle}>AI Analysis</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowFullSummary(!showFullSummary)}
              style={styles.summaryContent}
            >
              <Text
                style={styles.summaryText}
                numberOfLines={showFullSummary ? undefined : 3}
              >
                {healthData.ai_summary}
              </Text>
              {healthData.ai_summary.length > 150 && (
                <Text style={[styles.showMoreText, { color: Theme.colors.primary }]}>
                  {showFullSummary ? 'Show less' : 'Show more'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Individual Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          <View style={styles.metricsGrid}>
            {renderMetricCard(
              'Booking Efficiency',
              healthData.individual_scores.booking_efficiency,
              'trending-up',
              '%',
              '',
              true
            )}
            {renderMetricCard(
              'Show Up Rate',
              healthData.individual_scores.show_up_rate,
              'people',
              '%',
              '',
              true
            )}
            {renderMetricCard(
              'Enrollment Rate',
              healthData.individual_scores.enrollment_conversion,
              'person-add',
              '%',
              '',
              true
            )}
            {renderMetricCard(
              'Revenue Health',
              healthData.individual_scores.revenue_health,
              'cash',
              '%',
              '',
              true
            )}
            {renderMetricCard(
              'Growth Trend',
              healthData.individual_scores.growth_trajectory,
              'analytics',
              '%',
              '',
              true
            )}
            {renderMetricCard(
              'Retention',
              healthData.individual_scores.retention_quality,
              'heart',
              '%',
              '',
              true
            )}
          </View>
        </View>

        {/* Radar Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <MetricsRadarChart scores={healthData.individual_scores} />
        </View>

        {/* Key Issues */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Key Issues</Text>
            {healthData.key_issues && healthData.key_issues.length > 0 && (
              <View style={styles.issueBadge}>
                <Text style={styles.issueBadgeText}>{healthData.key_issues.length}</Text>
              </View>
            )}
          </View>
          {renderIssues()}
        </View>

        {/* Trend Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trend Analysis</Text>
          <View style={styles.trendPeriodSelector}>
            {(['7_days', '30_days', '3_months'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.trendPeriodButton,
                  selectedTrendPeriod === period && styles.trendPeriodButtonActive,
                ]}
                onPress={() => handleTrendPeriodChange(period)}
              >
                <Text
                  style={[
                    styles.trendPeriodText,
                    selectedTrendPeriod === period && styles.trendPeriodTextActive,
                  ]}
                >
                  {period === '7_days' ? '7 Days' : period === '30_days' ? '30 Days' : '3 Months'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {renderTrendChart()}
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
    refreshButton: {
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
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
      gap: 16,
    },
    errorTitle: {
      fontSize: Theme.typography.sizes.xl,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
    },
    errorText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
      textAlign: 'center',
    },
    scoreSection: {
      alignItems: 'center',
      paddingVertical: 24,
      backgroundColor: palette.background,
      marginBottom: 16,
    },
    lastUpdated: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textTertiary,
      marginTop: 12,
    },
    dateRangeContainer: {
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    dateRangeChip: {
      marginRight: 8,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 12,
      gap: 8,
    },
    sectionTitle: {
      fontSize: Theme.typography.sizes.lg,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    summarySection: {
      backgroundColor: palette.background,
      marginHorizontal: 16,
      padding: 16,
      borderRadius: 12,
      marginBottom: 24,
    },
    summaryContent: {
      marginTop: 8,
    },
    summaryText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
      lineHeight: 20,
    },
    showMoreText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.semibold,
      marginTop: 8,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 12,
      gap: 8,
    },
    metricCard: {
      backgroundColor: palette.background,
      borderRadius: 12,
      padding: 16,
      width: (screenWidth - 32 - 16) / 2,
      alignItems: 'center',
    },
    metricIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    metricLabel: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textTertiary,
      textAlign: 'center',
      marginBottom: 4,
    },
    metricValue: {
      fontSize: Theme.typography.sizes.xl,
      fontFamily: Theme.typography.fonts.bold,
    },
    metricBar: {
      width: '100%',
      height: 4,
      backgroundColor: palette.borderLight,
      borderRadius: 2,
      marginTop: 8,
      overflow: 'hidden',
    },
    metricBarFill: {
      height: '100%',
      borderRadius: 2,
    },
    issuesList: {
      paddingHorizontal: 16,
      gap: 12,
    },
    issueItem: {
      flexDirection: 'row',
      backgroundColor: palette.background,
      borderRadius: 12,
      padding: 12,
      borderLeftWidth: 4,
      gap: 12,
      alignItems: 'flex-start',
    },
    issueContent: {
      flex: 1,
    },
    issueMessage: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textPrimary,
      marginBottom: 4,
    },
    issueMetaContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    issueMeta: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textTertiary,
    },
    issueValue: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textSecondary,
    },
    noIssuesContainer: {
      alignItems: 'center',
      padding: 24,
      gap: 8,
    },
    noIssuesText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
    },
    issueBadge: {
      backgroundColor: Theme.colors.status.error,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    issueBadgeText: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.semibold,
      color: '#FFFFFF',
    },
    chartContainer: {
      paddingHorizontal: 16,
    },
    graphWrapper: {
      position: 'relative',
      height: 220,
      marginBottom: 16,
    },
    graph: {
      width: screenWidth - 64,
      height: 200,
      marginLeft: 24,
    },
    yAxisLabels: {
      position: 'absolute',
      left: 0,
      top: 0,
      height: 200,
      justifyContent: 'space-between',
    },
    xAxisLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
      paddingLeft: 24,
    },
    axisLabel: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textTertiary,
    },
    noDataContainer: {
      alignItems: 'center',
      padding: 32,
    },
    noDataText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textTertiary,
    },
    trendPeriodSelector: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginBottom: 16,
      gap: 8,
    },
    trendPeriodButton: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: palette.borderDefault,
      alignItems: 'center',
    },
    trendPeriodButtonActive: {
      backgroundColor: Theme.colors.primary,
      borderColor: Theme.colors.primary,
    },
    trendPeriodText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textSecondary,
    },
    trendPeriodTextActive: {
      color: '#FFFFFF',
    },
    trendSummary: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: palette.borderLight,
    },
    trendStat: {
      alignItems: 'center',
    },
    trendStatLabel: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textTertiary,
      marginBottom: 4,
    },
    trendStatValue: {
      fontSize: Theme.typography.sizes.lg,
      fontFamily: Theme.typography.fonts.bold,
    },
    trendChange: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    bottomPadding: {
      height: 40,
    },
  });