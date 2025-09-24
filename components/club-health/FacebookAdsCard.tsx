import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { FacebookAdsMetrics } from '@/types/clubHealth';
import { TrendIndicator } from './TrendIndicator';
import { Ionicons } from '@expo/vector-icons';

interface FacebookAdsCardProps {
  metrics: FacebookAdsMetrics;
}

export const FacebookAdsCard: React.FC<FacebookAdsCardProps> = ({ metrics }) => {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString('en-GB');
  };

  const getROASColor = (roas?: number) => {
    if (!roas) return palette.textSecondary;
    if (roas >= 3) return Theme.colors.status.success;
    if (roas >= 1.5) return Theme.colors.status.warning;
    return Theme.colors.status.error;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="logo-facebook" size={20} color="#1877F2" />
          <Text style={styles.title}>Facebook Ads Performance</Text>
        </View>
      </View>

      <View style={styles.primaryMetrics}>
        <View style={styles.primaryMetricItem}>
          <Text style={styles.metricLabel}>Spend</Text>
          <Text style={styles.primaryValue}>£{metrics.total_spend.toFixed(0)}</Text>
        </View>

        <View style={styles.primaryMetricItem}>
          <Text style={styles.metricLabel}>Cost per Booking</Text>
          <Text style={[
            styles.primaryValue,
            metrics.cost_per_booking > 50 && { color: Theme.colors.status.warning }
          ]}>
            {metrics.cost_per_booking > 0 ? `£${metrics.cost_per_booking.toFixed(2)}` : '—'}
          </Text>
        </View>

        <View style={styles.primaryMetricItem}>
          <Text style={styles.metricLabel}>Bookings</Text>
          <Text style={styles.primaryValue}>{metrics.bookings_from_ads}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.secondaryMetrics}>
        <View style={styles.metricRow}>
          <View style={styles.metricItem}>
            <View style={styles.metricWithIcon}>
              <Ionicons name="eye-outline" size={14} color={palette.textSecondary} />
              <Text style={styles.secondaryLabel}>Impressions</Text>
            </View>
            <Text style={styles.secondaryValue}>{formatNumber(metrics.impressions)}</Text>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricWithIcon}>
              <Ionicons name="hand-left-outline" size={14} color={palette.textSecondary} />
              <Text style={styles.secondaryLabel}>Clicks</Text>
            </View>
            <Text style={styles.secondaryValue}>{formatNumber(metrics.clicks)}</Text>
          </View>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricItem}>
            <View style={styles.metricWithIcon}>
              <Ionicons name="analytics-outline" size={14} color={palette.textSecondary} />
              <Text style={styles.secondaryLabel}>CTR</Text>
            </View>
            <Text style={styles.secondaryValue}>{metrics.ctr}%</Text>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricWithIcon}>
              <Ionicons name="swap-horizontal-outline" size={14} color={palette.textSecondary} />
              <Text style={styles.secondaryLabel}>Conversion</Text>
            </View>
            <Text style={styles.secondaryValue}>{metrics.conversion_rate}%</Text>
          </View>
        </View>

        {metrics.roas && (
          <View style={styles.roasContainer}>
            <Text style={styles.roasLabel}>ROAS</Text>
            <Text style={[styles.roasValue, { color: getROASColor(metrics.roas) }]}>
              {metrics.roas.toFixed(2)}x
            </Text>
          </View>
        )}
      </View>

      {metrics.campaigns && metrics.campaigns.length > 0 && (
        <>
          <View style={styles.divider} />
          <View style={styles.campaignsSection}>
            <Text style={styles.campaignsTitle}>Active Campaigns</Text>
            {metrics.campaigns.slice(0, 3).map((campaign) => (
              <View key={campaign.id} style={styles.campaignItem}>
                <View style={styles.campaignInfo}>
                  <Text style={styles.campaignName} numberOfLines={1}>
                    {campaign.name}
                  </Text>
                  <View style={[
                    styles.campaignStatus,
                    { backgroundColor: campaign.status === 'active'
                      ? `${Theme.colors.status.success}15`
                      : `${palette.textTertiary}15`
                    }
                  ]}>
                    <Text style={[
                      styles.campaignStatusText,
                      { color: campaign.status === 'active'
                        ? Theme.colors.status.success
                        : palette.textTertiary
                      }
                    ]}>
                      {campaign.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.campaignMetrics}>
                  <Text style={styles.campaignMetric}>
                    £{campaign.spend.toFixed(0)} • {campaign.conversions} bookings
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
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
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  primaryMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  primaryMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    marginBottom: 4,
  },
  primaryValue: {
    fontSize: 20,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: palette.borderLight,
    marginVertical: 16,
  },
  secondaryMetrics: {
    gap: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
  },
  metricWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  secondaryLabel: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
  },
  secondaryValue: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textPrimary,
  },
  roasContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.borderLight,
  },
  roasLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
  },
  roasValue: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
  },
  campaignsSection: {
    gap: 12,
  },
  campaignsTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  campaignItem: {
    gap: 4,
  },
  campaignInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  campaignName: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textPrimary,
    flex: 1,
  },
  campaignStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  campaignStatusText: {
    fontSize: 10,
    fontFamily: Theme.typography.fonts.medium,
    textTransform: 'uppercase',
  },
  campaignMetrics: {
    flexDirection: 'row',
  },
  campaignMetric: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
  },
});