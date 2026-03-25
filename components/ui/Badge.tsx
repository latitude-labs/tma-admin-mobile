import React, { useMemo } from 'react';
import { Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { GlassView } from '@/components/ui/GlassView';

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

  const badgeColor = useMemo((): string => {
    switch (variant) {
      case 'success':
        return palette.statusSuccess;
      case 'warning':
        return palette.statusWarning;
      case 'error':
        return palette.statusError;
      case 'info':
        return palette.statusInfo;
      case 'default':
      case 'secondary':
      default:
        return palette.textSecondary;
    }
  }, [variant, palette]);

  const textColor =
    variant === 'default' || variant === 'secondary'
      ? palette.textPrimary
      : palette.textInverse;

  const sizeStyle: ViewStyle = useMemo(() => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 2, paddingHorizontal: Theme.spacing.sm };
      case 'lg':
        return { paddingVertical: 6, paddingHorizontal: Theme.spacing.lg };
      case 'md':
      default:
        return { paddingVertical: 4, paddingHorizontal: Theme.spacing.md };
    }
  }, [size]);

  const textSizeStyle: TextStyle = useMemo(() => {
    switch (size) {
      case 'sm':
        return { fontSize: Theme.typography.sizes.xs };
      case 'lg':
        return { fontSize: Theme.typography.sizes.md };
      case 'md':
      default:
        return { fontSize: Theme.typography.sizes.sm };
    }
  }, [size]);

  return (
    <GlassView
      intensity="light"
      tintColor={`${badgeColor}30`}
      style={[styles.base, sizeStyle, style]}
    >
      <Text style={[styles.text, textSizeStyle, { color: textColor }]}>
        {children}
      </Text>
    </GlassView>
  );
};

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: Theme.borderRadius.full,
  },
  text: {
    fontFamily: 'System',
    fontWeight: '500',
  },
});
