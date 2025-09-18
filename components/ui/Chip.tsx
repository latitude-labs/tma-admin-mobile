import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/Theme';

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
  return (
    <TouchableOpacity
      style={[styles.base, selected && styles.selected, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>
        {label}
      </Text>
      {onClose && (
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons
            name="close-circle"
            size={16}
            color={selected ? Theme.colors.text.inverse : Theme.colors.text.secondary}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.border.default,
    backgroundColor: Theme.colors.background.primary,
    marginRight: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  selected: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  label: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.primary,
  },
  selectedLabel: {
    color: Theme.colors.text.inverse,
  },
  closeButton: {
    marginLeft: Theme.spacing.xs,
  },
});