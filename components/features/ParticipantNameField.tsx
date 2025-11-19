import React, { useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Theme } from '@/constants/Theme';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface ParticipantNameFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  onRemove?: () => void;
  error?: string;
  placeholder?: string;
  index: number;
  canRemove: boolean;
}

export const ParticipantNameField: React.FC<ParticipantNameFieldProps> = ({
  value,
  onChangeText,
  onRemove,
  error,
  placeholder = 'Enter participant name',
  index,
  canRemove,
}) => {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const handleRemove = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onRemove?.();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={styles.container}
    >
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {index === 0 ? 'Participant Name' : `Participant ${index + 1}`}
        </Text>
        {canRemove && (
          <TouchableOpacity
            onPress={handleRemove}
            style={styles.removeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={20} color={palette.statusError} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.inputContainer, error ? styles.inputError : null]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.textTertiary}
          maxLength={100}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>

      {error ? (
        <Animated.Text entering={FadeIn.duration(150)} style={styles.errorText}>
          {error}
        </Animated.Text>
      ) : null}
    </Animated.View>
  );
};

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginBottom: Theme.spacing.md,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Theme.spacing.xs,
    },
    label: {
      fontSize: Theme.typography.sizes.sm,
      fontFamily: Theme.typography.fonts.medium,
      color: palette.textPrimary,
    },
    removeButton: {
      padding: Theme.spacing.xs,
    },
    inputContainer: {
      borderWidth: 1,
      borderColor: palette.borderDefault,
      borderRadius: Theme.borderRadius.md,
      backgroundColor: palette.background,
      paddingHorizontal: Theme.spacing.md,
      minHeight: 48,
      justifyContent: 'center',
    },
    inputError: {
      borderColor: palette.statusError,
      borderWidth: 1.5,
    },
    input: {
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
  });
