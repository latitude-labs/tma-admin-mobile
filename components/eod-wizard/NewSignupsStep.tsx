import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useEndOfDayStore } from '@/store/endOfDayStore';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { NumberInput } from './NumberInput';

export const NewSignupsStep: React.FC = () => {
  const palette = useThemeColors();
  const {
    wizardState,
    updateWizardData,
    goToNextStep,
    goToPreviousStep,
  } = useEndOfDayStore();

  const { hasKids1Class, hasKids2Class, hasAdultsClass } = wizardState;
  const {
    new_kids_paid_kit_and_signed_dd_count = 0,
    new_kids_signed_dd_no_kit_count = 0,
    new_adults_paid_kit_and_signed_dd_count = 0,
    new_adults_signed_dd_no_kit_count = 0,
  } = wizardState.data;

  const handleCountChange = (field: string) => (value: number) => {
    updateWizardData({ [field]: value });
  };

  const renderSignupOption = (
    label: string,
    field: string,
    value: number,
    icon: string,
    description: string
  ) => (
    <Card style={styles.signupCard}>
      <View style={styles.signupHeader}>
        <Ionicons name={icon as any} size={24} color={palette.tint} />
        <View style={styles.signupText}>
          <Text style={[styles.signupLabel, { color: palette.text }]}>
            {label}
          </Text>
          <Text style={[styles.signupDescription, { color: palette.textSecondary }]}>
            {description}
          </Text>
        </View>
      </View>

      <NumberInput
        value={value}
        onChange={handleCountChange(field)}
        color={palette.tint}
      />
    </Card>
  );

  const hasKidsClasses = hasKids1Class || hasKids2Class;
  const totalNewSignups =
    new_kids_paid_kit_and_signed_dd_count +
    new_kids_signed_dd_no_kit_count +
    new_adults_paid_kit_and_signed_dd_count +
    new_adults_signed_dd_no_kit_count;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: palette.text }]}>
        New Sign-ups (Same Day)
      </Text>
      <Text style={[styles.description, { color: palette.textSecondary }]}>
        Students who signed up immediately after their trial session today
      </Text>

      {hasKidsClasses ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            Kids Sign-ups
          </Text>
          {renderSignupOption(
            'Paid Kit + DD',
            'new_kids_paid_kit_and_signed_dd_count',
            new_kids_paid_kit_and_signed_dd_count,
            'checkmark-done-circle',
            'Paid for kit and signed Direct Debit'
          )}
          {renderSignupOption(
            'DD Only',
            'new_kids_signed_dd_no_kit_count',
            new_kids_signed_dd_no_kit_count,
            'checkmark-circle',
            'Signed Direct Debit, kit to be paid later'
          )}
        </View>
      ) : null}

      {hasAdultsClass ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            Adults Sign-ups
          </Text>
          {renderSignupOption(
            'Paid Kit + DD',
            'new_adults_paid_kit_and_signed_dd_count',
            new_adults_paid_kit_and_signed_dd_count,
            'checkmark-done-circle',
            'Paid for kit and signed Direct Debit'
          )}
          {renderSignupOption(
            'DD Only',
            'new_adults_signed_dd_no_kit_count',
            new_adults_signed_dd_no_kit_count,
            'checkmark-circle',
            'Signed Direct Debit, kit to be paid later'
          )}
        </View>
      ) : null}

      {totalNewSignups > 0 ? (
        <Card style={[styles.summaryCard, { backgroundColor: palette.statusSuccess + '10' }]}>
          <Text style={[styles.summaryValue, { color: palette.statusSuccess }]}>
            {totalNewSignups} new {totalNewSignups === 1 ? 'member' : 'members'} today!
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    fontWeight: Theme.typography.fontWeights.bold,
    marginBottom: Theme.spacing.xs,
  },
  description: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    fontWeight: Theme.typography.fontWeights.regular,
    marginBottom: Theme.spacing.lg,
    lineHeight: Theme.typography.sizes.md * 1.5,
  },
  section: {
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    fontWeight: Theme.typography.fontWeights.semibold,
    marginBottom: Theme.spacing.md,
  },
  signupCard: {
    marginBottom: Theme.spacing.md,
  },
  signupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  signupText: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  signupLabel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    fontWeight: Theme.typography.fontWeights.semibold,
  },
  signupDescription: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    fontWeight: Theme.typography.fontWeights.regular,
    marginTop: 2,
  },
  summaryCard: {
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  summaryValue: {
    fontSize: Theme.typography.sizes.md,
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
