import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Theme } from '@/constants/Theme';
import { Card } from '@/components/ui';

export default function ReportsScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.title}>Reports</Text>
          <Text style={styles.subtitle}>Generate and view detailed reports</Text>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.secondary,
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
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.sm,
  },
  subtitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
  },
});