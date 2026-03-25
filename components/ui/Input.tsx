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

  const translucentBg = palette.isDark
    ? 'rgba(30, 28, 26, 0.9)'
    : 'rgba(255, 255, 255, 0.9)';

  const focusGlowStyle = focused ? {
    shadowColor: Theme.colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  } : {};

  const dynamicStyles = useMemo(() => StyleSheet.create({
    label: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: 'System',
      fontWeight: '500',
      color: palette.textPrimary,
      marginBottom: Theme.spacing.xs,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: palette.borderDefault,
      borderRadius: Theme.borderRadius.md,
      backgroundColor: translucentBg,
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
      fontFamily: 'System',
      fontWeight: '400',
      color: palette.textPrimary,
      paddingVertical: Theme.spacing.sm,
    },
    errorText: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: 'System',
      fontWeight: '400',
      color: palette.statusError,
      marginTop: Theme.spacing.xs,
    },
    helperText: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: 'System',
      fontWeight: '400',
      color: palette.textSecondary,
      marginTop: Theme.spacing.xs,
    },
  }), [palette, translucentBg]);

  return (
    <View style={styles.container}>
      {label ? <Text style={dynamicStyles.label}>{label}</Text> : null}
      <View style={focusGlowStyle}>
        <View
          style={[
            dynamicStyles.inputContainer,
            focused ? dynamicStyles.focused : null,
            error ? dynamicStyles.error : null,
          ]}
        >
          {leftIcon ? (
            <Ionicons
              name={leftIcon}
              size={20}
              color={palette.textSecondary}
              style={styles.leftIcon}
            />
          ) : null}
          <TextInput
            style={[dynamicStyles.input, style]}
            placeholderTextColor={palette.textTertiary}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            {...props}
          />
          {rightIcon ? (
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
          ) : null}
        </View>
      </View>
      {error ? <Text style={dynamicStyles.errorText}>{error}</Text> : null}
      {helperText && !error ? (
        <Text style={dynamicStyles.helperText}>{helperText}</Text>
      ) : null}
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