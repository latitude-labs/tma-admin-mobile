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

export const ReturningSignupsStep: React.FC = () => {
  const palette = useThemeColors();
  const {
    wizardState,
    updateWizardData,
    goToNextStep,
    goToPreviousStep,
  } = useEndOfDayStore();

  const { hasKids1Class, hasKids2Class, hasAdultsClass } = wizardState;
  const {
    returning_kids_paid_kit_and_signed_dd_count = 0,
    returning_kids_signed_dd_no_kit_count = 0,
    returning_adults_paid_kit_and_signed_dd_count = 0,
    returning_adults_signed_dd_no_kit_count = 0,
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
        <Ionicons name={icon as any} size={24} color={palette.statusWarning} />
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
        color={palette.statusWarning}
      />
    </Card>
  );

  const hasKidsClasses = hasKids1Class || hasKids2Class;
  const totalReturningSignups =
    returning_kids_paid_kit_and_signed_dd_count +
    returning_kids_signed_dd_no_kit_count +
    returning_adults_paid_kit_and_signed_dd_count +
    returning_adults_signed_dd_no_kit_count;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: palette.text }]}>
        Returning Sign-ups
      </Text>
      <Text style={[styles.description, { color: palette.textSecondary }]}>
        Students who trialed before and came back today to sign up
      </Text>

      {hasKidsClasses ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            Returning Kids
          </Text>
          {renderSignupOption(
            'Paid Kit + DD',
            'returning_kids_paid_kit_and_signed_dd_count',
            returning_kids_paid_kit_and_signed_dd_count,
            'refresh-circle',
            'Paid for kit and signed Direct Debit'
          )}
          {renderSignupOption(
            'DD Only',
            'returning_kids_signed_dd_no_kit_count',
            returning_kids_signed_dd_no_kit_count,
            'refresh',
            'Signed Direct Debit, kit to be paid later'
          )}
        </View>
      ) : null}

      {hasAdultsClass ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            Returning Adults
          </Text>
          {renderSignupOption(
            'Paid Kit + DD',
            'returning_adults_paid_kit_and_signed_dd_count',
            returning_adults_paid_kit_and_signed_dd_count,
            'refresh-circle',
            'Paid for kit and signed Direct Debit'
          )}
          {renderSignupOption(
            'DD Only',
            'returning_adults_signed_dd_no_kit_count',
            returning_adults_signed_dd_no_kit_count,
            'refresh',
            'Signed Direct Debit, kit to be paid later'
          )}
        </View>
      ) : null}

      {totalReturningSignups > 0 ? (
        <Card style={[styles.summaryCard, { backgroundColor: palette.statusWarning + '10' }]}>
          <Text style={[styles.summaryValue, { color: palette.statusWarning }]}>
            {totalReturningSignups} returning {totalReturningSignups === 1 ? 'member' : 'members'} today!
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
