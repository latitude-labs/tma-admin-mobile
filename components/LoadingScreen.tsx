import React, { useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';

export function LoadingScreen() {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[palette.backgroundGradientStart, palette.backgroundGradientEnd]}
        style={StyleSheet.absoluteFillObject}
      />
      <ActivityIndicator size="large" color={palette.tint} />
    </View>
  );
}

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: palette.background,
    },
  });
