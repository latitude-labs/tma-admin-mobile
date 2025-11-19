import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';

interface TrendIndicatorProps {
  value: number;
  previousValue?: number;
  format?: 'percentage' | 'number' | 'currency';
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  inverse?: boolean; // For metrics where lower is better (e.g., no-show rate)
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  value,
  previousValue,
  format = 'number',
  size = 'medium',
  showIcon = true,
  inverse = false,
}) => {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const formatValue = (val: number) => {
    const safeVal = val ?? 0;
    switch (format) {
      case 'percentage':
        return `${safeVal.toFixed(1)}%`;
      case 'currency':
        return `£${safeVal.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      case 'number':
      default:
        return safeVal.toLocaleString('en-GB');
    }
  };

  const getTrend = () => {
    if (previousValue === undefined || previousValue === value) {
      return { type: 'stable', change: 0 };
    }

    const change = ((value - previousValue) / previousValue) * 100;
    const type = change > 0 ? 'up' : 'down';

    return { type, change };
  };

  const trend = getTrend();
  const isPositive = inverse ? trend.type === 'down' : trend.type === 'up';
  const isNegative = inverse ? trend.type === 'up' : trend.type === 'down';

  const sizeStyles = {
    small: {
      valueSize: Theme.typography.sizes.md,
      changeSize: Theme.typography.sizes.xs,
      iconSize: 12,
    },
    medium: {
      valueSize: Theme.typography.sizes.xl,
      changeSize: Theme.typography.sizes.sm,
      iconSize: 14,
    },
    large: {
      valueSize: 28,
      changeSize: Theme.typography.sizes.md,
      iconSize: 16,
    },
  }[size];

  return (
    <View style={styles.container}>
      <Text style={[
        styles.value,
        { fontSize: sizeStyles.valueSize }
      ]}>
        {formatValue(value)}
      </Text>

      {previousValue !== undefined && trend.change !== 0 && (
        <View style={styles.trendContainer}>
          {showIcon && (
            <Ionicons
              name={trend.type === 'up' ? 'arrow-up' : 'arrow-down'}
              size={sizeStyles.iconSize}
              color={
                isPositive
                  ? Theme.colors.status.success
                  : isNegative
                  ? Theme.colors.status.error
                  : palette.textTertiary
              }
            />
          )}
          <Text
            style={[
              styles.change,
              {
                fontSize: sizeStyles.changeSize,
                color: isPositive
                  ? Theme.colors.status.success
                  : isNegative
                  ? Theme.colors.status.error
                  : palette.textTertiary,
              },
            ]}
          >
            {Math.abs(trend.change).toFixed(1)}%
          </Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  value: {
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  change: {
    fontFamily: Theme.typography.fonts.medium,
  },
});