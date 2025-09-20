import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/Theme';
import ColorPalette from '@/constants/Colors';

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
  const colorScheme = useColorScheme();
  const colors = ColorPalette[colorScheme ?? 'light'];

  const dynamicStyles = StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingVertical: Theme.spacing.xs,
      paddingHorizontal: Theme.spacing.md,
      borderRadius: Theme.borderRadius.full,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.background,
      marginRight: Theme.spacing.sm,
      marginBottom: Theme.spacing.sm,
    },
    selected: {
      backgroundColor: colors.tint,
      borderColor: colors.tint,
    },
    label: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.regular,
      color: colors.textPrimary,
    },
    selectedLabel: {
      color: colors.textInverse,
    },
    closeButton: {
      marginLeft: Theme.spacing.xs,
    },
  });

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
            color={selected ? colors.textInverse : colors.textSecondary}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};