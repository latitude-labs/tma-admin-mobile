import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '@/constants/Theme';

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
  return (
    <View style={[styles.base, styles[variant], styles[size], style]}>
      <Text style={[styles.text, styles[`${size}Text`]]}>
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
  default: {
    backgroundColor: Theme.colors.secondary.light,
  },
  secondary: {
    backgroundColor: Theme.colors.secondary.light,
  },
  success: {
    backgroundColor: Theme.colors.status.success,
  },
  warning: {
    backgroundColor: Theme.colors.status.warning,
  },
  error: {
    backgroundColor: Theme.colors.status.error,
  },
  info: {
    backgroundColor: Theme.colors.status.info,
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
    color: Theme.colors.text.inverse,
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