import { Theme } from '@/constants/Theme';
import { ThemeColors } from '@/hooks/useThemeColors';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface DashboardLoadingProps {
  colors: ThemeColors;
}

export function DashboardLoading({ colors }: DashboardLoadingProps) {
  const styles = StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
    },
    loadingText: {
      fontSize: Theme.typography.sizes.md,
      color: colors.textSecondary,
      fontFamily: Theme.typography.fonts.medium,
      marginTop: Theme.spacing.md,
    },
  });

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.tint} />
      <Text style={styles.loadingText}>Loading your dashboard...</Text>
    </View>
  );
}
