import React, { useMemo } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { DateRange, dateRangeOptions } from '@/types/clubHealth';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

interface DateRangePickerProps {
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  selectedRange,
  onRangeChange,
}) => {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const handlePress = (value: DateRange) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRangeChange(value);
  };

  const DateRangeButton = ({ option }: { option: typeof dateRangeOptions[0] }) => {
    const isSelected = selectedRange === option.value;

    const animatedStyle = useAnimatedStyle(() => {
      return {
        backgroundColor: withTiming(
          isSelected ? palette.textPrimary : palette.background,
          { duration: 200 }
        ),
        borderColor: withTiming(
          isSelected ? palette.textPrimary : palette.border,
          { duration: 200 }
        ),
      };
    });

    return (
      <AnimatedTouchableOpacity
        style={[styles.rangeButton, animatedStyle]}
        onPress={() => handlePress(option.value)}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.rangeButtonText,
            isSelected && styles.rangeButtonTextSelected,
          ]}
        >
          {option.label}
        </Text>
      </AnimatedTouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Period</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {dateRangeOptions.map((option) => (
          <DateRangeButton key={option.value} option={option} />
        ))}
      </ScrollView>
    </View>
  );
};

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  label: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  rangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeButtonText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textPrimary,
  },
  rangeButtonTextSelected: {
    color: palette.background,
  },
});