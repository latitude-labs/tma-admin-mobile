import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useEndOfDayStore } from '@/store/endOfDayStore';
import { Theme } from '@/constants/Theme';
import { Card } from '@/components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { TouchableOpacity } from 'react-native';

export default function EoDReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentReport, fetchReport, loading } = useEndOfDayStore();

  useEffect(() => {
    if (id) {
      const reportId = Array.isArray(id) ? id[0] : id;
      fetchReport(parseInt(reportId));
    }
  }, [id]);

  const handleBack = () => {
    router.back();
  };

  if (loading || !currentReport) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Report Details',
          }}
        />
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  const renderSection = (title: string, icon: string, content: React.ReactNode) => (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={20} color={Theme.colors.primary} />
        <Text style={styles.sectionTitle}>
          {title}
        </Text>
      </View>
      {content}
    </Card>
  );

  const renderMetric = (label: string, value: number | string, color?: string) => (
    <View style={styles.metricRow}>
      <Text style={[styles.metricLabel, { color: Theme.colors.text.secondary }]}>
        {label}
      </Text>
      <Text style={[styles.metricValue, { color: color || Theme.colors.text.primary }]}>
        {value}
      </Text>
    </View>
  );

  const totalAttendance = (currentReport.kids_1_count || 0) + (currentReport.kids_2_count || 0) + (currentReport.adults_count || 0);
  const totalTrials = (currentReport.kids_1_trials || 0) + (currentReport.kids_2_trials || 0) + (currentReport.adults_trials || 0);
  const totalNewSignups =
    (currentReport.new_kids_paid_kit_and_signed_dd_count || 0) +
    (currentReport.new_kids_signed_dd_no_kit_count || 0) +
    (currentReport.new_adults_paid_kit_and_signed_dd_count || 0) +
    (currentReport.new_adults_signed_dd_no_kit_count || 0);
  const totalReturningSignups =
    (currentReport.returning_kids_paid_kit_and_signed_dd_count || 0) +
    (currentReport.returning_kids_signed_dd_no_kit_count || 0) +
    (currentReport.returning_adults_paid_kit_and_signed_dd_count || 0) +
    (currentReport.returning_adults_signed_dd_no_kit_count || 0);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Report Details',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={Theme.colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.headerCard}>
          <Text style={styles.clubName}>
            {currentReport.club?.name}
          </Text>
          <Text style={[styles.date, { color: Theme.colors.text.secondary }]}>
            {currentReport.report_date ? format(parseISO(currentReport.report_date), 'EEEE, MMMM d, yyyy') : 'No date'}
          </Text>
          {(currentReport.coach || currentReport.user) && (
            <Text style={[styles.reportedBy, { color: Theme.colors.text.tertiary }]}>
              Reported by: {currentReport.coach?.name || currentReport.user?.name}
            </Text>
          )}
        </Card>

        <Card style={styles.statsContainer}>
          <View style={styles.statRow}>
            <View style={styles.statRowLeft}>
              <Ionicons name="people-outline" size={20} color={Theme.colors.primary} />
              <Text style={styles.statLabel}>Attendance</Text>
            </View>
            <Text style={styles.statValue}>{totalAttendance}</Text>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statRowLeft}>
              <Ionicons name="star-outline" size={20} color={Theme.colors.status.warning} />
              <Text style={styles.statLabel}>Trials</Text>
            </View>
            <Text style={styles.statValue}>{totalTrials}</Text>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statRowLeft}>
              <Ionicons name="person-add-outline" size={20} color={Theme.colors.status.success} />
              <Text style={styles.statLabel}>Sign-ups</Text>
            </View>
            <Text style={styles.statValue}>{totalNewSignups + totalReturningSignups}</Text>
          </View>

          <View style={[styles.statRow, { marginBottom: 0 }]}>
            <View style={styles.statRowLeft}>
              <Ionicons name="cash-outline" size={20} color={Theme.colors.status.success} />
              <Text style={styles.statLabel}>Cash Collected</Text>
            </View>
            <Text style={[styles.statValue, { color: Theme.colors.status.success }]}>£{(currentReport.total_cash_taken || 0).toFixed(2)}</Text>
          </View>
        </Card>

        {renderSection('Attendance Details', 'people', (
          <>
            {currentReport.kids_1_count > 0 && renderMetric('Kids Class 1', currentReport.kids_1_count)}
            {currentReport.kids_2_count > 0 && renderMetric('Kids Class 2', currentReport.kids_2_count)}
            {currentReport.adults_count > 0 && renderMetric('Adults Class', currentReport.adults_count)}
          </>
        ))}

        {totalTrials > 0 && renderSection('Trial Sessions', 'star-outline', (
          <>
            {currentReport.kids_1_trials > 0 && renderMetric('Kids 1 Trials', currentReport.kids_1_trials)}
            {currentReport.kids_2_trials > 0 && renderMetric('Kids 2 Trials', currentReport.kids_2_trials)}
            {currentReport.adults_trials > 0 && renderMetric('Adults Trials', currentReport.adults_trials)}
          </>
        ))}

        {totalNewSignups > 0 && renderSection('New Sign-ups (Same Day)', 'checkmark-circle', (
          <>
            {currentReport.new_kids_paid_kit_and_signed_dd_count > 0 &&
              renderMetric('Kids - Paid Kit + DD', currentReport.new_kids_paid_kit_and_signed_dd_count)}
            {currentReport.new_kids_signed_dd_no_kit_count > 0 &&
              renderMetric('Kids - DD Only', currentReport.new_kids_signed_dd_no_kit_count)}
            {currentReport.new_adults_paid_kit_and_signed_dd_count > 0 &&
              renderMetric('Adults - Paid Kit + DD', currentReport.new_adults_paid_kit_and_signed_dd_count)}
            {currentReport.new_adults_signed_dd_no_kit_count > 0 &&
              renderMetric('Adults - DD Only', currentReport.new_adults_signed_dd_no_kit_count)}
          </>
        ))}

        {totalReturningSignups > 0 && renderSection('Returning Sign-ups', 'refresh-circle', (
          <>
            {currentReport.returning_kids_paid_kit_and_signed_dd_count > 0 &&
              renderMetric('Kids - Paid Kit + DD', currentReport.returning_kids_paid_kit_and_signed_dd_count)}
            {currentReport.returning_kids_signed_dd_no_kit_count > 0 &&
              renderMetric('Kids - DD Only', currentReport.returning_kids_signed_dd_no_kit_count)}
            {currentReport.returning_adults_paid_kit_and_signed_dd_count > 0 &&
              renderMetric('Adults - Paid Kit + DD', currentReport.returning_adults_paid_kit_and_signed_dd_count)}
            {currentReport.returning_adults_signed_dd_no_kit_count > 0 &&
              renderMetric('Adults - DD Only', currentReport.returning_adults_signed_dd_no_kit_count)}
          </>
        ))}

        {renderSection('Financial Summary', 'cash', (
          <Text style={[styles.cashAmount, { color: Theme.colors.status.success }]}>
            £{(currentReport.total_cash_taken || 0).toFixed(2)}
          </Text>
        ))}

        {(currentReport.signup_names || currentReport.helper_names ||
          currentReport.incidents || currentReport.general_notes) &&
          renderSection('Additional Information', 'document-text', (
            <>
              {currentReport.signup_names && (
                <View style={styles.noteItem}>
                  <Text style={[styles.noteLabel, { color: Theme.colors.text.secondary }]}>
                    Sign-ups:
                  </Text>
                  <Text style={styles.noteText}>
                    {currentReport.signup_names}
                  </Text>
                </View>
              )}
              {currentReport.helper_names && (
                <View style={styles.noteItem}>
                  <Text style={[styles.noteLabel, { color: Theme.colors.text.secondary }]}>
                    Helpers:
                  </Text>
                  <Text style={styles.noteText}>
                    {currentReport.helper_names}
                  </Text>
                </View>
              )}
              {currentReport.incidents && (
                <View style={styles.noteItem}>
                  <Text style={[styles.noteLabel, { color: Theme.colors.text.secondary }]}>
                    Incidents:
                  </Text>
                  <Text style={styles.noteText}>
                    {currentReport.incidents}
                  </Text>
                </View>
              )}
              {currentReport.general_notes && (
                <View style={styles.noteItem}>
                  <Text style={[styles.noteLabel, { color: Theme.colors.text.secondary }]}>
                    Notes:
                  </Text>
                  <Text style={styles.noteText}>
                    {currentReport.general_notes}
                  </Text>
                </View>
              )}
            </>
          ))}

        <View style={styles.timestampsContainer}>
          <Text style={[styles.timestamp, { color: Theme.colors.text.tertiary }]}>
            Created: {currentReport.created_at ? format(parseISO(currentReport.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}
          </Text>
          <Text style={[styles.timestamp, { color: Theme.colors.text.tertiary }]}>
            Updated: {currentReport.updated_at ? format(parseISO(currentReport.updated_at), 'MMM d, yyyy h:mm a') : 'N/A'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.secondary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxl,
  },
  headerButton: {
    padding: Theme.spacing.sm,
  },
  headerCard: {
    backgroundColor: Theme.colors.primary + '10',
    borderColor: Theme.colors.primary,
    borderWidth: 1,
    marginBottom: Theme.spacing.lg,
    alignItems: 'center',
  },
  clubName: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  date: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    marginBottom: Theme.spacing.xs,
  },
  reportedBy: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
  },
  statsContainer: {
    marginBottom: Theme.spacing.lg,
    padding: Theme.spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.background.secondary,
    padding: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.sm,
    marginBottom: Theme.spacing.sm,
  },
  statRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  statLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.secondary,
  },
  statValue: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
  },
  section: {
    marginBottom: Theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
    marginLeft: Theme.spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  metricLabel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
  },
  metricValue: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
  },
  cashAmount: {
    fontSize: Theme.typography.sizes.xxxl,
    fontFamily: Theme.typography.fonts.bold,
    textAlign: 'center',
    paddingVertical: Theme.spacing.md,
  },
  noteItem: {
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
    color: Theme.colors.text.primary,
    lineHeight: Theme.typography.sizes.sm * 1.5,
  },
  timestampsContainer: {
    marginTop: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border.light,
  },
  timestamp: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    marginBottom: Theme.spacing.xs,
  },
});