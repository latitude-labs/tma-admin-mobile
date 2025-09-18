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

export const ReturningSignupsStep: React.FC = () => {
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
    returning_kids_paid_kit_and_signed_dd_count = 0,
    returning_kids_signed_dd_no_kit_count = 0,
    returning_adults_paid_kit_and_signed_dd_count = 0,
    returning_adults_signed_dd_no_kit_count = 0,
  } = wizardState.data;

  const handleCountChange = (field: string, delta: number) => {
    const currentValue = wizardState.data[field as keyof typeof wizardState.data] as number || 0;
    const newValue = Math.max(0, currentValue + delta);
    updateWizardData({ [field]: newValue });
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
        <Ionicons name={icon as any} size={24} color={Theme.colors.warning} />
        <View style={styles.signupText}>
          <Text style={[styles.signupLabel, { color: currentTheme.text }]}>
            {label}
          </Text>
          <Text style={[styles.signupDescription, { color: Theme.colors.text.secondary }]}>
            {description}
          </Text>
        </View>
      </View>

      <View style={styles.counterControls}>
        <TouchableOpacity
          onPress={() => handleCountChange(field, -1)}
          style={styles.counterButton}
        >
          <Ionicons name="remove-circle" size={32} color={Theme.colors.secondary.default} />
        </TouchableOpacity>
        <Text style={[styles.counterValue, { color: currentTheme.text }]}>
          {value}
        </Text>
        <TouchableOpacity
          onPress={() => handleCountChange(field, 1)}
          style={styles.counterButton}
        >
          <Ionicons name="add-circle" size={32} color={Theme.colors.warning} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  const hasKidsClasses = hasKids1Class || hasKids2Class;
  const totalReturningSignups =
    returning_kids_paid_kit_and_signed_dd_count +
    returning_kids_signed_dd_no_kit_count +
    returning_adults_paid_kit_and_signed_dd_count +
    returning_adults_signed_dd_no_kit_count;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: currentTheme.text }]}>
        Returning Sign-ups
      </Text>
      <Text style={[styles.description, { color: Theme.colors.text.secondary }]}>
        Students who trialed before and came back today to sign up
      </Text>

      {hasKidsClasses && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
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
      )}

      {hasAdultsClass && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
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
      )}

      {totalReturningSignups > 0 && (
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: Theme.colors.warning }]}>
            {totalReturningSignups} returning {totalReturningSignups === 1 ? 'member' : 'members'} today!
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
  title: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    marginBottom: Theme.spacing.xs,
  },
  description: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    marginBottom: Theme.spacing.lg,
    lineHeight: Theme.typography.sizes.md * 1.5,
  },
  section: {
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
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
  },
  signupDescription: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    marginTop: 2,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButton: {
    padding: Theme.spacing.xs,
  },
  counterValue: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    marginHorizontal: Theme.spacing.lg,
    minWidth: 40,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: Theme.colors.warning + '10',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  summaryValue: {
    fontSize: Theme.typography.sizes.md,
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