import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { HealthStatus } from '@/types/clubHealth';
import { Ionicons } from '@expo/vector-icons';

interface HealthScoreBadgeProps {
  score: number;
  status: HealthStatus;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  animated?: boolean;
}

export const HealthScoreBadge: React.FC<HealthScoreBadgeProps> = ({
  score,
  status,
  size = 'medium',
  showLabel = true,
  animated = true,
}) => {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette, size), [palette, size]);

  const animatedScore = useSharedValue(0);
  const scale = useSharedValue(0.9);

  React.useEffect(() => {
    if (animated) {
      animatedScore.value = withTiming(score, { duration: 1000 });
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 100,
      });
    } else {
      animatedScore.value = score;
      scale.value = 1;
    }
  }, [score, animated]);

  const getStatusColor = (): string => {
    switch (status) {
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
    switch (status) {
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

  const getStatusLabel = (): string => {
    switch (status) {
      case 'critical':
        return 'Critical';
      case 'poor':
        return 'Poor';
      case 'needs_attention':
        return 'Needs Attention';
      case 'good':
        return 'Good';
      case 'excellent':
        return 'Excellent';
      default:
        return 'Unknown';
    }
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedProgressStyle = useAnimatedStyle(() => {
    const progress = animatedScore.value / 100;
    return {
      width: `${progress * 100}%`,
      backgroundColor: interpolateColor(
        animatedScore.value,
        [0, 20, 40, 60, 80, 100],
        ['#ef4444', '#a855f7', '#f59e0b', '#06b6d4', '#10b981', '#10b981']
      ),
    };
  });

  const statusColor = getStatusColor();
  const iconSize = size === 'small' ? 16 : size === 'medium' ? 20 : 24;

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      <View style={[styles.badge, { borderColor: statusColor }]}>
        <View style={styles.scoreContainer}>
          <Text style={[styles.score, { color: statusColor }]}>{Math.round(score)}</Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>

        {showLabel && (
          <View style={styles.labelContainer}>
            <Ionicons name={getStatusIcon()} size={iconSize} color={statusColor} />
            <Text style={[styles.label, { color: statusColor }]}>{getStatusLabel()}</Text>
          </View>
        )}
      </View>

      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, animatedProgressStyle]} />
      </View>
    </Animated.View>
  );
};

const createStyles = (palette: ThemeColors, size: 'small' | 'medium' | 'large') =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
    },
    badge: {
      backgroundColor: palette.background,
      borderRadius: size === 'large' ? 20 : size === 'medium' ? 16 : 12,
      paddingHorizontal: size === 'large' ? 24 : size === 'medium' ? 16 : 12,
      paddingVertical: size === 'large' ? 16 : size === 'medium' ? 12 : 8,
      borderWidth: 2,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    scoreContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    score: {
      fontSize: size === 'large' ? 36 : size === 'medium' ? 28 : 20,
      fontFamily: Theme.typography.fonts.bold,
    },
    scoreMax: {
      fontSize: size === 'large' ? 18 : size === 'medium' ? 14 : 12,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textTertiary,
      marginLeft: 2,
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: size === 'large' ? 8 : 4,
      gap: 4,
    },
    label: {
      fontSize: size === 'large' ? 16 : size === 'medium' ? 14 : 12,
      fontFamily: Theme.typography.fonts.semibold,
    },
    progressBar: {
      width: size === 'large' ? 120 : size === 'medium' ? 100 : 80,
      height: size === 'large' ? 6 : 4,
      backgroundColor: palette.borderLight,
      borderRadius: size === 'large' ? 3 : 2,
      marginTop: size === 'large' ? 12 : 8,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: size === 'large' ? 3 : 2,
    },
  });