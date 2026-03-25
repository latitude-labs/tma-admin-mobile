import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { Theme } from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';

export interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  value,
  options,
  onValueChange,
  placeholder = 'Select...',
  disabled = false,
  error,
  label,
}) => {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [showModal, setShowModal] = useState(false);

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    setShowModal(false);
  };

  const selectedOption = options.find(opt => opt.value === value);

  const showPicker = () => {
    if (disabled) return;

    if (Platform.OS === 'ios') {
      const iosOptions = [...options.map(opt => opt.label), 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: iosOptions,
          cancelButtonIndex: iosOptions.length - 1,
        },
        (buttonIndex) => {
          if (buttonIndex !== iosOptions.length - 1) {
            onValueChange(options[buttonIndex].value);
          }
        }
      );
    } else {
      setShowModal(true);
    }
  };

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={styles.label}>{label}</Text>
      ) : null}

      <TouchableOpacity
        onPress={showPicker}
        style={[
          styles.button,
          error ? styles.buttonError : null,
          disabled ? styles.buttonDisabled : null,
        ]}
        disabled={disabled}
      >
        <Text
          style={[
            styles.buttonText,
            selectedOption ? null : styles.buttonTextPlaceholder,
            disabled ? styles.buttonTextDisabled : null,
          ]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={20}
          color={disabled ? palette.textTertiary : palette.textSecondary}
        />
      </TouchableOpacity>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      {Platform.OS === 'android' ? (
        <Modal
          visible={showModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          >
            <View style={styles.modalContent}>
              <ScrollView style={styles.modalScroll}>
                {options.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.option,
                      value === option.value ? styles.optionSelected : null,
                    ]}
                    onPress={() => handleSelect(option.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        value === option.value ? styles.optionTextSelected : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      ) : null}
    </View>
  );
};

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    marginBottom: Theme.spacing.md,
  },
  label: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: 'System',
    fontWeight: '500',
    color: palette.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: palette.borderLight,
    backgroundColor: palette.background,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    minHeight: 48,
  },
  buttonError: {
    borderColor: palette.statusError,
  },
  buttonDisabled: {
    backgroundColor: palette.backgroundSecondary,
    opacity: 0.6,
  },
  buttonText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: 'System',
    fontWeight: '400',
    color: palette.textPrimary,
    flex: 1,
  },
  buttonTextPlaceholder: {
    color: palette.textSecondary,
  },
  buttonTextDisabled: {
    color: palette.textTertiary,
  },
  errorText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: 'System',
    fontWeight: '400',
    color: palette.statusError,
    marginTop: Theme.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.overlay,
  },
  modalContent: {
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: palette.borderLight,
    width: '80%',
    maxHeight: '60%',
    padding: Theme.spacing.sm,
    backgroundColor: palette.background,
    ...palette.softShadow,
  },
  modalScroll: {
    maxHeight: 300,
  },
  option: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  optionSelected: {
    backgroundColor: palette.tint + '10',
  },
  optionText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: 'System',
    fontWeight: '400',
    color: palette.textPrimary,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: palette.tint,
  },
});
