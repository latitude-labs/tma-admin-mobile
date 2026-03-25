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

export const TrialsStep: React.FC = () => {
  const palette = useThemeColors();
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
        <Text style={[styles.trialLabel, { color: palette.text }]}>
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
      <Text style={[styles.description, { color: palette.text }]}>
        How many students tried a class for the first time today?
      </Text>

      <View style={[styles.info, { backgroundColor: palette.statusInfo + '10' }]}>
        <Ionicons name="information-circle" size={20} color={palette.statusInfo} />
        <Text style={[styles.infoText, { color: palette.statusInfo }]}>
          Only count people who haven't trained before
        </Text>
      </View>

      <View style={styles.counters}>
        {hasKids1Class ? renderTrialCounter(
          'Kids Class 1 Trials',
          'kids_1_trials',
          kids_1_trials,
          palette.statusInfo
        ) : null}

        {hasKids2Class ? renderTrialCounter(
          'Kids Class 2 Trials',
          'kids_2_trials',
          kids_2_trials,
          palette.statusWarning
        ) : null}

        {hasAdultsClass ? renderTrialCounter(
          'Adults Class Trials',
          'adults_trials',
          adults_trials,
          palette.statusSuccess
        ) : null}
      </View>

      {totalTrials > 0 ? (
        <Card style={[styles.summaryCard, { backgroundColor: palette.tint + '10' }]}>
          <Text style={[styles.summaryLabel, { color: palette.text }]}>
            Total Trials Today
          </Text>
          <Text style={[styles.summaryValue, { color: palette.tint }]}>
            {totalTrials} new {totalTrials === 1 ? 'student' : 'students'}
          </Text>
        </Card>
      ) : null}

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
    marginBottom: Theme.spacing.md,
    lineHeight: Theme.typography.sizes.md * 1.5,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.lg,
  },
  infoText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    fontWeight: Theme.typography.fontWeights.medium,
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
    fontWeight: Theme.typography.fontWeights.semibold,
  },
  summaryCard: {
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  summaryLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    fontWeight: Theme.typography.fontWeights.medium,
    marginBottom: Theme.spacing.xs,
  },
  summaryValue: {
    fontSize: Theme.typography.sizes.lg,
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
