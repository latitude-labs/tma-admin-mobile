import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Theme } from '@/constants/Theme';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from '@/components/ui/GlassView';

interface ScreenHeaderProps {
  title: string;
  rightAction?: React.ReactNode;
  onBackPress?: () => void;
  style?: ViewStyle;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  rightAction,
  onBackPress,
  style,
}) => {
  const router = useRouter();
  const palette = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(palette, insets.top), [palette, insets.top]);

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <GlassView intensity="light" style={[styles.header, style]}>
      <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={palette.text} />
      </TouchableOpacity>

      <Text style={[styles.headerTitle, { color: palette.text }]}>{title}</Text>

      {rightAction ? (
        rightAction
      ) : (
        <View style={styles.placeholder} />
      )}
    </GlassView>
  );
};

const createStyles = (palette: ThemeColors, topInset: number) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Math.max(topInset, 20) + 10, // Dynamic safe area + breathing room
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: 'System',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  placeholder: {
    width: 32,
  },
});