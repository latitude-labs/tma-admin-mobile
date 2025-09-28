import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { ClubHealthScore, IssueSeverity } from '@/types/clubHealth';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';

const { width: screenWidth } = Dimensions.get('window');

interface ClubHealthCardProps {
  clubData: ClubHealthScore;
  onPress: () => void;
  index: number;
}

export const ClubHealthCard: React.FC<ClubHealthCardProps> = ({
  clubData,
  onPress,
  index,
}) => {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  React.useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 300,
      delay: index * 50,
    });
    translateY.value = withTiming(0, {
      duration: 300,
      delay: index * 50,
    });
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, {
      damping: 20,
      stiffness: 200,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 20,
      stiffness: 200,
    });
  };

  const getStatusColor = (): string => {
    switch (clubData.health_status) {
      case 'critical':
        return '#ef4444';
      case 'poor':
        return '#a855f7';
      case 'needs_attention':
        return '#f59e0b';
      case 'good':
        return '#06b6d4';
      case 'excellent':
        return '#10b981';
      default:
        return palette.textTertiary;
    }
  };

  const getStatusIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (clubData.health_status) {
      case 'critical':
        return 'alert-circle';
      case 'poor':
        return 'warning';
      case 'needs_attention':
        return 'information-circle';
      case 'good':
        return 'checkmark-circle';
      case 'excellent':
        return 'star';
      default:
        return 'help-circle';
    }
  };

  const getMostCriticalIssue = () => {
    if (!clubData.key_issues || clubData.key_issues.length === 0) {
      return null;
    }

    // Sort by severity (critical first) and take the first one
    const sorted = [...clubData.key_issues].sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (a.severity !== 'critical' && b.severity === 'critical') return 1;
      return 0;
    });

    return sorted[0];
  };

  const statusColor = getStatusColor();
  const criticalIssue = getMostCriticalIssue();

  // Parse the date safely
  let timeAgo = 'Recently';
  try {
    const calculatedDate = new Date(clubData.calculated_at);
    if (!isNaN(calculatedDate.getTime())) {
      timeAgo = formatDistanceToNow(calculatedDate, { addSuffix: true });
    }
  } catch (error) {
    console.error('Error parsing calculated_at date:', clubData.calculated_at);
  }

  // Get metrics and ad metrics (handle both field names)
  const metrics = clubData.metrics_snapshot || clubData.metrics;
  const adMetrics = clubData.ad_metrics_snapshot || clubData.ad_metrics;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles.container, animatedStyle]}>
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.clubName}>{clubData.club_name}</Text>
              <Text style={styles.updatedText}>Updated {timeAgo}</Text>
            </View>
            <View style={styles.scoreContainer}>
              <View style={[styles.scoreBadge, { backgroundColor: statusColor + '15', borderColor: statusColor }]}>
                <Text style={[styles.scoreText, { color: statusColor }]}>
                  {Math.round(clubData.overall_score)}
                </Text>
                <Ionicons name={getStatusIcon()} size={16} color={statusColor} />
              </View>
            </View>
          </View>

          {/* Key Metrics Grid */}
          <View style={styles.metricsGrid}>
            {metrics && (
              <>
                <MetricItem
                  label="Show Rate"
                  value={`${Math.round(100 - metrics.no_show_rate)}%`}
                  icon="people"
                  color={clubData.individual_scores.show_up_rate >= 60 ? '#10b981' : '#f59e0b'}
                />
                <MetricItem
                  label="Enrollment"
                  value={`${Math.round(metrics.enrollment_rate)}%`}
                  icon="person-add"
                  color={clubData.individual_scores.enrollment_conversion >= 60 ? '#10b981' : '#f59e0b'}
                />
              </>
            )}
            {adMetrics && adMetrics.cost_per_booking !== null && (
              <MetricItem
                label="Cost/Booking"
                value={`£${adMetrics.cost_per_booking.toFixed(2)}`}
                icon="cash"
                color={clubData.individual_scores.booking_efficiency >= 60 ? '#10b981' : '#f59e0b'}
              />
            )}
          </View>

          {/* Critical Issue */}
          {criticalIssue && (
            <View style={[
              styles.issueContainer,
              {
                backgroundColor: criticalIssue.severity === 'critical'
                  ? '#ef444415'
                  : '#f59e0b15',
                borderColor: criticalIssue.severity === 'critical'
                  ? '#ef4444'
                  : '#f59e0b',
              }
            ]}>
              <Ionicons
                name={criticalIssue.severity === 'critical' ? 'alert-circle' : 'warning'}
                size={16}
                color={criticalIssue.severity === 'critical' ? '#ef4444' : '#f59e0b'}
              />
              <Text style={[
                styles.issueText,
                { color: criticalIssue.severity === 'critical' ? '#ef4444' : '#f59e0b' }
              ]} numberOfLines={2}>
                {criticalIssue.message}
              </Text>
            </View>
          )}

          {/* AI Summary Preview */}
          {clubData.ai_summary && (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText} numberOfLines={2}>
                {clubData.ai_summary.split('•')[1]?.trim() || clubData.ai_summary}
              </Text>
            </View>
          )}

          {/* View Details */}
          <View style={styles.footer}>
            <Text style={[styles.viewDetails, { color: Theme.colors.primary }]}>
              View Details
            </Text>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.primary} />
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const MetricItem: React.FC<{
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}> = ({ label, value, icon, color }) => {
  const palette = useThemeColors();
  const styles = useMemo(() => createMetricStyles(palette), [palette]);

  return (
    <View style={styles.metricItem}>
      <View style={[styles.metricIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
};

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: palette.background,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    statusIndicator: {
      height: 4,
      width: '100%',
    },
    content: {
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    headerLeft: {
      flex: 1,
    },
    clubName: {
      fontSize: Theme.typography.sizes.lg,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
      marginBottom: 4,
    },
    updatedText: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textTertiary,
    },
    scoreContainer: {
      alignItems: 'center',
    },
    scoreBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      gap: 4,
    },
    scoreText: {
      fontSize: Theme.typography.sizes.lg,
      fontFamily: Theme.typography.fonts.bold,
    },
    metricsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: palette.borderLight,
    },
    issueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 12,
      gap: 8,
    },
    issueText: {
      flex: 1,
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
    },
    summaryContainer: {
      marginBottom: 12,
    },
    summaryText: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
      lineHeight: 20,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
    },
    viewDetails: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.semibold,
    },
  });

const createMetricStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    metricItem: {
      alignItems: 'center',
      flex: 1,
    },
    metricIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    metricValue: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: palette.textPrimary,
    },
    metricLabel: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textTertiary,
      marginTop: 2,
    },
  });