import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import { Theme } from '@/constants/Theme';

export function FacebookCardSkeleton() {
  return (
    <Card variant="elevated" style={styles.card}>
      {/* Page Header Skeleton */}
      <View style={styles.pageHeader}>
        <Skeleton width={40} height={40} borderRadius={Theme.borderRadius.md} />
        <View style={styles.pageInfo}>
          <Skeleton width={150} height={20} />
          <View style={{ marginTop: 8 }}>
            <Skeleton width={80} height={14} />
          </View>
        </View>
      </View>

      {/* Metrics Skeleton */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricRow}>
          <Skeleton width={18} height={18} borderRadius={2} />
          <Skeleton width={80} height={16} style={{ marginLeft: Theme.spacing.sm }} />
          <View style={{ flex: 1 }} />
          <Skeleton width={60} height={16} />
        </View>

        <View style={styles.metricRow}>
          <Skeleton width={18} height={18} borderRadius={2} />
          <Skeleton width={80} height={16} style={{ marginLeft: Theme.spacing.sm }} />
          <View style={{ flex: 1 }} />
          <Skeleton width={40} height={16} />
        </View>

        <View style={styles.metricRow}>
          <Skeleton width={18} height={18} borderRadius={2} />
          <Skeleton width={100} height={16} style={{ marginLeft: Theme.spacing.sm }} />
          <View style={{ flex: 1 }} />
          <Skeleton width={70} height={16} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Theme.spacing.lg,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  pageInfo: {
    flex: 1,
    marginLeft: Theme.spacing.md,
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
  },
});