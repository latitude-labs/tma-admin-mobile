import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useEndOfDayStore } from '@/store/endOfDayStore';
import { Theme } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { NumberInput } from './NumberInput';

export const TrialsStep: React.FC = () => {
  const colorScheme = useColorScheme();
  const currentTheme = Colors[colorScheme ?? 'light'];
  const {
    wizardState,
    updateWizardData,
    goToNextStep,
    goToPreviousStep,
  } = useEndOfDayStore();

  const { hasKids1Class, hasKids2Class, hasAdultsClass } = wizardState;
  const {
    kids_1_trials = 0,
    kids_2_trials = 0,
    adults_trials = 0,
  } = wizardState.data;

  const handleCountChange = (field: string) => (value: number) => {
    updateWizardData({ [field]: value });
  };

  const renderTrialCounter = (
    label: string,
    field: string,
    value: number,
    color: string
  ) => (
    <Card style={styles.trialCard}>
      <View style={styles.trialHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name="star-outline" size={24} color={color} />
        </View>
        <Text style={[styles.trialLabel, { color: currentTheme.text }]}>
          {label}
        </Text>
      </View>

      <NumberInput
        value={value}
        onChange={handleCountChange(field)}
        unit="trials"
        color={color}
      />
    </Card>
  );

  const totalTrials = kids_1_trials + kids_2_trials + adults_trials;

  return (
    <View style={styles.container}>
      <Text style={[styles.description, { color: currentTheme.text }]}>
        How many students tried a class for the first time today?
      </Text>

      <View style={styles.info}>
        <Ionicons name="information-circle" size={20} color={'#2196F3'} />
        <Text style={[styles.infoText, { color: '#2196F3' }]}>
          Only count people who haven't trained before
        </Text>
      </View>

      <View style={styles.counters}>
        {hasKids1Class && renderTrialCounter(
          'Kids Class 1 Trials',
          'kids_1_trials',
          kids_1_trials,
          '#2196F3'
        )}

        {hasKids2Class && renderTrialCounter(
          'Kids Class 2 Trials',
          'kids_2_trials',
          kids_2_trials,
          '#FFC107'
        )}

        {hasAdultsClass && renderTrialCounter(
          'Adults Class Trials',
          'adults_trials',
          adults_trials,
          '#4CAF50'
        )}
      </View>

      {totalTrials > 0 && (
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: currentTheme.text }]}>
            Total Trials Today
          </Text>
          <Text style={[styles.summaryValue, { color: currentTheme.tint }]}>
            {totalTrials} new {totalTrials === 1 ? 'student' : 'students'}
          </Text>
        </Card>
      )}

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
    marginBottom: Theme.spacing.md,
    lineHeight: Theme.typography.sizes.md * 1.5,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3' + '10',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.lg,
  },
  infoText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  counters: {
    marginBottom: Theme.spacing.lg,
  },
  trialCard: {
    marginBottom: Theme.spacing.md,
  },
  trialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  trialLabel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
  },
  summaryCard: {
    backgroundColor: Theme.colors.primary + '10',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  summaryLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    marginBottom: Theme.spacing.xs,
  },
  summaryValue: {
    fontSize: Theme.typography.sizes.lg,
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