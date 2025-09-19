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
import Colors from '@/constants/Colors';

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
  const currentTheme = Colors[colorScheme ?? 'light'];
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
        <Text style={[styles.label, { color: currentTheme.text }]}>
          {label}
        </Text>
      )}

      <TouchableOpacity
        onPress={showPicker}
        style={[
          styles.button,
          error && styles.buttonError,
          disabled && styles.buttonDisabled,
          { borderColor: error ? Theme.colors.error : Theme.colors.border.light }
        ]}
        disabled={disabled}
      >
        <Text
          style={[
            styles.buttonText,
            { color: selectedOption ? currentTheme.text : Theme.colors.text.secondary },
            disabled && styles.buttonTextDisabled
          ]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={20}
          color={disabled ? Theme.colors.text.tertiary : Theme.colors.text.secondary}
        />
      </TouchableOpacity>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {Platform.OS === 'android' && (
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
            <View style={[styles.modalContent, { backgroundColor: currentTheme.background }]}>
              <ScrollView style={styles.modalScroll}>
                {options.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.option,
                      value === option.value && styles.optionSelected
                    ]}
                    onPress={() => handleSelect(option.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: currentTheme.text },
                        value === option.value && styles.optionTextSelected
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
    backgroundColor: Theme.colors.background.primary,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    minHeight: 48,
  },
  buttonError: {
    borderColor: Theme.colors.error,
  },
  buttonDisabled: {
    backgroundColor: Theme.colors.background.secondary,
    opacity: 0.6,
  },
  buttonText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    flex: 1,
  },
  buttonTextDisabled: {
    color: Theme.colors.text.tertiary,
  },
  errorText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.error,
    marginTop: Theme.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: Theme.borderRadius.lg,
    width: '80%',
    maxHeight: '60%',
    padding: Theme.spacing.sm,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalScroll: {
    maxHeight: 300,
  },
  option: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  optionSelected: {
    backgroundColor: Theme.colors.primary + '10',
  },
  optionText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
  },
  optionTextSelected: {
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.primary,
  },
});