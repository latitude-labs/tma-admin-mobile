import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';

type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  style,
}) => {
  const palette = useThemeColors();

  const variantStyles: Record<BadgeVariant, ViewStyle> = useMemo(() => ({
    default: {
      backgroundColor: palette.backgroundSecondary,
    },
    secondary: {
      backgroundColor: palette.backgroundSecondary,
    },
    success: {
      backgroundColor: palette.statusSuccess,
    },
    warning: {
      backgroundColor: palette.statusWarning,
    },
    error: {
      backgroundColor: palette.statusError,
    },
    info: {
      backgroundColor: palette.statusInfo,
    },
  }), [palette]);

  const textColor =
    variant === 'default' || variant === 'secondary'
      ? palette.textPrimary
      : palette.textInverse;

  return (
    <View style={[styles.base, variantStyles[variant], styles[size], style]}>
      <Text
        style={[styles.text, styles[`${size}Text`], { color: textColor }]}
      >
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: Theme.borderRadius.full,
    paddingHorizontal: Theme.spacing.sm,
  },
  sm: {
    paddingVertical: 2,
    paddingHorizontal: Theme.spacing.sm,
  },
  md: {
    paddingVertical: 4,
    paddingHorizontal: Theme.spacing.md,
  },
  lg: {
    paddingVertical: 6,
    paddingHorizontal: Theme.spacing.lg,
  },
  text: {
    fontFamily: Theme.typography.fonts.medium,
  },
  smText: {
    fontSize: Theme.typography.sizes.xs,
  },
  mdText: {
    fontSize: Theme.typography.sizes.sm,
  },
  lgText: {
    fontSize: Theme.typography.sizes.md,
  },
});
