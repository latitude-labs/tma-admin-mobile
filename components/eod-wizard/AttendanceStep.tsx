import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useEndOfDayStore } from '@/store/endOfDayStore';
import { Theme } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export const AttendanceStep: React.FC = () => {
  const colorScheme = useColorScheme();
  const currentTheme = Colors[colorScheme ?? 'light'];
  const {
    wizardState,
    updateWizardData,
    goToNextStep,
    goToPreviousStep,
  } = useEndOfDayStore();

  const { hasKids1Class, hasKids2Class, hasAdultsClass } = wizardState;
  const { kids_1_count = 0, kids_2_count = 0, adults_count = 0 } = wizardState.data;

  const handleCountChange = (field: string, delta: number) => {
    const currentValue = wizardState.data[field as keyof typeof wizardState.data] as number || 0;
    const newValue = Math.max(0, currentValue + delta);
    updateWizardData({ [field]: newValue });
  };

  const renderCounter = (
    label: string,
    field: string,
    value: number,
    icon: string,
    color: string
  ) => (
    <Card style={styles.counterCard}>
      <View style={styles.counterHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
        <Text style={[styles.counterLabel, { color: currentTheme.text }]}>
          {label}
        </Text>
      </View>

      <View style={styles.counterControls}>
        <TouchableOpacity
          onPress={() => handleCountChange(field, -1)}
          style={[styles.counterButton, { backgroundColor: Theme.colors.secondary.light }]}
        >
          <Ionicons name="remove" size={24} color={Theme.colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.counterValueContainer}>
          <Text style={[styles.counterValue, { color: currentTheme.text }]}>
            {value}
          </Text>
          <Text style={[styles.counterUnit, { color: Theme.colors.text.secondary }]}>
            students
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => handleCountChange(field, 1)}
          style={[styles.counterButton, { backgroundColor: Theme.colors.primary }]}
        >
          <Ionicons name="add" size={24} color={Theme.colors.text.inverse} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  const totalAttendance = kids_1_count + kids_2_count + adults_count;

  return (
    <View style={styles.container}>
      <Text style={[styles.description, { color: Theme.colors.text.secondary }]}>
        How many students attended each class today?
      </Text>

      <View style={styles.counters}>
        {hasKids1Class && renderCounter(
          'Kids Class 1',
          'kids_1_count',
          kids_1_count,
          'people',
          Theme.colors.info
        )}

        {hasKids2Class && renderCounter(
          'Kids Class 2',
          'kids_2_count',
          kids_2_count,
          'people',
          Theme.colors.warning
        )}

        {hasAdultsClass && renderCounter(
          'Adults Class',
          'adults_count',
          adults_count,
          'person',
          Theme.colors.success
        )}
      </View>

      <Card style={styles.totalCard}>
        <View style={styles.totalContent}>
          <Text style={[styles.totalLabel, { color: Theme.colors.text.secondary }]}>
            Total Attendance
          </Text>
          <Text style={[styles.totalValue, { color: currentTheme.text }]}>
            {totalAttendance}
          </Text>
        </View>
      </Card>

      <View style={styles.footer}>
        <Button
          variant="outline"
          onPress={goToPreviousStep}
          style={styles.footerButton}
        >
          Back
        </Button>
        <Button
          variant="primary"
          onPress={goToNextStep}
          style={styles.footerButton}
        >
          Continue
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  description: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    marginBottom: Theme.spacing.lg,
    lineHeight: Theme.typography.sizes.md * 1.5,
  },
  counters: {
    marginBottom: Theme.spacing.lg,
  },
  counterCard: {
    marginBottom: Theme.spacing.md,
  },
  counterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  counterLabel: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterButton: {
    width: 48,
    height: 48,
    borderRadius: Theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValueContainer: {
    alignItems: 'center',
  },
  counterValue: {
    fontSize: Theme.typography.sizes.xxxl,
    fontFamily: Theme.typography.fonts.bold,
  },
  counterUnit: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
  },
  totalCard: {
    backgroundColor: Theme.colors.primary + '10',
    borderColor: Theme.colors.primary,
    borderWidth: 1,
  },
  totalContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
  },
  totalValue: {
    fontSize: Theme.typography.sizes.xxl,
    fontFamily: Theme.typography.fonts.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Theme.spacing.lg,
  },
  footerButton: {
    flex: 1,
    marginHorizontal: Theme.spacing.sm,
  },
});