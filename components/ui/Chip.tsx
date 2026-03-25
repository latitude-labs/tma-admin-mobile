import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { GlassView } from '@/components/ui/GlassView';

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

  const dynamicStyles = useMemo(() => StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingVertical: Theme.spacing.xs,
      paddingHorizontal: Theme.spacing.md,
      borderRadius: Theme.borderRadius.full,
      borderWidth: 1,
      borderColor: palette.borderDefault,
      backgroundColor: palette.background,
      marginRight: Theme.spacing.sm,
      marginBottom: Theme.spacing.sm,
    },
    label: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: 'System',
      fontWeight: '400',
      color: palette.textPrimary,
    },
    selectedLabel: {
      color: palette.textPrimary,
      fontWeight: '500',
    },
    closeButton: {
      marginLeft: Theme.spacing.xs,
    },
  }), [palette]);

  const glassStyle: ViewStyle = useMemo(() => ({
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
    marginRight: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  }), []);

  if (selected) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}
        style={style}
      >
        <GlassView
          intensity="light"
          tintColor={`${palette.primary}40`}
          style={glassStyle}
        >
          <Text style={[dynamicStyles.label, dynamicStyles.selectedLabel]}>
            {label}
          </Text>
          {onClose ? (
            <TouchableOpacity onPress={onClose} style={dynamicStyles.closeButton}>
              <Ionicons
                name="close-circle"
                size={16}
                color={palette.textSecondary}
              />
            </TouchableOpacity>
          ) : null}
        </GlassView>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[dynamicStyles.base, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Text style={dynamicStyles.label}>
        {label}
      </Text>
      {onClose ? (
        <TouchableOpacity onPress={onClose} style={dynamicStyles.closeButton}>
          <Ionicons
            name="close-circle"
            size={16}
            color={palette.textSecondary}
          />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
};
