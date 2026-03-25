import React, { useMemo } from 'react';
import { StyleSheet, ViewProps } from 'react-native';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { GlassView } from '@/components/ui/GlassView';

type CardVariant = 'elevated' | 'filled' | 'gradient';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: CardVariant;
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

  const baseStyle = useMemo(() => ({
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing[padding],
  }), [padding]);

  if (variant === 'gradient') {
    return (
      <GlassView
        intensity="regular"
        tintColor={palette.primary + '1A'}
        style={[baseStyle, style] as any}
        {...(props as any)}
      >
        {children}
      </GlassView>
    );
  }

  if (variant === 'filled') {
    return (
      <GlassView
        intensity="prominent"
        style={[baseStyle, style] as any}
        {...(props as any)}
      >
        {children}
      </GlassView>
    );
  }

  // elevated (default)
  return (
    <GlassView
      intensity="regular"
      style={[baseStyle, style] as any}
      {...(props as any)}
    >
      {children}
    </GlassView>
  );
};
