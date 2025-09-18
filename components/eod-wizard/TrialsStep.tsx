import React from 'react';
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

  const handleCountChange = (field: string, delta: number) => {
    const currentValue = wizardState.data[field as keyof typeof wizardState.data] as number || 0;
    const newValue = Math.max(0, currentValue + delta);
    updateWizardData({ [field]: newValue });
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

      <View style={styles.counterControls}>
        <TouchableOpacity
          onPress={() => handleCountChange(field, -1)}
          style={[styles.counterButton, { backgroundColor: Theme.colors.secondary.light }]}
        >
          <Ionicons name="remove" size={20} color={Theme.colors.text.primary} />
        </TouchableOpacity>

        <Text style={[styles.counterValue, { color: currentTheme.text }]}>
          {value}
        </Text>

        <TouchableOpacity
          onPress={() => handleCountChange(field, 1)}
          style={[styles.counterButton, { backgroundColor: Theme.colors.primary }]}
        >
          <Ionicons name="add" size={20} color={Theme.colors.text.inverse} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  const totalTrials = kids_1_trials + kids_2_trials + adults_trials;

  return (
    <View style={styles.container}>
      <Text style={[styles.description, { color: Theme.colors.text.secondary }]}>
        How many students tried a class for the first time today?
      </Text>

      <View style={styles.info}>
        <Ionicons name="information-circle" size={20} color={Theme.colors.info} />
        <Text style={[styles.infoText, { color: Theme.colors.info }]}>
          Only count people who haven't trained before
        </Text>
      </View>

      <View style={styles.counters}>
        {hasKids1Class && renderTrialCounter(
          'Kids Class 1 Trials',
          'kids_1_trials',
          kids_1_trials,
          Theme.colors.info
        )}

        {hasKids2Class && renderTrialCounter(
          'Kids Class 2 Trials',
          'kids_2_trials',
          kids_2_trials,
          Theme.colors.warning
        )}

        {hasAdultsClass && renderTrialCounter(
          'Adults Class Trials',
          'adults_trials',
          adults_trials,
          Theme.colors.success
        )}
      </View>

      {totalTrials > 0 && (
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: Theme.colors.text.secondary }]}>
            Total Trials Today
          </Text>
          <Text style={[styles.summaryValue, { color: Theme.colors.primary }]}>
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
    backgroundColor: Theme.colors.info + '10',
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
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    marginHorizontal: Theme.spacing.xl,
    minWidth: 40,
    textAlign: 'center',
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