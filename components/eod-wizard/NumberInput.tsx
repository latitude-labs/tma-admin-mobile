import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  min?: number;
  max?: number;
  color?: string;
  unit?: string;
  showButtons?: boolean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  label,
  min = 0,
  max = 9999,
  color = Theme.colors.primary,
  unit,
  showButtons = true,
}) => {
  const palette = useThemeColors();
  const inputRef = useRef<TextInput>(null);
  const [inputValue, setInputValue] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);

  const handleTextChange = (text: string) => {
    // Allow only numbers
    const cleanedText = text.replace(/[^0-9]/g, '');
    setInputValue(cleanedText);

    const numValue = parseInt(cleanedText, 10) || 0;
    if (numValue >= min && numValue <= max) {
      onChange(numValue);
    } else if (numValue > max) {
      onChange(max);
      setInputValue(max.toString());
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Ensure value is valid when losing focus
    const numValue = parseInt(inputValue, 10) || 0;
    if (numValue < min) {
      onChange(min);
      setInputValue(min.toString());
    } else if (numValue > max) {
      onChange(max);
      setInputValue(max.toString());
    } else {
      setInputValue(numValue.toString());
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Select all text when focusing
    inputRef.current?.setSelection(0, inputValue.length);
  };

  const incrementValue = () => {
    const newValue = Math.min(value + 1, max);
    onChange(newValue);
    setInputValue(newValue.toString());
  };

  const decrementValue = () => {
    const newValue = Math.max(value - 1, min);
    onChange(newValue);
    setInputValue(newValue.toString());
  };

  React.useEffect(() => {
    if (!isFocused) {
      setInputValue(value.toString());
    }
  }, [value, isFocused]);

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: palette.text }]}>
          {label}
        </Text>
      ) : null}

      <View style={styles.inputContainer}>
        {showButtons ? (
          <TouchableOpacity
            onPress={decrementValue}
            disabled={value <= min}
            style={[
              styles.button,
              {
                backgroundColor: value > min
                  ? palette.card
                  : palette.card + '40',
              }
            ]}
          >
            <Ionicons
              name="remove"
              size={24}
              color={value > min ? palette.text : palette.text + '60'}
            />
          </TouchableOpacity>
        ) : null}

        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                color: palette.text,
                borderColor: isFocused ? color : palette.border,
                backgroundColor: isFocused ? palette.background : palette.card,
              }
            ]}
            value={inputValue}
            onChangeText={handleTextChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            keyboardType="numeric"
            returnKeyType="done"
            selectTextOnFocus
            maxLength={4}
            textAlign="center"
          />
          {unit && !isFocused ? (
            <Text style={[styles.unit, { color: palette.text }]}>
              {unit}
            </Text>
          ) : null}
        </View>

        {showButtons ? (
          <TouchableOpacity
            onPress={incrementValue}
            disabled={value >= max}
            style={[
              styles.button,
              {
                backgroundColor: value < max
                  ? Theme.colors.primary
                  : Theme.colors.primary + '40',
              }
            ]}
          >
            <Ionicons
              name="add"
              size={24}
              color={'#FFFFFF'}
            />
          </TouchableOpacity>
        ) : null}
      </View>
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
    fontWeight: Theme.typography.fontWeights.medium,
    marginBottom: Theme.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: Theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Theme.spacing.lg,
  },
  input: {
    fontSize: Theme.typography.sizes.xxl,
    fontFamily: Theme.typography.fonts.bold,
    fontWeight: Theme.typography.fontWeights.bold,
    minWidth: 80,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderWidth: 2,
    borderRadius: Theme.borderRadius.md,
  },
  unit: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    fontWeight: Theme.typography.fontWeights.regular,
    marginLeft: Theme.spacing.xs,
  },
});
