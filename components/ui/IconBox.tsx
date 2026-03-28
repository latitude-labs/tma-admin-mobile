import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { GlassView } from '@/components/ui/GlassView';

interface IconBoxProps {
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'glow' | 'filled' | 'outline';
  style?: ViewStyle;
}

export const IconBox: React.FC<IconBoxProps> = ({
  icon,
  color,
  size = 'md',
  variant = 'glow',
  style,
}) => {
  const palette = useThemeColors();
  const iconColor = color || palette.primary;

  const dimensions = useMemo(() => {
    switch (size) {
      case 'sm': return { box: 32, icon: 16, radius: Theme.borderRadius.md };
      case 'md': return { box: 48, icon: 24, radius: Theme.borderRadius.lg };
      case 'lg': return { box: 64, icon: 32, radius: Theme.borderRadius.xl };
    }
  }, [size]);

  const containerStyle: ViewStyle = useMemo(() => ({
    width: dimensions.box,
    height: dimensions.box,
    borderRadius: dimensions.radius,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  }), [dimensions]);

  const glowStyle: ViewStyle = useMemo(() => ({
    position: 'absolute',
    width: dimensions.box,
    height: dimensions.box,
    borderRadius: dimensions.radius,
    opacity: 0.2,
    backgroundColor: iconColor,
  }), [dimensions, iconColor]);

  const outlineStyle: ViewStyle = useMemo(() => ({
    width: dimensions.box,
    height: dimensions.box,
    borderRadius: dimensions.radius,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: iconColor,
  }), [dimensions, iconColor]);

  if (variant === 'filled') {
    return (
      <GlassView
        intensity="light"
        tintColor={`${iconColor}20`}
        style={[containerStyle, style]}
      >
        <Ionicons name={icon} size={dimensions.icon} color={iconColor} />
      </GlassView>
    );
  }

  if (variant === 'outline') {
    return (
      <View style={[outlineStyle, style]}>
        <Ionicons name={icon} size={dimensions.icon} color={iconColor} />
      </View>
    );
  }

  // Default: glow variant
  return (
    <View style={[containerStyle, style]}>
      <View style={glowStyle} />
      <Ionicons name={icon} size={dimensions.icon} color={iconColor} />
    </View>
  );
};
