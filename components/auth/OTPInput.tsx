import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Keyboard,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  error,
  disabled = false,
  autoFocus = true,
}) => {
  const colors = useThemeColors();
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Create animated values once and store in refs
  // We need to create them outside of any hooks
  const scaleValue1 = useSharedValue(1);
  const scaleValue2 = useSharedValue(1);
  const scaleValue3 = useSharedValue(1);
  const scaleValue4 = useSharedValue(1);
  const scaleValue5 = useSharedValue(1);
  const scaleValue6 = useSharedValue(1);

  const borderValue1 = useSharedValue(0);
  const borderValue2 = useSharedValue(0);
  const borderValue3 = useSharedValue(0);
  const borderValue4 = useSharedValue(0);
  const borderValue5 = useSharedValue(0);
  const borderValue6 = useSharedValue(0);

  // Store them in arrays for easy access
  const scaleValues = [scaleValue1, scaleValue2, scaleValue3, scaleValue4, scaleValue5, scaleValue6].slice(0, length);
  const borderColorValues = [borderValue1, borderValue2, borderValue3, borderValue4, borderValue5, borderValue6].slice(0, length);

  useEffect(() => {
    if (autoFocus && !disabled) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [autoFocus, disabled]);

  useEffect(() => {
    if (value.length === length && onComplete) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete(value);
    }
  }, [value, length, onComplete]);

  const handleTextChange = (text: string) => {
    const cleanedText = text.replace(/[^0-9]/g, '').slice(0, length);

    if (cleanedText.length > value.length) {
      // Adding a digit - provide haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Animate the box that received the digit
      const index = cleanedText.length - 1;
      if (scaleValues[index]) {
        scaleValues[index].value = withSpring(1.1, {
          damping: 10,
          stiffness: 400,
        }, () => {
          scaleValues[index].value = withSpring(1, {
            damping: 15,
            stiffness: 300,
          });
        });
      }
    }

    onChange(cleanedText);

    // Update border colors
    for (let i = 0; i < length; i++) {
      if (borderColorValues[i]) {
        borderColorValues[i].value = withTiming(
          i < cleanedText.length ? 1 : 0,
          { duration: 200 }
        );
      }
    }
  };

  const handleKeyPress = ({ nativeEvent }: any) => {
    if (nativeEvent.key === 'Backspace' && value.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const createAnimatedBoxStyle = (index: number) => {
    return useAnimatedStyle(() => {
      const scaleValue = scaleValues[index];
      const borderValue = borderColorValues[index];

      if (!scaleValue || !borderValue) {
        return {
          transform: [{ scale: 1 }],
          borderColor: colors.borderDefault || '#E0E0E0',
        };
      }

      const scale = scaleValue.value;
      const borderColorValue = borderValue.value;

      const borderColor = colors.borderDefault && colors.tint
        ? interpolateColor(
            borderColorValue,
            [0, 1],
            [colors.borderDefault, colors.tint]
          )
        : colors.borderDefault || '#E0E0E0';

      return {
        transform: [{ scale }],
        borderColor,
      };
    });
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={handlePress} style={styles.boxesContainer}>
        <View style={styles.boxes}>
          {Array.from({ length }, (_, index) => {
            const digit = value[index] || '';
            const isActive = index === value.length;
            const isFilled = index < value.length;

            return (
              <AnimatedPressable
                key={index}
                style={[
                  styles.box,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderWidth: error ? 2 : 1.5,
                    borderColor: error ? colors.statusError : colors.borderDefault,
                  },
                  createAnimatedBoxStyle(index),
                ]}
                onPress={handlePress}
              >
                <Text
                  style={[
                    styles.digit,
                    {
                      color: isFilled ? colors.textPrimary : colors.textTertiary,
                      fontSize: digit ? Theme.typography.sizes.xl : Theme.typography.sizes.lg,
                    },
                  ]}
                >
                  {digit || (isActive && !disabled ? '|' : '')}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>

        {/* Hidden input */}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={handleTextChange}
          onKeyPress={handleKeyPress}
          keyboardType="number-pad"
          maxLength={length}
          editable={!disabled}
          style={styles.hiddenInput}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
        />
      </Pressable>

      {error && (
        <View>
          <Text style={[styles.errorText, { color: colors.statusError }]}>
            {error}
          </Text>
        </View>
      )}

      <View style={styles.helperContainer}>
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          Enter the 6-digit code sent to your email
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  boxesContainer: {
    position: 'relative',
  },
  boxes: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: Theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadows.sm,
  },
  digit: {
    fontFamily: Theme.typography.fonts.semibold,
  },
  hiddenInput: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
  errorText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    textAlign: 'center',
    marginTop: Theme.spacing.xs,
  },
  helperContainer: {
    marginTop: Theme.spacing.sm,
  },
  helperText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    textAlign: 'center',
  },
});