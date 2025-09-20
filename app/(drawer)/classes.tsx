import React, { useState, useEffect, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Platform
} from 'react-native';
import { Card, Badge, Chip } from '@/components/ui';
import { Theme } from '@/constants/Theme';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import { classTimesService } from '@/services/api/classTimes.service';
import { ClassTime } from '@/types/api';
import { format } from 'date-fns';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  FadeIn,
  FadeInDown,
  FadeInUp,
  Layout,
  Easing
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedCard = Animated.createAnimatedComponent(Card);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ClassesScreen() {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [classTimes, setClassTimes] = useState<ClassTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date();
  const currentDay = format(today, 'EEEE');
  const formattedDate = format(today, 'EEEE, MMM d');

  const fetchClassTimes = async (isRefreshing = false) => {
    try {
      setError(null);
      if (!isRefreshing) setLoading(true);
      const data = await classTimesService.getTodaysClassTimes();
      console.log('Fetched class times data:', data);
      console.log('Today is:', currentDay);
      console.log('Raw date:', today);
      setClassTimes(data);
    } catch (error) {
      console.error('Error fetching class times:', error);
      setError('Unable to load classes. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClassTimes();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClassTimes(true);
  };

  const pulseOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (loading) {
      pulseOpacity.value = withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
      );
    }
  }, [loading]);

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Filter and sort classes for current day
  // Handle both lowercase and capitalized day names
  const todaysClasses = classTimes.filter(cls =>
    cls.day.toLowerCase() === currentDay.toLowerCase()
  );
  console.log('All classes:', classTimes);
  console.log('Filtered classes for', currentDay, ':', todaysClasses);
  const sortedClasses = [...todaysClasses].sort((a, b) => {
    const timeA = parseInt(a.start_time.replace(/:/g, ''));
    const timeB = parseInt(b.start_time.replace(/:/g, ''));
    return timeA - timeB;
  });

  // Calculate stats with animation values
  const kidsClasses = todaysClasses.filter(c => c.name?.toLowerCase().includes('kids'));
  const adultsClasses = todaysClasses.filter(c => c.name?.toLowerCase().includes('adult'));
  const totalBookings = todaysClasses.reduce((sum, c) => sum + (c.todays_booking_count || 0), 0);

  // Loading state with animation
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Animated.View style={loadingAnimatedStyle}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.tint} />
            <Text style={styles.loadingText}>Loading today's classes...</Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Animated.View
          entering={FadeIn.duration(400)}
          style={styles.errorContainer}
        >
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={56} color={palette.statusError} />
          </View>
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              fetchClassTimes();
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[palette.tint]}
          tintColor={palette.tint}
        />
      }
    >
      <View style={styles.content}>
        {/* Header with date and badge */}
        <Animated.View
          entering={FadeInDown.duration(400).springify()}
          style={styles.header}
        >
          <View>
            <Text style={styles.dateTitle}>{formattedDate}</Text>
            <Text style={styles.subtitle}>Daily Schedule Overview</Text>
          </View>
          <View style={styles.classCountBadge}>
            <Ionicons name="calendar" size={18} color={palette.textInverse} />
            <Text style={styles.classCountText}>{todaysClasses.length}</Text>
          </View>
        </Animated.View>

        {/* Stats Cards with animations - Stacked Layout */}
        <View style={styles.statsStack}>
          {[
            { label: 'Kids Classes', value: kidsClasses.length, icon: 'happy', color: palette.statusWarning },
            { label: 'Adult Classes', value: adultsClasses.length, icon: 'fitness', color: palette.statusInfo },
            { label: 'Total Bookings', value: totalBookings, icon: 'people', color: palette.tint },
          ].map((stat, index) => (
            <Animated.View
              key={stat.label}
              entering={FadeInUp.delay(index * 100).duration(400).springify()}
              style={styles.statRowWrapper}
            >
              <Pressable
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={({ pressed }) => [
                  styles.statRow,
                  pressed && styles.statRowPressed
                ]}
              >
                <View style={styles.statRowLeft}>
                  <View style={[styles.statRowIcon, { backgroundColor: `${stat.color}15` }]}>
                    <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                  </View>
                  <Text style={styles.statRowLabel}>{stat.label}</Text>
                </View>
                <Text style={[styles.statRowValue, { color: stat.color }]}>{stat.value}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {sortedClasses.length > 0 && (
          <>
            <Animated.View
              entering={FadeIn.delay(300).duration(400)}
              style={styles.sectionHeader}
            >
              <View style={styles.sectionIconContainer}>
                <Ionicons name="time" size={20} color={palette.tint} />
              </View>
              <Text style={styles.sectionTitle}>Today's Schedule</Text>
            </Animated.View>

            <View style={styles.classesContainer}>
              {sortedClasses.map((cls, index) => {
                const isKidsClass = cls.name?.toLowerCase().includes('kids');
                const isAdultsClass = cls.name?.toLowerCase().includes('adult');

                return (
                  <AnimatedPressable
                    key={cls.id}
                    onPress={() => {
                      if (Platform.OS === 'ios') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                  >
                    <AnimatedCard
                      variant="elevated"
                      style={styles.classCard}
                      entering={FadeInDown.delay(index * 80).duration(400).springify()}
                      layout={Layout.springify()}
                    >
                      <View style={styles.classContent}>
                        {/* Time Block */}
                        <View style={styles.timeBlock}>
                          <View style={styles.timeContainer}>
                            <Text style={styles.startTime}>{cls.start_time.slice(0, 5)}</Text>
                            {cls.end_time && (
                              <Text style={styles.endTime}>{cls.end_time.slice(0, 5)}</Text>
                            )}
                          </View>
                        </View>

                        {/* Class Information */}
                        <View style={styles.classInfo}>
                          <View style={styles.classHeader}>
                            <Text style={styles.className}>{cls.name || 'Class'}</Text>
                            {(isKidsClass || isAdultsClass) && (
                              <Badge
                                variant={isKidsClass ? 'warning' : 'info'}
                                size="sm"
                                style={styles.typeBadge}
                              >
                                {isKidsClass ? 'Kids' : 'Adults'}
                              </Badge>
                            )}
                          </View>

                          {/* Club and Coaches */}
                          <View style={styles.classMetadata}>
                            {cls.club && (
                              <View style={styles.metaItem}>
                                <View style={styles.metaIconContainer}>
                                  <Ionicons name="business" size={12} color={palette.tint} />
                                </View>
                                <Text style={styles.metaText}>{cls.club.name}</Text>
                              </View>
                            )}
                            {cls.coaches && (
                              <View style={styles.metaItem}>
                                <View style={styles.metaIconContainer}>
                                  <Ionicons name="person" size={12} color={palette.statusInfo} />
                                </View>
                                <Text style={styles.metaText} numberOfLines={1}>{cls.coaches}</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Bookings Count */}
                        <View style={styles.bookingSection}>
                          <View style={styles.bookingContainer}>
                            <Text style={styles.bookingNumber}>{cls.todays_booking_count || 0}</Text>
                            <Text style={styles.bookingLabel}>booked</Text>
                          </View>
                        </View>
                      </View>
                    </AnimatedCard>
                  </AnimatedPressable>
                );
              })}
            </View>
          </>
        )}

        {/* Empty State */}
        {sortedClasses.length === 0 && (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.emptyState}
          >
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar-outline" size={64} color={palette.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No classes today</Text>
            <Text style={styles.emptyMessage}>Enjoy your rest day! Classes will resume tomorrow.</Text>
          </Animated.View>
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.backgroundSecondary,
  },
  scrollContent: {
    flexGrow: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
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
  errorContainer: {
    alignItems: 'center',
    padding: Theme.spacing['2xl'],
    backgroundColor: palette.background,
    borderRadius: Theme.borderRadius.xl,
    ...Theme.shadows.md,
    maxWidth: 320,
  },
  errorIconContainer: {
    padding: Theme.spacing.lg,
    backgroundColor: `${palette.statusError}15`,
    borderRadius: Theme.borderRadius.full,
    marginBottom: Theme.spacing.lg,
  },
  errorTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  errorMessage: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: palette.tint,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
    ...Theme.shadows.sm,
  },
  retryButtonText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
  },
  content: {
    padding: Theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
    paddingBottom: Theme.spacing.md,
  },
  dateTitle: {
    fontSize: Theme.typography.sizes['2xl'],
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  subtitle: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
  },
  classCountBadge: {
    backgroundColor: palette.tint,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    ...Theme.shadows.sm,
  },
  classCountText: {
    color: palette.textInverse,
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
  },
  statsStack: {
    marginBottom: Theme.spacing.xl,
  },
  statRowWrapper: {
    marginBottom: Theme.spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: palette.background,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    ...Theme.shadows.sm,
  },
  statRowPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  statRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statRowIcon: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  statRowLabel: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
  },
  statRowValue: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: `${palette.tint}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  classesContainer: {
    gap: Theme.spacing.md,
  },
  classCard: {
    marginBottom: 0,
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
  },
  classContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBlock: {
    paddingRight: Theme.spacing.lg,
    marginRight: Theme.spacing.lg,
    borderRightWidth: 2,
    borderRightColor: `${palette.tint}30`,
  },
  timeContainer: {
    alignItems: 'center',
    minWidth: 60,
  },
  startTime: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.tint,
  },
  endTime: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textTertiary,
    marginTop: 2,
  },
  classInfo: {
    flex: 1,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  className: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
    flex: 1,
  },
  typeBadge: {
    marginLeft: 'auto',
  },
  classMetadata: {
    gap: Theme.spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  metaIconContainer: {
    width: 20,
    height: 20,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: palette.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    flex: 1,
  },
  bookingSection: {
    paddingLeft: Theme.spacing.lg,
    alignItems: 'center',
  },
  bookingContainer: {
    backgroundColor: `${palette.tint}10`,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    minWidth: 60,
  },
  bookingNumber: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.tint,
  },
  bookingLabel: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.tint,
    opacity: 0.8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Theme.spacing['3xl'],
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
  emptyMessage: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
});
