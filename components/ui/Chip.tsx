import React, { useMemo, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onClose?: () => void;
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  onClose,
  style,
}) => {
  const palette = useThemeColors();

  // Animated interpolation values for smooth selection transition
  const selectedProgress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    selectedProgress.value = withTiming(selected ? 1 : 0, { duration: 200 });
  }, [selected, selectedProgress]);

  const tintColor = palette.primary;

  const animatedContainerStyle = useAnimatedStyle(() => {
    const p = selectedProgress.value;
    // Interpolate between unselected and selected colors
    // unselected: transparent bg, borderDefault border
    // selected: primary tint bg with glass feel
    const bgOpacity = p * 0.25; // 0 → 0.25 of primary color
    const borderOpacity = 0.3 + p * 0.4; // increases toward primary

    return {
      backgroundColor: `rgba(${hexToRgb(tintColor)}, ${bgOpacity})`,
      borderColor: `rgba(${hexToRgb(tintColor)}, ${borderOpacity})`,
    };
  });

  const animatedLabelStyle = useAnimatedStyle(() => {
    const p = selectedProgress.value;
    // text weight shift is handled via JS side; color can softly shift
    return {
      opacity: 0.75 + p * 0.25,
    };
  });

  const dynamicStyles = useMemo(() => StyleSheet.create({
    base: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      alignSelf: 'flex-start' as const,
      paddingVertical: Theme.spacing.xs,
      paddingHorizontal: Theme.spacing.md,
      borderRadius: Theme.borderRadius.full,
      borderWidth: 1,
      marginRight: Theme.spacing.sm,
      marginBottom: Theme.spacing.sm,
    },
    label: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: 'System',
      color: palette.textPrimary,
    },
    labelSelected: {
      fontWeight: '600' as const,
    },
    labelUnselected: {
      fontWeight: '400' as const,
    },
    closeButton: {
      marginLeft: Theme.spacing.xs,
    },
  }), [palette]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      style={style}
    >
      <Animated.View style={[dynamicStyles.base, animatedContainerStyle]}>
        <Animated.Text
          style={[
            dynamicStyles.label,
            selected ? dynamicStyles.labelSelected : dynamicStyles.labelUnselected,
            animatedLabelStyle,
          ]}
        >
          {label}
        </Animated.Text>
        {onClose ? (
          <TouchableOpacity onPress={onClose} style={dynamicStyles.closeButton}>
            <Ionicons
              name="close-circle"
              size={16}
              color={palette.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Helper: convert hex color to "r, g, b" string for rgba()
function hexToRgb(hex: string): string {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
