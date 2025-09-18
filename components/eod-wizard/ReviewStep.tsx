import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useEndOfDayStore } from '@/store/endOfDayStore';
import { useClubStore } from '@/store/clubStore';
import { Theme } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format } from 'date-fns';

export const ReviewStep: React.FC = () => {
  const colorScheme = useColorScheme();
  const currentTheme = Colors[colorScheme ?? 'light'];
  const { clubs } = useClubStore();
  const {
    wizardState,
    submitWizardReport,
    goToPreviousStep,
  } = useEndOfDayStore();

  const [submitting, setSubmitting] = useState(false);

  const selectedClub = clubs.find(c => c.id === wizardState.data.club_id);
  const data = wizardState.data;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitWizardReport();
      Alert.alert(
        'Success!',
        'Your end of day report has been submitted successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(drawer)/eod-reports'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to submit report. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderSection = (title: string, icon: string, children: React.ReactNode) => (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={20} color={Theme.colors.primary} />
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
          {title}
        </Text>
      </View>
      {children}
    </Card>
  );

  const renderRow = (label: string, value: number | string | null | undefined, highlight = false) => {
    if (value === null || value === undefined || value === 0) return null;

    return (
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: Theme.colors.text.secondary }]}>
          {label}
        </Text>
        <Text style={[
          styles.rowValue,
          { color: highlight ? Theme.colors.primary : currentTheme.text }
        ]}>
          {typeof value === 'number' ? value : value}
        </Text>
      </View>
    );
  };

  const totalAttendance = (data.kids_1_count || 0) + (data.kids_2_count || 0) + (data.adults_count || 0);
  const totalTrials = (data.kids_1_trials || 0) + (data.kids_2_trials || 0) + (data.adults_trials || 0);
  const totalNewSignups = (data.new_kids_paid_kit_and_signed_dd_count || 0) +
    (data.new_kids_signed_dd_no_kit_count || 0) +
    (data.new_adults_paid_kit_and_signed_dd_count || 0) +
    (data.new_adults_signed_dd_no_kit_count || 0);
  const totalReturningSignups = (data.returning_kids_paid_kit_and_signed_dd_count || 0) +
    (data.returning_kids_signed_dd_no_kit_count || 0) +
    (data.returning_adults_paid_kit_and_signed_dd_count || 0) +
    (data.returning_adults_signed_dd_no_kit_count || 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={[styles.description, { color: Theme.colors.text.secondary }]}>
        Please review your report before submitting
      </Text>

      <Card style={styles.headerCard}>
        <Text style={[styles.clubName, { color: currentTheme.text }]}>
          {selectedClub?.name}
        </Text>
        <Text style={[styles.date, { color: Theme.colors.text.secondary }]}>
          {format(new Date(data.report_date || new Date()), 'EEEE, MMMM d, yyyy')}
        </Text>
      </Card>

      {renderSection('Attendance', 'people', (
        <>
          {renderRow('Kids Class 1', data.kids_1_count)}
          {renderRow('Kids Class 2', data.kids_2_count)}
          {renderRow('Adults Class', data.adults_count)}
          <View style={styles.divider} />
          {renderRow('Total Attendance', totalAttendance, true)}
        </>
      ))}

      {totalTrials > 0 && renderSection('Trial Sessions', 'star', (
        <>
          {renderRow('Kids 1 Trials', data.kids_1_trials)}
          {renderRow('Kids 2 Trials', data.kids_2_trials)}
          {renderRow('Adults Trials', data.adults_trials)}
          <View style={styles.divider} />
          {renderRow('Total Trials', totalTrials, true)}
        </>
      ))}

      {totalNewSignups > 0 && renderSection('New Sign-ups (Same Day)', 'checkmark-circle', (
        <>
          {renderRow('Kids - Paid Kit + DD', data.new_kids_paid_kit_and_signed_dd_count)}
          {renderRow('Kids - DD Only', data.new_kids_signed_dd_no_kit_count)}
          {renderRow('Adults - Paid Kit + DD', data.new_adults_paid_kit_and_signed_dd_count)}
          {renderRow('Adults - DD Only', data.new_adults_signed_dd_no_kit_count)}
          <View style={styles.divider} />
          {renderRow('Total New Sign-ups', totalNewSignups, true)}
        </>
      ))}

      {totalReturningSignups > 0 && renderSection('Returning Sign-ups', 'refresh-circle', (
        <>
          {renderRow('Kids - Paid Kit + DD', data.returning_kids_paid_kit_and_signed_dd_count)}
          {renderRow('Kids - DD Only', data.returning_kids_signed_dd_no_kit_count)}
          {renderRow('Adults - Paid Kit + DD', data.returning_adults_paid_kit_and_signed_dd_count)}
          {renderRow('Adults - DD Only', data.returning_adults_signed_dd_no_kit_count)}
          <View style={styles.divider} />
          {renderRow('Total Returning', totalReturningSignups, true)}
        </>
      ))}

      {renderSection('Financial', 'cash', (
        <Text style={[styles.cashAmount, { color: Theme.colors.success }]}>
          £{(data.total_cash_taken || 0).toFixed(2)}
        </Text>
      ))}

      {(data.signup_names || data.helper_names || data.incidents || data.general_notes) &&
        renderSection('Additional Information', 'document-text', (
          <>
            {data.signup_names && (
              <View style={styles.noteSection}>
                <Text style={[styles.noteLabel, { color: Theme.colors.text.secondary }]}>
                  Sign-ups:
                </Text>
                <Text style={[styles.noteText, { color: currentTheme.text }]}>
                  {data.signup_names}
                </Text>
              </View>
            )}
            {data.helper_names && (
              <View style={styles.noteSection}>
                <Text style={[styles.noteLabel, { color: Theme.colors.text.secondary }]}>
                  Helpers:
                </Text>
                <Text style={[styles.noteText, { color: currentTheme.text }]}>
                  {data.helper_names}
                </Text>
              </View>
            )}
            {data.incidents && (
              <View style={styles.noteSection}>
                <Text style={[styles.noteLabel, { color: Theme.colors.text.secondary }]}>
                  Incidents:
                </Text>
                <Text style={[styles.noteText, { color: currentTheme.text }]}>
                  {data.incidents}
                </Text>
              </View>
            )}
            {data.general_notes && (
              <View style={styles.noteSection}>
                <Text style={[styles.noteLabel, { color: Theme.colors.text.secondary }]}>
                  Notes:
                </Text>
                <Text style={[styles.noteText, { color: currentTheme.text }]}>
                  {data.general_notes}
                </Text>
              </View>
            )}
          </>
        ))}

      <View style={styles.footer}>
        <Button
          variant="outline"
          onPress={goToPreviousStep}
          style={styles.footerButton}
          disabled={submitting}
        >
          Back
        </Button>
        <Button
          variant="primary"
          onPress={handleSubmit}
          style={styles.footerButton}
          loading={submitting}
        >
          Submit Report
        </Button>
      </View>
    </ScrollView>
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
  headerCard: {
    backgroundColor: Theme.colors.primary + '10',
    borderColor: Theme.colors.primary,
    borderWidth: 1,
    marginBottom: Theme.spacing.lg,
    alignItems: 'center',
  },
  clubName: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    marginBottom: Theme.spacing.xs,
  },
  date: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
  },
  sectionCard: {
    marginBottom: Theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    marginLeft: Theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.xs,
  },
  rowLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
  },
  rowValue: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border.light,
    marginVertical: Theme.spacing.sm,
  },
  cashAmount: {
    fontSize: Theme.typography.sizes.xxl,
    fontFamily: Theme.typography.fonts.bold,
    textAlign: 'center',
  },
  noteSection: {
    marginBottom: Theme.spacing.md,
  },
  noteLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    marginBottom: Theme.spacing.xs,
  },
  noteText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    lineHeight: Theme.typography.sizes.sm * 1.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl,
  },
  footerButton: {
    flex: 1,
    marginHorizontal: Theme.spacing.sm,
  },
});