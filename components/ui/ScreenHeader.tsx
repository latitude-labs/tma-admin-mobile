import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Theme } from '@/constants/Theme';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';

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
  const styles = useMemo(() => createStyles(palette), [palette]);

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.header, style]}>
      <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={palette.text} />
      </TouchableOpacity>

      <Text style={[styles.headerTitle, { color: palette.text }]}>{title}</Text>

      {rightAction ? (
        rightAction
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  placeholder: {
    width: 32,
  },
});