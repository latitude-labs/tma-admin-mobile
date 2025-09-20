import React from 'react';
import { View, StyleSheet, ViewProps, useColorScheme } from 'react-native';
import { Theme, getThemeShadows } from '@/constants/Theme';
import ColorPalette from '@/constants/Colors';

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
  const colorScheme = useColorScheme();
  const colors = ColorPalette[colorScheme ?? 'light'];
  const shadows = getThemeShadows(colorScheme);

  const dynamicStyles = StyleSheet.create({
    base: {
      backgroundColor: colors.background,
      borderRadius: Theme.borderRadius.lg,
    },
    elevated: {
      ...shadows.md,
      backgroundColor: colors.background,
    },
    filled: {
      backgroundColor: colors.backgroundSecondary,
    },
    outlined: {
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.background,
    },
  });

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