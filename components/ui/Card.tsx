import React, { useMemo } from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme, getThemeShadows } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'filled' | 'outlined' | 'gradient';
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
      ...shadows.subtle,
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
    gradient: {
      borderWidth: 1,
      borderColor: palette.primary + '20',
    },
  }), [palette, shadows]);

  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={[palette.primary + '10', palette.primary + '02']} // 10% to 2% opacity
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          dynamicStyles.base,
          dynamicStyles.gradient,
          { padding: Theme.spacing[padding] },
          style,
        ]}
        {...props}
      >
        {children}
      </LinearGradient>
    );
  }

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