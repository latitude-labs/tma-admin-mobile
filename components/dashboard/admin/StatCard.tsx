import { Theme } from '@/constants/Theme';
import { ThemeColors } from '@/hooks/useThemeColors';
import { GlassView } from '@/components/ui/GlassView';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { IconBox } from '@/components/ui/IconBox';

export interface StatCardProps {
  colors: ThemeColors;
  title: string;
  description: string;
  value: string | number;
  loading: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
  };
  animValues: {
    opacity: Animated.Value | Animated.AnimatedInterpolation<string | number>;
    scale: Animated.Value | Animated.AnimatedInterpolation<string | number>;
    translateY: Animated.Value | Animated.AnimatedInterpolation<string | number>;
  };
  onPressIn: () => void;
  onPressOut: () => void;
}

export function StatCard({
  colors,
  title,
  description,
  value,
  loading,
  icon,
  color,
  trend,
  animValues,
  onPressIn,
  onPressOut
}: StatCardProps) {
  const styles = StyleSheet.create({
    statCard: {
      borderRadius: Theme.borderRadius.xl,
      marginBottom: Theme.spacing.xs,
      overflow: 'hidden',
    },
    statCardGlass: {
      padding: Theme.spacing.lg,
      borderRadius: Theme.borderRadius.xl,
    },
    statCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: Theme.spacing.md,
    },
    statCardInfo: {
      flex: 1,
    },
    statCardLabel: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      fontWeight: Theme.typography.fontWeights.semibold,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    statCardDescription: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      fontWeight: Theme.typography.fontWeights.regular,
      color: colors.textTertiary,
    },
    statCardRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
    statCardValue: {
      fontSize: 32,
      fontFamily: Theme.typography.fonts.bold,
      fontWeight: Theme.typography.fontWeights.bold,
      lineHeight: 36,
      color: color,
    },
    trendContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    trendText: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.semibold,
      fontWeight: Theme.typography.fontWeights.semibold,
    },
  });

  // Helper to get trend icon and color
  const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
    if (direction === 'up') return 'trending-up';
    if (direction === 'down') return 'trending-down';
    return 'remove';
  };

  const getTrendColor = (direction: 'up' | 'down' | 'neutral') => {
    if (direction === 'up') return colors.statusSuccess;
    if (direction === 'down') return colors.statusError;
    return colors.textTertiary;
  };

  return (
    <Animated.View
      style={[
        {
          opacity: animValues.opacity,
          transform: [
            { scale: animValues.scale },
            { translateY: animValues.translateY },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.statCard}
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <GlassView
          style={styles.statCardGlass}
          intensity="regular"
          tintColor={color + '15'}
        >
          <View style={styles.statCardContent}>
            <View style={styles.statCardLeft}>
              <IconBox
                icon={icon}
                size="md"
                variant="filled"
                color={color}
              />
              <View style={styles.statCardInfo}>
                <Text style={styles.statCardLabel}>{title}</Text>
                <Text style={styles.statCardDescription}>{description}</Text>
              </View>
            </View>
            <View style={styles.statCardRight}>
              <Text style={styles.statCardValue}>
                {loading ? '—' : value}
              </Text>
              {!loading && trend ? (
                <View style={styles.trendContainer}>
                  <Ionicons
                    name={getTrendIcon(trend.direction)}
                    size={12}
                    color={getTrendColor(trend.direction)}
                  />
                  <Text style={[styles.trendText, { color: getTrendColor(trend.direction) }]}>
                    {trend.percentage}%
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </GlassView>
      </TouchableOpacity>
    </Animated.View>
  );
}
