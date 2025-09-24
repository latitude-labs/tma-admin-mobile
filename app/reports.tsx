import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Theme } from '@/constants/Theme';
import { Card } from '@/components/ui';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';

export default function ReportsScreen() {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.title}>Reports</Text>
          <Text style={styles.subtitle}>Generate and view detailed reports</Text>
        </Card>
      </View>
      </ScrollView>
    </>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.backgroundSecondary,
    paddingTop: 60,
  },
  content: {
    padding: Theme.spacing.lg,
  },
  card: {
    padding: Theme.spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  subtitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    textAlign: 'center',
  },
});
