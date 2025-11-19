import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Theme } from '@/constants/Theme';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/store/authStore';
import { useClubStore } from '@/store/clubStore';
import { useEndOfDayStore } from '@/store/endOfDayStore';
import { EndOfDayReport } from '@/types/endOfDay';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  Layout,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';

const AnimatedCard = Animated.createAnimatedComponent(Card);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function EoDReportsScreen() {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
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
  const pulseOpacity = useSharedValue(0.3);

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
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (selectedClub) {
      initializeWizard(selectedClub);
      router.push('/eod-wizard');
    } else {
      Alert.alert('Select Club', 'Please select a club first');
    }
  };

  const handleReportPress = (report: EndOfDayReport) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: '/eod-report-detail',
      params: { id: report.id },
    });
  };

  const ReportItem = React.memo(({ item, index }: { item: EndOfDayReport; index: number }) => {
    const scaleValue = useSharedValue(1);
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

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scaleValue.value }],
    }));

    return (
      <AnimatedPressable
        onPressIn={() => {
          scaleValue.value = withSpring(0.98, {
            damping: 20,
            stiffness: 500,
          });
        }}
        onPressOut={() => {
          scaleValue.value = withSpring(1, {
            damping: 20,
            stiffness: 500,
          });
        }}
        onPress={() => handleReportPress(item)}
        style={animatedStyle}
      >
        <AnimatedCard
          variant="elevated"
          style={[styles.reportCard, isTodayReport && styles.todayCard]}
          entering={FadeInDown.delay(index * 80).duration(400).springify()}
          layout={Layout.springify()}
        >
          {/* Report Header */}
          <View style={styles.reportHeader}>
            <View style={styles.reportHeaderInfo}>
              <View style={styles.dateContainer}>
                <View style={styles.dateIconContainer}>
                  <Ionicons name="calendar" size={20} color={palette.tint} />
                </View>
                <View>
                  <Text style={styles.reportDate}>
                    {format(reportDate, 'EEEE, MMM d')}
                  </Text>
                  <Text style={styles.reportYear}>
                    {format(reportDate, 'yyyy')}
                  </Text>
                </View>
              </View>

              {item.club && (
                <View style={styles.clubInfo}>
                  <View style={styles.clubIconContainer}>
                    <Ionicons name="business" size={14} color={palette.statusInfo} />
                  </View>
                  <Text style={styles.clubName}>{item.club.name}</Text>
                </View>
              )}

              {(item.coach || item.user) && (
                <View style={styles.coachInfo}>
                  <View style={styles.coachIconContainer}>
                    <Ionicons name="person" size={12} color={palette.textSecondary} />
                  </View>
                  <Text style={styles.coachName}>
                    {item.coach?.name || item.user?.name}
                  </Text>
                </View>
              )}
            </View>

            {isTodayReport && (
              <Animated.View
                entering={FadeIn.duration(300)}
                style={styles.todayBadge}
              >
                <Ionicons name="star" size={14} color="#FFF" />
                <Text style={styles.todayText}>TODAY</Text>
              </Animated.View>
            )}
          </View>

          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: `${palette.tint}10` }]}>
              <Ionicons name="people" size={24} color={palette.tint} />
              <Text style={styles.metricValue}>{totalAttendance}</Text>
              <Text style={styles.metricLabel}>Attended</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: `${palette.statusWarning}10` }]}>
              <Ionicons name="star" size={24} color={palette.statusWarning} />
              <Text style={styles.metricValue}>{totalTrials}</Text>
              <Text style={styles.metricLabel}>Trials</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: `${palette.statusSuccess}10` }]}>
              <Ionicons name="person-add" size={24} color={palette.statusSuccess} />
              <Text style={styles.metricValue}>{totalSignups}</Text>
              <Text style={styles.metricLabel}>Sign-ups</Text>
            </View>
          </View>

          {/* Cash Collection */}
          <View style={styles.cashContainer}>
            <View style={styles.cashIconContainer}>
              <Ionicons name="cash" size={18} color={palette.statusSuccess} />
            </View>
            <Text style={styles.cashLabel}>Cash Collected</Text>
            <Text style={styles.cashValue}>£{item.total_cash_taken.toFixed(2)}</Text>
          </View>
        </AnimatedCard>
      </AnimatedPressable>
    );
  });

  const renderClubFilter = () => {
    if (!clubs || clubs.length === 0) return null;

    return (
      <Animated.View
        entering={FadeInDown.delay(100).duration(400).springify()}
        style={styles.filterContainer}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[{ id: null, name: 'All Clubs' }, ...clubs].map((club, index) => (
            <Animated.View
              key={club.id?.toString() || 'all'}
              entering={SlideInRight.delay(index * 50).duration(300).springify()}
            >
              <Chip
                label={club.name}
                selected={selectedClub === club.id}
                onPress={() => {
                  setSelectedClub(club.id);
                  if (Platform.OS === 'ios') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={styles.filterChip}
              />
            </Animated.View>
          ))}
        </ScrollView>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={styles.emptyState}
    >
      <View style={styles.emptyIconContainer}>
        <Ionicons name="document-text-outline" size={64} color={palette.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>No Reports Yet</Text>
      <Text style={styles.emptyText}>
        {isAdmin
          ? 'No end of day reports have been submitted yet.'
          : selectedClub
          ? 'No reports found for this club.'
          : 'Select a club and create your first report.'}
      </Text>
      {!isAdmin && canCreateReport && selectedClub && (
        <Pressable
          style={styles.createButton}
          onPress={handleCreateReport}
        >
          <Ionicons name="add" size={20} color={palette.textInverse} />
          <Text style={styles.createButtonText}>Create Today's Report</Text>
        </Pressable>
      )}
    </Animated.View>
  );

  useEffect(() => {
    if (loading && reports.length === 0) {
      pulseOpacity.value = withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
      );
    }
  }, [loading, reports.length]);

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Loading state
  if (loading && reports.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Animated.View style={loadingAnimatedStyle}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.tint} />
            <Text style={styles.loadingText}>Loading reports...</Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ScreenHeader
          title="End of Day Reports"
          rightAction={
            !isAdmin && canCreateReport && selectedClub ? (
              <AnimatedPressable
                onPress={handleCreateReport}
                style={({ pressed }) => [
                  styles.createHeaderButton,
                  pressed && styles.createHeaderButtonPressed
                ]}
              >
                <Ionicons name="add-circle" size={24} color={palette.textInverse} />
              </AnimatedPressable>
            ) : undefined
          }
        />

      {renderClubFilter()}

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => <ReportItem item={item} index={index} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[palette.tint]}
            tintColor={palette.tint}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          reports.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmptyState()}
        showsVerticalScrollIndicator={false}
      />
      </View>
    </>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.backgroundSecondary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: Theme.spacing['2xl'],
    backgroundColor: palette.background,
    borderRadius: Theme.borderRadius.xl,
    ...Theme.shadows.md,
  },
  loadingText: {
    marginTop: Theme.spacing.lg,
    fontSize: Theme.typography.sizes.md,
    color: palette.textSecondary,
    fontFamily: Theme.typography.fonts.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: 60,
    paddingBottom: Theme.spacing.md,
  },
  headerTitle: {
    fontSize: Theme.typography.sizes['2xl'],
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
  },
  headerSubtitle: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    marginTop: 2,
  },
  createHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    backgroundColor: palette.tint,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    ...Theme.shadows.sm,
  },
  createHeaderButtonPressed: {
    opacity: 0.8,
  },
  createHeaderButtonText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
  },
  filterContainer: {
    paddingVertical: Theme.spacing.md,
    paddingLeft: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  filterChip: {
    marginRight: Theme.spacing.sm,
  },
  listContent: {
    padding: Theme.spacing.lg,
    gap: Theme.spacing.lg,
  },
  emptyListContent: {
    flex: 1,
  },
  reportCard: {
    marginBottom: 0,
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
  },
  todayCard: {
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
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  dateIconContainer: {
    width: 44,
    height: 44,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: `${palette.tint}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportDate: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  reportYear: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
  },
  clubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginBottom: Theme.spacing.xs,
  },
  clubIconContainer: {
    width: 24,
    height: 24,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: `${palette.statusInfo}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clubName: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
  },
  coachInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  coachIconContainer: {
    width: 20,
    height: 20,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: palette.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coachName: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textTertiary,
  },
  todayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    backgroundColor: palette.tint,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    ...Theme.shadows.sm,
  },
  todayText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.bold,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.lg,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
  },
  metricValue: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
    marginTop: Theme.spacing.xs,
  },
  metricLabel: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
    marginTop: 2,
  },
  cashContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${palette.statusSuccess}10`,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    gap: Theme.spacing.md,
  },
  cashIconContainer: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: `${palette.statusSuccess}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cashLabel: {
    flex: 1,
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
  },
  cashValue: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.statusSuccess,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  emptyIconContainer: {
    padding: Theme.spacing.xl,
    backgroundColor: `${palette.textTertiary}10`,
    borderRadius: Theme.borderRadius.full,
    marginBottom: Theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  emptyText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
    marginBottom: Theme.spacing.xl,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: palette.tint,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
    ...Theme.shadows.sm,
  },
  createButtonText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
  },
});
