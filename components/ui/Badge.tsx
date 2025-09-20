import React from 'react';
import { View, Text, StyleSheet, ViewStyle, useColorScheme } from 'react-native';
import { Theme } from '@/constants/Theme';
import ColorPalette from '@/constants/Colors';

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
  const colorScheme = useColorScheme();
  const colors = ColorPalette[colorScheme ?? 'light'];

  const variantStyles: Record<BadgeVariant, ViewStyle> = {
    default: {
      backgroundColor: colors.backgroundSecondary,
    },
    secondary: {
      backgroundColor: colors.backgroundSecondary,
    },
    success: {
      backgroundColor: colors.statusSuccess,
    },
    warning: {
      backgroundColor: colors.statusWarning,
    },
    error: {
      backgroundColor: colors.statusError,
    },
    info: {
      backgroundColor: colors.statusInfo,
    },
  };

  const textColor =
    variant === 'default' || variant === 'secondary'
      ? colors.textPrimary
      : colors.textInverse;

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
