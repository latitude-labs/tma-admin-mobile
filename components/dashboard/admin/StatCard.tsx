import { Theme } from '@/constants/Theme';
import { ThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
      borderRadius: 20,
      marginBottom: Theme.spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      overflow: 'hidden',
    },
    statCardGradient: {
      padding: Theme.spacing.lg,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.borderLight + '40',
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
    statIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      backgroundColor: color + '20',
    },
    iconGlow: {
      position: 'absolute',
      width: 48,
      height: 48,
      borderRadius: 14,
      opacity: 0.4,
      backgroundColor: color + '30',
    },
    statCardInfo: {
      flex: 1,
    },
    statCardLabel: {
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.semibold,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    statCardDescription: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      color: colors.textTertiary,
    },
    statCardRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
    statCardValue: {
      fontSize: 32,
      fontFamily: Theme.typography.fonts.bold,
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
        <LinearGradient
          colors={[color + '12', color + '05']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCardGradient}
        >
          <View style={styles.statCardContent}>
            <View style={styles.statCardLeft}>
              <View style={styles.statIconContainer}>
                <View style={styles.iconGlow} />
                <Ionicons name={icon} size={22} color={color} />
              </View>
              <View style={styles.statCardInfo}>
                <Text style={styles.statCardLabel}>{title}</Text>
                <Text style={styles.statCardDescription}>{description}</Text>
              </View>
            </View>
            <View style={styles.statCardRight}>
              <Text style={styles.statCardValue}>
                {loading ? '—' : value}
              </Text>
              {!loading && trend && (
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
              )}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}
