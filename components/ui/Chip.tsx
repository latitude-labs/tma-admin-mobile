import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
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
    selected: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    label: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textPrimary,
    },
    selectedLabel: {
      color: palette.textInverse,
    },
    closeButton: {
      marginLeft: Theme.spacing.xs,
    },
  }), [palette]);

  return (
    <TouchableOpacity
      style={[dynamicStyles.base, selected && dynamicStyles.selected, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Text style={[dynamicStyles.label, selected && dynamicStyles.selectedLabel]}>
        {label}
      </Text>
      {onClose && (
        <TouchableOpacity onPress={onClose} style={dynamicStyles.closeButton}>
          <Ionicons
            name="close-circle"
            size={16}
            color={selected ? palette.textInverse : palette.textSecondary}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};