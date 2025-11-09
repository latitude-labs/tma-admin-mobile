import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const palette = useThemeColors();

  const dynamicStyles = useMemo(() => StyleSheet.create({
    label: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textPrimary,
      marginBottom: Theme.spacing.xs,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: palette.borderDefault,
      borderRadius: Theme.borderRadius.md,
      backgroundColor: palette.background,
      paddingHorizontal: Theme.spacing.md,
      minHeight: 48,
    },
    focused: {
      borderColor: palette.primary,
    },
    error: {
      borderColor: palette.statusError,
    },
    input: {
      flex: 1,
      fontSize: Theme.typography.sizes.md,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textPrimary,
      paddingVertical: Theme.spacing.sm,
    },
    errorText: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.statusError,
      marginTop: Theme.spacing.xs,
    },
    helperText: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textSecondary,
      marginTop: Theme.spacing.xs,
    },
  }), [palette]);

  return (
    <View style={styles.container}>
      {label && <Text style={dynamicStyles.label}>{label}</Text>}
      <View
        style={[
          dynamicStyles.inputContainer,
          focused && dynamicStyles.focused,
          error && dynamicStyles.error,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={palette.textSecondary}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          style={[dynamicStyles.input, style]}
          placeholderTextColor={palette.textTertiary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color={palette.textSecondary}
              style={styles.rightIcon}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={dynamicStyles.errorText}>{error}</Text>}
      {helperText && !error && (
        <Text style={dynamicStyles.helperText}>{helperText}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.spacing.md,
  },
  leftIcon: {
    marginRight: Theme.spacing.sm,
  },
  rightIcon: {
    marginLeft: Theme.spacing.sm,
  },
});