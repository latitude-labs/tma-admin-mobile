import React, { useEffect, useMemo } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';

export default function EoDReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentReport, fetchReport, loading } = useEndOfDayStore();
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

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
      <Text style={[styles.metricLabel, { color: palette.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.metricValue, { color: color || palette.textPrimary }]}>
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
      <LinearGradient
        colors={[
          palette.backgroundSecondary,
          palette.background,
          palette.backgroundSecondary,
        ]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Report Details',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={palette.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.headerCard}>
          <LinearGradient
            colors={[`${Theme.colors.primary}15`, `${Theme.colors.primary}08`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerCardGradient}
          >
            <View style={styles.iconBadge}>
              <Ionicons name="document-text" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.clubName}>
              {currentReport.club?.name}
            </Text>
            <Text style={[styles.date, { color: palette.textSecondary }]}>
              {currentReport.report_date ? format(parseISO(currentReport.report_date), 'EEEE, MMMM d, yyyy') : 'No date'}
            </Text>
            {(currentReport.coach || currentReport.user) && (
              <View style={styles.reportedByContainer}>
                <Ionicons name="person-circle-outline" size={16} color={palette.textTertiary} />
                <Text style={[styles.reportedBy, { color: palette.textTertiary }]}>
                  {currentReport.coach?.name || currentReport.user?.name}
                </Text>
              </View>
            )}
          </LinearGradient>
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
                  <Text style={[styles.noteLabel, { color: palette.textSecondary }]}>
                    Sign-ups:
                  </Text>
                  <Text style={styles.noteText}>
                    {currentReport.signup_names}
                  </Text>
                </View>
              )}
              {currentReport.helper_names && (
                <View style={styles.noteItem}>
                  <Text style={[styles.noteLabel, { color: palette.textSecondary }]}>
                    Helpers:
                  </Text>
                  <Text style={styles.noteText}>
                    {currentReport.helper_names}
                  </Text>
                </View>
              )}
              {currentReport.incidents && (
                <View style={styles.noteItem}>
                  <Text style={[styles.noteLabel, { color: palette.textSecondary }]}>
                    Incidents:
                  </Text>
                  <Text style={styles.noteText}>
                    {currentReport.incidents}
                  </Text>
                </View>
              )}
              {currentReport.general_notes && (
                <View style={styles.noteItem}>
                  <Text style={[styles.noteLabel, { color: palette.textSecondary }]}>
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
          <Text style={[styles.timestamp, { color: palette.textTertiary }]}>
            Created: {currentReport.created_at ? format(parseISO(currentReport.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}
          </Text>
          <Text style={[styles.timestamp, { color: palette.textTertiary }]}>
            Updated: {currentReport.updated_at ? format(parseISO(currentReport.updated_at), 'MMM d, yyyy h:mm a') : 'N/A'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
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
    marginBottom: Theme.spacing.lg,
    padding: 0,
    overflow: 'hidden',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 0,
  },
  headerCardGradient: {
    padding: Theme.spacing.xl,
    alignItems: 'center',
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  clubName: {
    fontSize: Theme.typography.sizes['2xl'],
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  date: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  reportedByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Theme.spacing.xs,
  },
  reportedBy: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
  },
  statsContainer: {
    marginBottom: Theme.spacing.lg,
    padding: Theme.spacing.lg,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.backgroundSecondary,
    padding: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: 14,
    marginBottom: Theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  statLabel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
  },
  statValue: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
  },
  section: {
    marginBottom: Theme.spacing.lg,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: `${Theme.colors.primary}20`,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
    marginLeft: Theme.spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  metricLabel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
  },
  metricValue: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
  },
  cashAmount: {
    fontSize: Theme.typography.sizes['3xl'],
    fontFamily: Theme.typography.fonts.bold,
    textAlign: 'center',
    paddingVertical: Theme.spacing.xl,
    letterSpacing: 1,
  },
  noteItem: {
    marginBottom: Theme.spacing.lg,
    backgroundColor: palette.backgroundSecondary,
    padding: Theme.spacing.md,
    borderRadius: 12,
  },
  noteLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.bold,
    marginBottom: Theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textPrimary,
    lineHeight: Theme.typography.sizes.md * 1.6,
  },
  timestampsContainer: {
    marginTop: Theme.spacing.xl,
    paddingTop: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.md,
    borderTopWidth: 2,
    borderTopColor: palette.borderLight,
    borderRadius: 12,
  },
  timestamp: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    marginBottom: Theme.spacing.sm,
    opacity: 0.7,
  },
});