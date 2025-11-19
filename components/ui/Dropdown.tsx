import React, { useState } from 'react';
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
import { useColorScheme } from '@/components/useColorScheme';
import ColorPalette from '@/constants/Colors';
import { getThemeShadows } from '@/constants/Theme';

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
  const colorScheme = useColorScheme();
  const colors = ColorPalette[colorScheme ?? 'light'];
  const shadows = getThemeShadows(colorScheme);
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
      {label && (
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {label}
        </Text>
      )}

      <TouchableOpacity
        onPress={showPicker}
        style={[
          styles.button,
          {
            backgroundColor: colors.background,
            borderColor: error ? colors.statusError : colors.borderLight,
          },
          disabled && {
            backgroundColor: colors.backgroundSecondary,
            opacity: 0.6,
          },
        ]}
        disabled={disabled}
      >
        <Text
          style={[
            styles.buttonText,
            {
              color: selectedOption
                ? colors.textPrimary
                : colors.textSecondary,
            },
            disabled && { color: colors.textTertiary },
          ]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={20}
          color={disabled ? colors.textTertiary : colors.textSecondary}
        />
      </TouchableOpacity>

      {error && (
        <Text style={[styles.errorText, { color: colors.statusError }]}>{error}</Text>
      )}

      {Platform.OS === 'android' && (
        <Modal
          visible={showModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <TouchableOpacity
            style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          >
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.background },
                shadows.lg,
              ]}
            >
              <ScrollView style={styles.modalScroll}>
                {options.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.option,
                      {
                        borderBottomColor: colors.borderLight,
                      },
                      value === option.value && {
                        backgroundColor: colors.tint + '10',
                      },
                    ]}
                    onPress={() => handleSelect(option.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: colors.textPrimary },
                        value === option.value && {
                          fontFamily: Theme.typography.fonts.semibold,
                          color: colors.tint,
                        },
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
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.spacing.md,
  },
  label: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    marginBottom: Theme.spacing.xs,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    minHeight: 48,
  },
  buttonText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    flex: 1,
  },
  errorText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    marginTop: Theme.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: Theme.borderRadius.lg,
    width: '80%',
    maxHeight: '60%',
    padding: Theme.spacing.sm,
  },
  modalScroll: {
    maxHeight: 300,
  },
  option: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
  },
});
