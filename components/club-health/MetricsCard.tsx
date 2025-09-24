import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { ClubMetrics } from '@/types/clubHealth';
import { TrendIndicator } from './TrendIndicator';
import { Ionicons } from '@expo/vector-icons';

interface MetricsCardProps {
  metrics: ClubMetrics;
}

interface MetricItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  previousValue?: number;
  format?: 'percentage' | 'number' | 'currency';
  inverse?: boolean;
  color?: string;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({ metrics }) => {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const MetricItem: React.FC<MetricItemProps> = ({
    icon,
    label,
    value,
    previousValue,
    format = 'number',
    inverse = false,
    color,
  }) => (
    <View style={styles.metricItem}>
      <View style={styles.metricHeader}>
        <View style={styles.metricLabelContainer}>
          <Ionicons
            name={icon}
            size={16}
            color={color || palette.textSecondary}
          />
          <Text style={styles.metricLabel}>{label}</Text>
        </View>
      </View>
      <TrendIndicator
        value={value ?? 0}
        previousValue={previousValue}
        format={format}
        size="medium"
        inverse={inverse}
      />
    </View>
  );

  const getComparisonValue = (current: number, change?: number) => {
    if (!change) return undefined;
    return current / (1 + change / 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Key Metrics</Text>
        <View style={styles.periodBadge}>
          <Text style={styles.periodText}>
            {metrics.bookings_count || 0} total bookings
          </Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.primaryMetric}>
          <MetricItem
            icon="trending-up-outline"
            label="Enrollment Rate"
            value={metrics.enrollment_rate ?? 0}
            previousValue={getComparisonValue(
              metrics.enrollment_rate ?? 0,
              metrics.enrollment_change
            )}
            format="percentage"
            color={Theme.colors.status.success}
          />
        </View>

        <View style={styles.primaryMetric}>
          <MetricItem
            icon="people-outline"
            label="Attendance Rate"
            value={metrics.attendance_rate ?? 0}
            previousValue={getComparisonValue(
              metrics.attendance_rate ?? 0,
              metrics.attendance_change
            )}
            format="percentage"
            color={Theme.colors.status.info}
          />
        </View>

        <View style={styles.secondaryMetricsRow}>
          <View style={styles.secondaryMetric}>
            <MetricItem
              icon="close-circle-outline"
              label="No-Show Rate"
              value={metrics.no_show_rate ?? 0}
              previousValue={getComparisonValue(
                metrics.no_show_rate ?? 0,
                metrics.no_show_change
              )}
              format="percentage"
              inverse={true}
              color={Theme.colors.status.warning}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.secondaryMetric}>
            <MetricItem
              icon="person-add-outline"
              label="New Students"
              value={metrics.new_students ?? 0}
              format="number"
            />
          </View>
        </View>

        {metrics.total_revenue && (
          <View style={styles.revenueSection}>
            <View style={styles.dividerHorizontal} />
            <MetricItem
              icon="cash-outline"
              label="Total Revenue"
              value={metrics.total_revenue}
              format="currency"
              color={Theme.colors.primary}
            />
          </View>
        )}

        {metrics.average_class_size && (
          <View style={styles.additionalMetric}>
            <Text style={styles.additionalLabel}>Avg. Class Size</Text>
            <Text style={styles.additionalValue}>
              {metrics.average_class_size || 0} students
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: palette.background,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: palette.borderLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  periodBadge: {
    backgroundColor: palette.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  periodText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
  },
  metricsGrid: {
    gap: 20,
  },
  primaryMetric: {
    paddingVertical: 8,
  },
  secondaryMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryMetric: {
    flex: 1,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: palette.borderLight,
    marginHorizontal: 16,
  },
  dividerHorizontal: {
    height: 1,
    backgroundColor: palette.borderLight,
    marginVertical: 16,
  },
  metricItem: {
    gap: 8,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
  },
  revenueSection: {
    marginTop: 8,
  },
  additionalMetric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.borderLight,
  },
  additionalLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
  },
  additionalValue: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textPrimary,
  },
});