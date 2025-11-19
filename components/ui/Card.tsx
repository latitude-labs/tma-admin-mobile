import React, { useMemo } from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { Theme, getThemeShadows } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'filled' | 'outlined';
  padding?: keyof typeof Theme.spacing;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 'lg',
  style,
  ...props
}) => {
  const palette = useThemeColors();
  const shadows = getThemeShadows(palette.isDark ? 'dark' : 'light');

  const dynamicStyles = useMemo(() => StyleSheet.create({
    base: {
      backgroundColor: palette.background,
      borderRadius: Theme.borderRadius.lg,
    },
    elevated: {
      ...shadows.md,
      backgroundColor: palette.background,
    },
    filled: {
      backgroundColor: palette.backgroundSecondary,
    },
    outlined: {
      borderWidth: 1,
      borderColor: palette.borderDefault,
      backgroundColor: palette.background,
    },
  }), [palette, shadows]);

  return (
    <View
      style={[
        dynamicStyles.base,
        dynamicStyles[variant],
        { padding: Theme.spacing[padding] },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};