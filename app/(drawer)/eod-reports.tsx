import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useEndOfDayStore } from '@/store/endOfDayStore';
import { useClubStore } from '@/store/clubStore';
import { Theme } from '@/constants/Theme';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { EndOfDayReport } from '@/types/endOfDay';
import { router } from 'expo-router';
import { format, parseISO, isToday } from 'date-fns';

export default function EoDReportsScreen() {
  const { user } = useAuthStore();
  const { clubs } = useClubStore();
  const {
    reports,
    loading,
    fetchReports,
    checkReportExists,
    initializeWizard,
  } = useEndOfDayStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedClub, setSelectedClub] = useState<number | null>(null);
  const [canCreateReport, setCanCreateReport] = useState(false);

  const isAdmin = user?.is_admin ?? false;

  // Load reports on mount and when filters change
  useEffect(() => {
    loadReports();
  }, [selectedClub]);

  // Check if user can create a report today
  useEffect(() => {
    if (!isAdmin && selectedClub) {
      checkTodayReportStatus();
    }
  }, [selectedClub, isAdmin, reports]);

  const loadReports = async () => {
    const filters: any = {};
    if (!isAdmin && user?.id) {
      filters.user_id = user.id;
    }
    if (selectedClub) {
      filters.club_id = selectedClub;
    }
    await fetchReports(filters);
  };

  const checkTodayReportStatus = async () => {
    if (!selectedClub) {
      setCanCreateReport(false);
      return;
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const exists = await checkReportExists(selectedClub, today);
    setCanCreateReport(!exists);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReports();
    if (!isAdmin && selectedClub) {
      await checkTodayReportStatus();
    }
    setRefreshing(false);
  }, [selectedClub, isAdmin]);

  const handleCreateReport = () => {
    if (selectedClub) {
      initializeWizard(selectedClub);
      router.push('/eod-wizard');
    } else {
      Alert.alert('Select Club', 'Please select a club first');
    }
  };

  const handleReportPress = (report: EndOfDayReport) => {
    router.push({
      pathname: '/eod-report-detail',
      params: { id: report.id },
    });
  };

  const renderReportItem = ({ item }: { item: EndOfDayReport }) => {
    const reportDate = parseISO(item.report_date);
    const isTodayReport = isToday(reportDate);
    const totalAttendance = item.kids_1_count + item.kids_2_count + item.adults_count;
    const totalTrials = item.kids_1_trials + item.kids_2_trials + item.adults_trials;
    const totalSignups = item.new_kids_paid_kit_and_signed_dd_count +
      item.new_kids_signed_dd_no_kit_count +
      item.new_adults_paid_kit_and_signed_dd_count +
      item.new_adults_signed_dd_no_kit_count +
      item.returning_kids_paid_kit_and_signed_dd_count +
      item.returning_kids_signed_dd_no_kit_count +
      item.returning_adults_paid_kit_and_signed_dd_count +
      item.returning_adults_signed_dd_no_kit_count;

    return (
      <TouchableOpacity onPress={() => handleReportPress(item)} activeOpacity={0.7}>
        <Card variant="elevated" style={[styles.reportCard, isTodayReport && styles.todayCard]}>
          <View style={styles.reportHeader}>
            <View style={styles.reportHeaderInfo}>
              <Text style={styles.reportDate}>
                {format(reportDate, 'EEEE, MMM d, yyyy')}
              </Text>
              {item.club && (
                <Text style={styles.clubName}>
                  {item.club.name}
                </Text>
              )}
              {(item.coach || item.user) && (
                <View style={styles.coachInfo}>
                  <Ionicons name="person-circle-outline" size={14} color={Theme.colors.text.secondary} />
                  <Text style={styles.coachName}>
                    {item.coach?.name || item.user?.name}
                  </Text>
                </View>
              )}
            </View>
            {isTodayReport && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayText}>TODAY</Text>
              </View>
            )}
          </View>

          <View style={styles.metricsContainer}>
            <View style={styles.metricRow}>
              <Ionicons name="people-outline" size={18} color={Theme.colors.primary} />
              <Text style={styles.metricLabel}>Attendance:</Text>
              <Text style={styles.metricValue}>
                {totalAttendance}
              </Text>
            </View>

            <View style={styles.metricRow}>
              <Ionicons name="star-outline" size={18} color={Theme.colors.status.warning} />
              <Text style={styles.metricLabel}>Trials:</Text>
              <Text style={styles.metricValue}>
                {totalTrials}
              </Text>
            </View>

            <View style={styles.metricRow}>
              <Ionicons name="person-add-outline" size={18} color={Theme.colors.status.success} />
              <Text style={styles.metricLabel}>Sign-ups:</Text>
              <Text style={styles.metricValue}>
                {totalSignups}
              </Text>
            </View>

            <View style={styles.metricRow}>
              <Ionicons name="cash-outline" size={18} color={Theme.colors.status.success} />
              <Text style={styles.metricLabel}>Cash Collected:</Text>
              <Text style={[styles.metricValue, { color: Theme.colors.status.success }]}>
                £{item.total_cash_taken.toFixed(2)}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderClubFilter = () => {
    if (!clubs || clubs.length === 0) return null;

    return (
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: null, name: 'All Clubs' }, ...clubs]}
          keyExtractor={(item) => item.id?.toString() || 'all'}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedClub(item.id)}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    selectedClub === item.id
                      ? Theme.colors.primary
                      : Theme.colors.secondary.light,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      selectedClub === item.id
                        ? Theme.colors.text.inverse
                        : Theme.colors.text.primary,
                  },
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="document-text-outline"
        size={64}
        color={Theme.colors.text.secondary}
      />
      <Text style={styles.emptyStateTitle}>
        No Reports Yet
      </Text>
      <Text style={[styles.emptyStateText, { color: Theme.colors.text.secondary }]}>
        {isAdmin
          ? 'No end of day reports have been submitted yet.'
          : selectedClub
          ? 'No reports found for this club.'
          : 'Select a club and create your first report.'}
      </Text>
      {!isAdmin && canCreateReport && selectedClub && (
        <Button
          variant="primary"
          onPress={handleCreateReport}
          style={{ marginTop: Theme.spacing.lg }}
        >
          Create Today's Report
        </Button>
      )}
    </View>
  );

  if (loading && reports.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isAdmin && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            My End of Day Reports
          </Text>
          {canCreateReport && selectedClub && (
            <Button variant="primary" size="sm" onPress={handleCreateReport}>
              <Ionicons name="add" size={20} color={Theme.colors.text.inverse} />
              Create Report
            </Button>
          )}
        </View>
      )}

      {renderClubFilter()}

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderReportItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Theme.colors.primary]}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          reports.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmptyState()}
      />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
  },
  headerTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: Theme.colors.text.primary,
  },
  filterContainer: {
    paddingVertical: Theme.spacing.sm,
    paddingLeft: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  filterChip: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    marginRight: Theme.spacing.sm,
  },
  filterChipText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
  },
  listContent: {
    padding: Theme.spacing.lg,
  },
  emptyListContent: {
    flex: 1,
  },
  reportCard: {
    marginBottom: Theme.spacing.lg,
  },
  todayCard: {
    borderColor: Theme.colors.primary,
    borderWidth: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.lg,
  },
  reportHeaderInfo: {
    flex: 1,
  },
  reportDate: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  clubName: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.secondary,
    marginBottom: Theme.spacing.xs,
  },
  coachInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  coachName: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
  },
  todayBadge: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.sm,
  },
  todayText: {
    color: Theme.colors.text.inverse,
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.bold,
  },
  metricsContainer: {
    gap: Theme.spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background.secondary,
    padding: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.sm,
    gap: Theme.spacing.sm,
  },
  metricLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.secondary,
    flex: 1,
  },
  metricValue: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  emptyStateTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  emptyStateText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    textAlign: 'center',
    lineHeight: Theme.typography.sizes.md * 1.5,
  },
});