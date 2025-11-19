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
  FlatList,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';
import { LineGraph, GraphPoint } from 'react-native-graph';
import { Chip, Button, Card } from '@/components/ui';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import PagerView from 'react-native-pager-view';
import { useFacebookStore } from '@/store/facebookStore';
import { ChartMetric, RunningAd, TimeSeriesDataPoint } from '@/types/facebook';
import { getMockAdsForPage } from '@/utils/mockFacebookAds';
import { facebookService } from '@/services/api/facebook.service';
import { Toast } from '@/components/ui/Toast';

const { width: screenWidth } = Dimensions.get('window');
const AnimatedCard = Animated.createAnimatedComponent(Card);

interface TimeRangeOption {
  label: string;
  value: string;
  getDates: () => { start: string; end: string };
}

const timeRangeOptions: TimeRangeOption[] = [
  {
    label: 'Today',
    value: 'today',
    getDates: () => {
      const today = new Date();
      const dateStr = format(today, 'yyyy-MM-dd');
      return { start: dateStr, end: dateStr };
    },
  },
  {
    label: '7 Days',
    value: '7days',
    getDates: () => {
      const end = new Date();
      const start = subDays(end, 6);
      return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
    },
  },
  {
    label: '30 Days',
    value: '30days',
    getDates: () => {
      const end = new Date();
      const start = subDays(end, 29);
      return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
    },
  },
  {
    label: '90 Days',
    value: '90days',
    getDates: () => {
      const end = new Date();
      const start = subDays(end, 89);
      return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
    },
  },
];

export default function FacebookAdDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const pageUuid = params.pageUuid as string;
  const pageName = (params.pageName as string) || 'Facebook Page';

  const {
    fetchTimeSeriesForPage,
    getTimeSeriesForPage,
    isLoadingTimeSeries,
    timeSeriesError,
    clearTimeSeriesError,
  } = useFacebookStore();

  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('7days');
  const [currentChartPage, setCurrentChartPage] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [runningAds, setRunningAds] = useState<RunningAd[]>([]);
  const [pausingAdId, setPausingAdId] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<GraphPoint | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<ChartMetric>('spend');
  const [lastHapticPoint, setLastHapticPoint] = useState<string | null>(null);

  const timeSeriesData = getTimeSeriesForPage(pageUuid);

  // Load time series data
  const loadData = useCallback(async () => {
    const dateRange = timeRangeOptions.find(o => o.value === selectedTimeRange)?.getDates();
    if (dateRange && pageUuid) {
      await fetchTimeSeriesForPage(pageUuid, dateRange.start, dateRange.end);
    }
  }, [selectedTimeRange, pageUuid, fetchTimeSeriesForPage]);

  // Initial load
  useEffect(() => {
    loadData();
    // Load mock running ads
    setRunningAds(getMockAdsForPage(pageUuid));
  }, [loadData]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  // Handle time range change
  const handleTimeRangeChange = (range: string) => {
    setSelectedTimeRange(range);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Calculate trend percentage
  const calculateTrend = (data: GraphPoint[]): number => {
    if (data.length < 2) return 0;

    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;

    if (firstValue === 0) return lastValue > 0 ? 100 : 0;

    return ((lastValue - firstValue) / firstValue) * 100;
  };

  // Handle ad pause/unpause
  const handleToggleAdStatus = async (ad: RunningAd) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setPausingAdId(ad.id);

    try {
      const result = ad.status === 'active'
        ? await facebookService.pauseAd(ad.id)
        : await facebookService.unpauseAd(ad.id);

      if (result.success) {
        // Update local state
        setRunningAds(prev =>
          prev.map(a =>
            a.id === ad.id
              ? { ...a, status: a.status === 'active' ? 'paused' : 'active' }
              : a
          )
        );

        Toast.show({
          type: 'success',
          text: result.message,
        });

        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text: error.message || 'Failed to update ad status',
      });
    } finally {
      setPausingAdId(null);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format number with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-GB').format(num);
  };

  // Prepare chart data
  const prepareChartData = (metric: ChartMetric) => {
    if (!timeSeriesData || !timeSeriesData.data) return [];

    return timeSeriesData.data.map((point: TimeSeriesDataPoint) => {
      let value = 0;
      switch (metric) {
        case 'spend':
          value = point.total_spend;
          break;
        case 'chats':
          value = point.chats;
          break;
        case 'bookings':
          value = point.bookings;
          break;
        case 'cost_per_booking':
          value = point.cost_per_booking || 0;
          break;
      }
      return {
        value,
        date: new Date(point.date),
      };
    });
  };

  // Get metric color
  const getMetricColor = (metric: ChartMetric): string => {
    switch (metric) {
      case 'spend':
        return Theme.colors.primary;
      case 'chats':
        return '#9C27B0'; // Purple for chats
      case 'bookings':
        return palette.statusSuccess;
      case 'cost_per_booking':
        return palette.statusInfo;
      default:
        return palette.textSecondary;
    }
  };

  // Get metric label
  const getMetricLabel = (metric: ChartMetric): string => {
    switch (metric) {
      case 'spend':
        return 'Ad Spend';
      case 'chats':
        return 'Chats';
      case 'bookings':
        return 'Bookings';
      case 'cost_per_booking':
        return 'Cost per Booking';
      default:
        return metric;
    }
  };

  // Format metric value
  const formatMetricValue = (metric: ChartMetric, value: number): string => {
    switch (metric) {
      case 'spend':
      case 'cost_per_booking':
        return formatCurrency(value);
      case 'chats':
      case 'bookings':
        return formatNumber(value);
      default:
        return value.toString();
    }
  };

  // Get total metric value for the period
  const getTotalMetricValue = (metric: ChartMetric): number => {
    if (!timeSeriesData || !timeSeriesData.summary) {
      return 0;
    }

    const { summary } = timeSeriesData;

    switch (metric) {
      case 'spend':
        return summary.total_spend;
      case 'chats':
        return summary.total_chats;
      case 'bookings':
        return summary.total_bookings;
      case 'cost_per_booking':
        return summary.average_cost_per_booking || 0;
      default:
        return 0;
    }
  };

  // Render individual chart page
  const renderChartPage = (metric: ChartMetric) => {
    const chartData = prepareChartData(metric);
    const totalValue = getTotalMetricValue(metric);
    const trend = calculateTrend(chartData);
    const color = getMetricColor(metric);

    // Get the exact point from our data if one is selected
    const exactSelectedPoint = selectedPoint && selectedMetric === metric
      ? chartData.find(p => p.date.getTime() === selectedPoint.date.getTime())
      : null;

    // Determine what value to show - exact point from data or total
    const displayValue = exactSelectedPoint
      ? exactSelectedPoint.value
      : totalValue;

    const displayDate = exactSelectedPoint
      ? format(exactSelectedPoint.date, 'MMM d, yyyy')
      : null;

    return (
      <TouchableOpacity
        style={styles.chartPage}
        key={metric}
        activeOpacity={1}
        onPress={() => {
          // Dismiss selection when tapping outside the chart
          if (selectedPoint && selectedMetric === metric) {
            setSelectedPoint(null);
            setLastHapticPoint(null);
            if (Platform.OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }
        }}
      >
        {/* Metric Header */}
        <View style={styles.metricHeader}>
          <Text style={styles.metricTitle}>{getMetricLabel(metric)}</Text>
          <View style={styles.trendContainer}>
            <Ionicons
              name={trend >= 0 ? 'trending-up' : 'trending-down'}
              size={20}
              color={trend >= 0 ? palette.statusSuccess : palette.statusError}
            />
            <Text
              style={[
                styles.trendText,
                { color: trend >= 0 ? palette.statusSuccess : palette.statusError },
              ]}
            >
              {Math.abs(trend).toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Dynamic Value Display */}
        <Text style={[styles.currentValue, { color }]}>
          {formatMetricValue(metric, displayValue)}
        </Text>
        {selectedPoint && selectedMetric === metric ? (
          <Text style={styles.valueSubtitle}>{displayDate}</Text>
        ) : (
          <>
            {metric === 'cost_per_booking' ? (
              <Text style={styles.valueSubtitle}>Average</Text>
            ) : (
              <Text style={styles.valueSubtitle}>Total for period</Text>
            )}
          </>
        )}

        {/* Chart with gradient - prevent tap from bubbling to parent */}
        <View
          style={styles.chartWrapper}
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
        >
          {chartData.length > 0 ? (
            <>
              <LineGraph
                points={chartData}
                animated={true}
                color={color}
                style={styles.graph}
                lineThickness={3}
                enablePanGesture={true}
                enableFadeInMask={true}
                enableIndicator={false}
                SelectionDot={() => null}
                gradientFillColors={[`${color}40`, `${color}05`, `${color}00`]}
                onPointSelected={(point) => {
                  setSelectedPoint(point);
                  setSelectedMetric(metric);

                  // Trigger haptic feedback when moving to a new point (scroll wheel effect)
                  const pointKey = point.date.getTime().toString();
                  if (Platform.OS === 'ios' && lastHapticPoint !== pointKey) {
                    Haptics.selectionAsync(); // More subtle, higher frequency feedback
                    setLastHapticPoint(pointKey);
                  }
                }}
                onGestureEnd={() => {
                  // Reset haptic tracking when gesture ends
                  setLastHapticPoint(null);
                }}
              />
              {/* Persistent selected point indicator */}
              {selectedPoint && selectedMetric === metric && (() => {
                // Find the exact point in our data that matches the selected point
                const pointIndex = chartData.findIndex(p =>
                  p.date.getTime() === selectedPoint.date.getTime()
                );

                if (pointIndex === -1) {
                  console.warn('Selected point not found in chartData');
                  return null;
                }

                // Use the exact value from our data, not the selectedPoint value
                // This ensures we're not positioning based on interpolated values
                const exactPoint = chartData[pointIndex];

                // Get max value from the data
                const values = chartData.map(p => p.value);
                const maxValue = Math.max(...values);

                // LineGraph's Y-axis starts at 0 and extends slightly above max for breathing room
                const axisMin = 0;
                const rangeBuffer = 0.1; // 10% buffer above max
                const axisMax = maxValue * (1 + rangeBuffer);
                const axisRange = axisMax - axisMin;

                // Calculate normalized position (0 to 1) from bottom of axis to top
                // Use exactPoint.value to ensure we match the exact data point on the line
                const normalizedValue = axisRange === 0
                  ? 0.5
                  : (exactPoint.value - axisMin) / axisRange;

                // Calculate X position
                const xPosition = chartData.length > 1
                  ? (pointIndex / (chartData.length - 1)) * 100
                  : 50;

                // Calculate Y position as percentage from bottom
                const yPosition = normalizedValue * 100;

                return (
                  <Animated.View
                    entering={FadeIn.duration(200)}
                    style={[
                      styles.selectedPointIndicator,
                      {
                        backgroundColor: color,
                        left: `${xPosition}%`,
                        bottom: `${yPosition}%`,
                      },
                    ]}
                  >
                    <View style={[styles.selectedPointInner, { backgroundColor: palette.background }]} />
                  </Animated.View>
                );
              })()}
            </>
          ) : (
            <View style={styles.noChartData}>
              <Text style={styles.noChartDataText}>No data available</Text>
            </View>
          )}
        </View>

        {/* Hint Text */}
        <Text style={styles.chartHint}>
          {selectedPoint && selectedMetric === metric
            ? 'Tap outside chart to see total'
            : 'Tap and hold chart to see daily values'}
        </Text>

        {/* Date Range Label */}
        <Text style={styles.dateRangeLabel}>
          {timeSeriesData && timeSeriesData.data.length > 0
            ? `${format(new Date(timeSeriesData.data[0].date), 'MMM d')} - ${format(
                new Date(timeSeriesData.data[timeSeriesData.data.length - 1].date),
                'MMM d, yyyy'
              )}`
            : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render chart section
  const renderChart = () => {
    if (isLoadingTimeSeries) {
      return (
        <AnimatedCard variant="elevated" style={styles.chartCard} entering={FadeIn.duration(300)}>
          <View style={styles.chartLoadingContainer}>
            <ActivityIndicator size="large" color={palette.tint} />
            <Text style={styles.chartLoadingText}>Loading chart data...</Text>
          </View>
        </AnimatedCard>
      );
    }

    if (timeSeriesError) {
      return (
        <AnimatedCard variant="elevated" style={styles.chartCard} entering={FadeIn.duration(300)}>
          <View style={styles.chartErrorContainer}>
            <Ionicons name="alert-circle" size={48} color={palette.statusError} />
            <Text style={styles.chartErrorText}>{timeSeriesError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                clearTimeSeriesError();
                loadData();
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </AnimatedCard>
      );
    }

    if (!timeSeriesData || !timeSeriesData.data || timeSeriesData.data.length === 0) {
      return (
        <AnimatedCard variant="elevated" style={styles.chartCard} entering={FadeIn.duration(300)}>
          <View style={styles.chartErrorContainer}>
            <Ionicons name="bar-chart-outline" size={48} color={palette.textTertiary} />
            <Text style={styles.chartErrorText}>No data available for this period</Text>
          </View>
        </AnimatedCard>
      );
    }

    const metrics: ChartMetric[] = ['spend', 'chats', 'bookings', 'cost_per_booking'];

    return (
      <AnimatedCard variant="elevated" style={styles.chartCard} entering={FadeIn.duration(300)}>
        <PagerView
          style={styles.pagerView}
          initialPage={0}
          onPageSelected={(e) => {
            setCurrentChartPage(e.nativeEvent.position);
            setSelectedPoint(null); // Reset selection when changing pages
            setLastHapticPoint(null); // Reset haptic tracking
            // Removed haptic feedback here to prevent glitching on fast swipes
          }}
        >
          {metrics.map((metric) => renderChartPage(metric))}
        </PagerView>

        {/* Pagination Dots */}
        <View style={styles.paginationDots}>
          {metrics.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                {
                  backgroundColor:
                    currentChartPage === index ? palette.tint : palette.borderDefault,
                  width: currentChartPage === index ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>
      </AnimatedCard>
    );
  };

  // Render ad card
  const renderAdCard = ({ item, index }: { item: RunningAd; index: number }) => {
    const isLoading = pausingAdId === item.id;

    return (
      <AnimatedCard
        variant="elevated"
        style={styles.adCard}
        entering={FadeInDown.delay(index * 80).duration(400)}
      >
        <View style={styles.adHeader}>
          <View style={styles.adInfo}>
            <Text style={styles.adName}>{item.name}</Text>
            <View style={styles.adStatusContainer}>
              <View
                style={[
                  styles.adStatusDot,
                  {
                    backgroundColor:
                      item.status === 'active'
                        ? palette.statusSuccess
                        : palette.textTertiary,
                  },
                ]}
              />
              <Text style={styles.adStatusText}>
                {item.status === 'active' ? 'Active' : 'Paused'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.adImagePlaceholder}>
          <Ionicons name="image-outline" size={32} color={palette.textTertiary} />
          <Text style={styles.adImagePlaceholderText}>Ad Preview</Text>
        </View>

        <Text style={styles.adCopy} numberOfLines={3}>
          {item.copy}
        </Text>

        <View style={styles.adMetrics}>
          <View style={styles.adMetricItem}>
            <Text style={styles.adMetricLabel}>Daily Budget</Text>
            <Text style={styles.adMetricValue}>{formatCurrency(item.daily_budget)}</Text>
          </View>
          <View style={styles.adMetricItem}>
            <Text style={styles.adMetricLabel}>Impressions</Text>
            <Text style={styles.adMetricValue}>{formatNumber(item.impressions)}</Text>
          </View>
          <View style={styles.adMetricItem}>
            <Text style={styles.adMetricLabel}>Clicks</Text>
            <Text style={styles.adMetricValue}>{formatNumber(item.clicks)}</Text>
          </View>
        </View>

        <View style={styles.adActions}>
          <Button
            variant={item.status === 'active' ? 'outline' : 'primary'}
            onPress={() => handleToggleAdStatus(item)}
            disabled={isLoading}
            style={styles.adActionButton}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={palette.tint} />
            ) : (
              <>
                <Ionicons
                  name={item.status === 'active' ? 'pause' : 'play'}
                  size={16}
                  color={item.status === 'active' ? palette.tint : palette.textInverse}
                />
                <Text
                  style={[
                    styles.adActionButtonText,
                    item.status === 'active'
                      ? { color: palette.tint }
                      : { color: palette.textInverse },
                  ]}
                >
                  {item.status === 'active' ? 'Pause Ad' : 'Resume Ad'}
                </Text>
              </>
            )}
          </Button>
        </View>
      </AnimatedCard>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ScreenHeader title={pageName} />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[palette.tint]}
            tintColor={palette.tint}
          />
        }
      >
        <View style={styles.content}>
          {/* Time Range Selector */}
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.timeRangeContainer}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {timeRangeOptions.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={selectedTimeRange === option.value}
                  onPress={() => handleTimeRangeChange(option.value)}
                  style={styles.timeRangeChip}
                />
              ))}
            </ScrollView>
          </Animated.View>

          {/* Chart */}
          {renderChart()}

          {/* Running Ads Section */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(400)}
            style={styles.runningAdsSection}
          >
            <View style={styles.runningAdsHeader}>
              <Text style={styles.runningAdsTitle}>Currently Running Ads</Text>
              <View style={styles.adCountBadge}>
                <Text style={styles.adCountText}>{runningAds.length}</Text>
              </View>
            </View>

            <FlatList
              data={runningAds}
              renderItem={renderAdCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.adsList}
            />
          </Animated.View>
        </View>
      </ScrollView>
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
    scrollView: {
      flex: 1,
    },
    content: {
      padding: Theme.spacing.lg,
    },
    timeRangeContainer: {
      marginBottom: Theme.spacing.lg,
    },
    timeRangeChip: {
      marginRight: Theme.spacing.sm,
    },
    chartCard: {
      padding: 0,
      marginBottom: Theme.spacing.xl,
      overflow: 'hidden',
    },
    pagerView: {
      height: 380,
    },
    chartPage: {
      padding: Theme.spacing.xl,
      paddingBottom: Theme.spacing.lg,
    },
    metricHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Theme.spacing.md,
    },
    metricTitle: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    trendContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.xs,
    },
    trendText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.bold,
    },
    currentValue: {
      fontSize: 48,
      fontFamily: Theme.typography.fonts.bold,
      marginBottom: Theme.spacing.xs,
      letterSpacing: -1,
    },
    valueSubtitle: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textTertiary,
      marginBottom: Theme.spacing.lg,
    },
    chartWrapper: {
      height: 140,
      marginBottom: Theme.spacing.sm,
      position: 'relative',
    },
    graph: {
      flex: 1,
    },
    selectedPointIndicator: {
      position: 'absolute',
      width: 14,
      height: 14,
      borderRadius: 7,
      marginLeft: -7,
      marginBottom: -7,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    selectedPointInner: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    chartHint: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textTertiary,
      textAlign: 'center',
      marginBottom: Theme.spacing.xs,
      fontStyle: 'italic',
    },
    dateRangeLabel: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textSecondary,
      textAlign: 'center',
      paddingBottom: Theme.spacing.sm,
    },
    paginationDots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: Theme.spacing.xs,
      paddingVertical: Theme.spacing.md,
    },
    paginationDot: {
      height: 8,
      borderRadius: Theme.borderRadius.full,
      transition: 'all 0.3s ease',
    },
    chartLoadingContainer: {
      height: 380,
      justifyContent: 'center',
      alignItems: 'center',
    },
    chartLoadingText: {
      marginTop: Theme.spacing.md,
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textSecondary,
    },
    chartErrorContainer: {
      height: 380,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Theme.spacing.xl,
    },
    chartErrorText: {
      marginTop: Theme.spacing.md,
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textSecondary,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: Theme.spacing.lg,
      paddingHorizontal: Theme.spacing.xl,
      paddingVertical: Theme.spacing.md,
      backgroundColor: palette.tint,
      borderRadius: Theme.borderRadius.full,
    },
    retryButtonText: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textInverse,
    },
    noChartData: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    noChartDataText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textTertiary,
    },
    runningAdsSection: {
      marginTop: Theme.spacing.lg,
    },
    runningAdsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Theme.spacing.lg,
    },
    runningAdsTitle: {
      fontSize: Theme.typography.sizes.xl,
      fontFamily: Theme.typography.fonts.bold,
      color: palette.textPrimary,
    },
    adCountBadge: {
      backgroundColor: palette.tint,
      paddingHorizontal: Theme.spacing.md,
      paddingVertical: Theme.spacing.xs,
      borderRadius: Theme.borderRadius.full,
      minWidth: 32,
      alignItems: 'center',
    },
    adCountText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.bold,
      color: palette.textInverse,
    },
    adsList: {
      gap: Theme.spacing.md,
    },
    adCard: {
      padding: Theme.spacing.xl,
    },
    adHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: Theme.spacing.md,
    },
    adInfo: {
      flex: 1,
    },
    adName: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
      marginBottom: Theme.spacing.xs,
    },
    adStatusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Theme.spacing.xs,
    },
    adStatusDot: {
      width: 8,
      height: 8,
      borderRadius: Theme.borderRadius.full,
    },
    adStatusText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textSecondary,
    },
    adImagePlaceholder: {
      height: 140,
      backgroundColor: palette.backgroundSecondary,
      borderRadius: Theme.borderRadius.xl,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Theme.spacing.lg,
      borderWidth: 2,
      borderColor: palette.borderLight,
      borderStyle: 'dashed',
    },
    adImagePlaceholderText: {
      marginTop: Theme.spacing.sm,
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textTertiary,
    },
    adCopy: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
      lineHeight: 20,
      marginBottom: Theme.spacing.lg,
    },
    adMetrics: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: Theme.spacing.xl,
      paddingVertical: Theme.spacing.lg,
      paddingHorizontal: Theme.spacing.md,
      backgroundColor: palette.backgroundSecondary,
      borderRadius: Theme.borderRadius.lg,
    },
    adMetricItem: {
      flex: 1,
      alignItems: 'center',
    },
    adMetricLabel: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textTertiary,
      marginBottom: Theme.spacing.xs,
    },
    adMetricValue: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.bold,
      color: palette.textPrimary,
    },
    adActions: {
      flexDirection: 'row',
      gap: Theme.spacing.sm,
    },
    adActionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Theme.spacing.xs,
    },
    adActionButtonText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.semibold,
    },
  });
