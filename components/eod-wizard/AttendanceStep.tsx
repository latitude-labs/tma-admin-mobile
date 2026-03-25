import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useEndOfDayStore } from '@/store/endOfDayStore';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { NumberInput } from './NumberInput';

export const AttendanceStep: React.FC = () => {
  const palette = useThemeColors();
  const {
    wizardState,
    updateWizardData,
    goToNextStep,
    goToPreviousStep,
  } = useEndOfDayStore();

  const { hasKids1Class, hasKids2Class, hasAdultsClass } = wizardState;
  const { kids_1_count = 0, kids_2_count = 0, adults_count = 0 } = wizardState.data;

  const handleCountChange = (field: string) => (value: number) => {
    updateWizardData({ [field]: value });
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
        <Text style={[styles.counterLabel, { color: palette.text }]}>
          {label}
        </Text>
      </View>

      <NumberInput
        value={value}
        onChange={handleCountChange(field)}
        unit="students"
        color={color}
      />
    </Card>
  );

  const totalAttendance = kids_1_count + kids_2_count + adults_count;

  return (
    <View style={styles.container}>
      <Text style={[styles.description, { color: palette.text }]}>
        How many students attended each class today?
      </Text>

      <View style={styles.counters}>
        {hasKids1Class ? renderCounter(
          'Kids Class 1',
          'kids_1_count',
          kids_1_count,
          'people',
          palette.statusInfo
        ) : null}

        {hasKids2Class ? renderCounter(
          'Kids Class 2',
          'kids_2_count',
          kids_2_count,
          'people',
          palette.statusWarning
        ) : null}

        {hasAdultsClass ? renderCounter(
          'Adults Class',
          'adults_count',
          adults_count,
          'person',
          palette.statusSuccess
        ) : null}
      </View>

      <Card style={[styles.totalCard, {
        backgroundColor: palette.tint + '10',
        borderColor: palette.tint,
      }]}>
        <View style={styles.totalContent}>
          <Text style={[styles.totalLabel, { color: palette.text }]}>
            Total Attendance
          </Text>
          <Text style={[styles.totalValue, { color: palette.text }]}>
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
    fontWeight: Theme.typography.fontWeights.regular,
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
    fontWeight: Theme.typography.fontWeights.semibold,
  },
  totalCard: {
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
    fontWeight: Theme.typography.fontWeights.medium,
  },
  totalValue: {
    fontSize: Theme.typography.sizes.xxl,
    fontFamily: Theme.typography.fonts.bold,
    fontWeight: Theme.typography.fontWeights.bold,
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
