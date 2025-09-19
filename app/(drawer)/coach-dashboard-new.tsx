import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';

import { SkeletonLoader } from '@/components/SkeletonLoader';
import { Card } from '@/components/ui';
import { Theme } from '@/constants/Theme';
import { useOffline } from '@/hooks/useOffline';
import { bookingsService } from '@/services/api/bookings.service';
import { classTimesService } from '@/services/api/classTimes.service';
import { remindersService } from '@/services/api/reminders.service';
import { offlineStorage } from '@/services/offline/storage';
import { useAuthStore } from '@/store/authStore';
import { useBookingStore } from '@/store/bookingStore';
import { useClubStore } from '@/store/clubStore';
import { useSyncStore } from '@/store/syncStore';
import { Booking, ClassTime } from '@/types/api';
import { RemindersSection } from '@/components/dashboard/RemindersSection';

const { width: screenWidth } = Dimensions.get('window');

interface ClassWithBookings {
  classTime: ClassTime;
  bookings: Booking[];
  pendingBookings: Booking[];
  processedBookings: Booking[];
}

interface DayData {
  date: Date;
  dateString: string;
  dayName: string;
  classes: ClassWithBookings[];
  isLoading: boolean;
  isLoaded: boolean;
}

// Circular Progress Component
const CircularProgress: React.FC<{
  percentage: number;
  size: number;
  strokeWidth: number;
  color: string;
  bgColor?: string;
  children?: React.ReactNode;
}> = ({ percentage, size, strokeWidth, color, bgColor = '#F0F0F0', children }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={{
        position: 'absolute',
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {children}
      </View>
    </View>
  );
};

export default function CoachDashboardScreen() {
  const { user } = useAuthStore();
  const { isOffline } = useOffline();
  const {
    lastSyncTime,
    isSyncing,
    setSyncing,
    setLastSyncTime,
    canSync,
    recordSyncAttempt,
    getRemainingWaitTime
  } = useSyncStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [daysData, setDaysData] = useState<DayData[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([0])); // Today expanded by default

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { bookings, fetchBookings } = useBookingStore();
  const { clubs, fetchClubs } = useClubStore();

  useEffect(() => {
    if (user) {
      initializeDaysData();
      loadReminders();

      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      setIsRefreshing(false);
      setSyncing(false);
    };
  }, [user]);

  useEffect(() => {
    if (!isOffline && daysData.length > 0) {
      syncAllDaysData(undefined, true);
    }
  }, [isOffline]);

  useEffect(() => {
    let animationLoop: Animated.CompositeAnimation | null = null;

    if (isSyncing || isRefreshing) {
      animationLoop = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      animationLoop.start();
    } else {
      rotateAnim.stopAnimation();
      rotateAnim.setValue(0);
    }

    return () => {
      if (animationLoop) {
        animationLoop.stop();
      }
      rotateAnim.stopAnimation();
    };
  }, [isSyncing, isRefreshing]);

  const loadReminders = async () => {
    setRemindersLoading(true);
    try {
      const response = await remindersService.getDashboardReminders();
      setReminders(response.reminders || []);
    } catch (error) {
      console.error('Failed to load reminders:', error);
    } finally {
      setRemindersLoading(false);
    }
  };

  const handleCompleteReminder = async (id: number) => {
    try {
      await remindersService.completeReminder(id);
      loadReminders();
      // Add success animation here
    } catch (error) {
      console.error('Failed to complete reminder:', error);
      Alert.alert('Error', 'Failed to complete reminder');
    }
  };

  const handleSnoozeReminder = async (id: number, snoozeUntil: Date) => {
    try {
      await remindersService.snoozeReminder(id, snoozeUntil);
      loadReminders();
    } catch (error) {
      console.error('Failed to snooze reminder:', error);
      Alert.alert('Error', 'Failed to snooze reminder');
    }
  };

  const handleAddReminder = () => {
    Alert.alert('Coming Soon', 'Add reminder feature will be available soon');
  };

  const handleViewAllReminders = () => {
    Alert.alert('Coming Soon', 'View all reminders will be available soon');
  };

  const initializeDaysData = async () => {
    const days: DayData[] = [];
    const today = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      days.push({
        date,
        dateString: date.toISOString().split('T')[0],
        dayName: dayNames[date.getDay()],
        classes: [],
        isLoading: false,
        isLoaded: false
      });
    }

    setDaysData(days);
    await loadAllDaysFromCache(days);
    syncAllDaysData(days, true);
  };

  const loadAllDaysFromCache = async (days: DayData[]) => {
    try {
      const updatedDays = await Promise.all(
        days.map(async (day) => {
          const cachedData = await offlineStorage.getCoachClasses(day.dateString);
          if (cachedData) {
            return {
              ...day,
              classes: cachedData,
              isLoading: false,
              isLoaded: true
            };
          }
          return day;
        })
      );
      setDaysData(updatedDays);
      setLoading(false);
    } catch (error) {
      console.error('Error loading from cache:', error);
      setLoading(false);
    }
  };

  const syncAllDaysData = async (providedDays?: DayData[], skipSyncState: boolean = false) => {
    if (!skipSyncState) {
      setSyncing(true);
    }

    const days = providedDays || daysData;

    try {
      await Promise.all(days.map((day, index) => loadDayData(index, day)));
    } catch (error) {
      console.error('Error syncing all days:', error);
    } finally {
      if (!skipSyncState) {
        setSyncing(false);
      }
    }
  };

  const loadDayData = async (index: number, dayData: DayData) => {
    if (isOffline) {
      const cachedData = await offlineStorage.getCoachClasses(dayData.dateString);
      if (cachedData) {
        setDaysData(prev => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            classes: cachedData,
            isLoading: false,
            isLoaded: true
          };
          return updated;
        });
      }
      return;
    }

    setDaysData(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isLoading: true };
      return updated;
    });

    try {
      const classTimes = await classTimesService.getClassTimes({
        date_from: dayData.dateString,
        date_to: dayData.dateString
      });

      const classesWithBookings: ClassWithBookings[] = await Promise.all(
        classTimes.map(async (classTime) => {
          try {
            const bookingsData = await bookingsService.getAllBookings({
              class_time_id: classTime.id,
              start_date: dayData.dateString,
              end_date: dayData.dateString
            });

            const activeBookings = bookingsData.filter(booking => !booking.cancelled_at);
            const pendingBookings = activeBookings.filter(b => !b.status || b.status === 'pending');
            const processedBookings = activeBookings.filter(b => b.status && b.status !== 'pending');

            return {
              classTime,
              bookings: activeBookings,
              pendingBookings,
              processedBookings
            };
          } catch (error) {
            console.error('Error fetching bookings for class:', error);
            return {
              classTime,
              bookings: [],
              pendingBookings: [],
              processedBookings: []
            };
          }
        })
      );

      classesWithBookings.sort((a, b) => {
        const timeA = a.classTime.start_time.split(':').map(Number);
        const timeB = b.classTime.start_time.split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });

      await offlineStorage.saveCoachClasses(dayData.dateString, classesWithBookings);

      setDaysData(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          classes: classesWithBookings,
          isLoading: false,
          isLoaded: true
        };
        return updated;
      });

      if (index === 0) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading day data:', error);
      setDaysData(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], isLoading: false };
        return updated;
      });

      if (index === 0) {
        setLoading(false);
        Alert.alert('Error', 'Failed to load classes');
      }
    }
  };

  const handleRefresh = async () => {
    if (isSyncing || isRefreshing) {
      return;
    }

    if (!canSync()) {
      const waitTime = getRemainingWaitTime();
      const seconds = Math.ceil(waitTime / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;

      Alert.alert(
        'Sync Rate Limited',
        `Please wait ${minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`} before syncing again.`,
        [{ text: 'OK' }]
      );
      return;
    }

    recordSyncAttempt();
    setIsRefreshing(true);

    try {
      await Promise.all([
        syncAllDaysData(),
        loadReminders()
      ]);
      setLastSyncTime(Date.now());
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const navigateToClass = (classWithBookings: ClassWithBookings, dayDate: string) => {
    router.push({
      pathname: '/class-bookings',
      params: {
        classTimeId: classWithBookings.classTime.id,
        className: classWithBookings.classTime.name || 'Class',
        clubName: classWithBookings.classTime.club?.name || '',
        startTime: classWithBookings.classTime.start_time,
        endTime: classWithBookings.classTime.end_time || '',
        date: dayDate
      }
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const toggleDayExpansion = (index: number) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getClassStatusColor = (classWithBookings: ClassWithBookings) => {
    const total = classWithBookings.bookings.length;
    if (total === 0) return Theme.colors.text.tertiary;
    if (classWithBookings.pendingBookings.length === 0) return Theme.colors.status.success;
    if (classWithBookings.processedBookings.length === 0) return Theme.colors.status.warning;
    return Theme.colors.status.info;
  };

  const getTotalStats = () => {
    const today = daysData[0];
    if (!today || !today.classes) {
      return { classes: 0, bookings: 0, processed: 0, percentage: 0 };
    }

    const classes = today.classes.length;
    const bookings = today.classes.reduce((sum, c) => sum + c.bookings.length, 0);
    const processed = today.classes.reduce((sum, c) => sum + c.processedBookings.length, 0);
    const percentage = bookings > 0 ? Math.round((processed / bookings) * 100) : 0;

    return { classes, bookings, processed, percentage };
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  const stats = getTotalStats();

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefresh}
            tintColor={Theme.colors.primary}
            colors={[Theme.colors.primary]}
          />
        }
      >
        {/* Friendly Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>
                Hi {user?.name?.split(' ')[0] || 'Coach'} 👋
              </Text>
              <Text style={styles.date}>
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.syncBadge, isOffline && styles.syncBadgeOffline]}
              onPress={handleRefresh}
              disabled={isSyncing || isRefreshing}
            >
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons
                  name={isOffline ? 'cloud-offline' : (isSyncing || isRefreshing) ? 'sync' : 'checkmark-circle'}
                  size={20}
                  color={isOffline ? Theme.colors.status.error : Theme.colors.primary}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reminders Section */}
        <RemindersSection
          reminders={reminders}
          loading={remindersLoading}
          onCompleteReminder={handleCompleteReminder}
          onSnoozeReminder={handleSnoozeReminder}
          onAddReminder={handleAddReminder}
          onViewAll={handleViewAllReminders}
        />

        {/* Today's Overview with Circular Progress */}
        <View style={styles.overviewContainer}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <Card variant="elevated" style={styles.overviewCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <CircularProgress
                  percentage={100}
                  size={60}
                  strokeWidth={6}
                  color={Theme.colors.primary}
                  bgColor={Theme.colors.primary + '20'}
                >
                  <Text style={styles.statNumber}>{stats.classes}</Text>
                </CircularProgress>
                <Text style={styles.statLabel}>Classes</Text>
              </View>

              <View style={styles.statItem}>
                <CircularProgress
                  percentage={stats.bookings > 0 ? 100 : 0}
                  size={60}
                  strokeWidth={6}
                  color={Theme.colors.status.info}
                  bgColor={Theme.colors.status.info + '20'}
                >
                  <Text style={styles.statNumber}>{stats.bookings}</Text>
                </CircularProgress>
                <Text style={styles.statLabel}>Bookings</Text>
              </View>

              <View style={styles.statItem}>
                <CircularProgress
                  percentage={stats.percentage}
                  size={60}
                  strokeWidth={6}
                  color={Theme.colors.status.success}
                  bgColor={Theme.colors.status.success + '20'}
                >
                  <Text style={styles.statNumber}>{stats.percentage}%</Text>
                </CircularProgress>
                <Text style={styles.statLabel}>Complete</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Classes Section - Vertical List */}
        <View style={styles.classesSection}>
          <Text style={styles.sectionTitle}>Your Classes</Text>

          {daysData.map((day, dayIndex) => {
            const isExpanded = expandedDays.has(dayIndex);
            const hasClasses = day.classes.length > 0;
            const totalBookings = day.classes.reduce((sum, c) => sum + c.bookings.length, 0);
            const totalPending = day.classes.reduce((sum, c) => sum + c.pendingBookings.length, 0);

            return (
              <View key={dayIndex} style={styles.daySection}>
                <TouchableOpacity
                  onPress={() => toggleDayExpansion(dayIndex)}
                  style={styles.dayHeader}
                  activeOpacity={0.7}
                >
                  <View style={styles.dayHeaderLeft}>
                    <View style={[
                      styles.dayBadge,
                      dayIndex === 0 && styles.todayBadge
                    ]}>
                      <Text style={[
                        styles.dayBadgeText,
                        dayIndex === 0 && styles.todayBadgeText
                      ]}>
                        {dayIndex === 0 ? 'Today' : day.dayName.slice(0, 3)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.dayDate}>
                        {day.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </Text>
                      {hasClasses && (
                        <Text style={styles.daySummary}>
                          {day.classes.length} classes • {totalBookings} bookings
                          {totalPending > 0 && <Text style={styles.pendingText}> • {totalPending} pending</Text>}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={Theme.colors.text.secondary}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <Animated.View style={styles.dayContent}>
                    {day.isLoading ? (
                      <SkeletonLoader height={80} style={styles.skeleton} />
                    ) : !hasClasses ? (
                      <View style={styles.emptyDay}>
                        <Ionicons name="calendar-outline" size={32} color={Theme.colors.text.tertiary} />
                        <Text style={styles.emptyDayText}>No classes scheduled</Text>
                      </View>
                    ) : (
                      day.classes.map((classWithBookings) => {
                        const statusColor = getClassStatusColor(classWithBookings);
                        const processedPercentage = classWithBookings.bookings.length > 0
                          ? Math.round((classWithBookings.processedBookings.length / classWithBookings.bookings.length) * 100)
                          : 0;

                        return (
                          <TouchableOpacity
                            key={classWithBookings.classTime.id}
                            onPress={() => navigateToClass(classWithBookings, day.dateString)}
                            activeOpacity={0.7}
                            style={styles.classCardWrapper}
                          >
                            <View style={[styles.classCard, { borderLeftColor: statusColor }]}>
                              <View style={styles.classHeader}>
                                <View style={styles.timeBadge}>
                                  <Text style={styles.timeBadgeText}>
                                    {formatTime(classWithBookings.classTime.start_time)}
                                  </Text>
                                </View>
                                <View style={styles.classStats}>
                                  <View style={[styles.statDot, { backgroundColor: Theme.colors.status.warning }]} />
                                  <Text style={styles.statText}>{classWithBookings.pendingBookings.length}</Text>
                                  <View style={[styles.statDot, { backgroundColor: Theme.colors.status.success }]} />
                                  <Text style={styles.statText}>{classWithBookings.processedBookings.length}</Text>
                                </View>
                              </View>

                              <Text style={styles.className}>
                                {classWithBookings.classTime.name || 'Class'}
                              </Text>

                              <View style={styles.classFooter}>
                                <View style={styles.locationRow}>
                                  <Ionicons name="location" size={14} color={Theme.colors.text.tertiary} />
                                  <Text style={styles.locationText}>
                                    {classWithBookings.classTime.club?.name || 'Club'}
                                  </Text>
                                </View>

                                {classWithBookings.bookings.length > 0 && (
                                  <View style={styles.progressContainer}>
                                    <View style={styles.progressBar}>
                                      <View
                                        style={[
                                          styles.progressFill,
                                          {
                                            width: `${processedPercentage}%`,
                                            backgroundColor: statusColor
                                          }
                                        ]}
                                      />
                                    </View>
                                  </View>
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </Animated.View>
                )}
              </View>
            );
          })}
        </View>

        {/* Floating Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryAction]}
            onPress={() => router.push('/eod-wizard')}
            activeOpacity={0.8}
          >
            <View style={styles.actionGradient}>
              <Ionicons name="document-text" size={28} color="#fff" />
              <Text style={styles.actionLabel}>EOD Report</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryAction]}
            onPress={() => router.push('/clubs')}
            activeOpacity={0.8}
          >
            <View style={styles.actionGradient}>
              <Ionicons name="business" size={28} color="#fff" />
              <Text style={styles.actionLabel}>All Clubs</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.text.secondary,
    fontFamily: Theme.typography.fonts.medium,
    marginTop: Theme.spacing.md,
  },

  // Header Styles
  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 28,
    fontFamily: Theme.typography.fonts.bold,
    color: Theme.colors.text.primary,
    marginBottom: 4,
  },
  date: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.secondary,
  },
  syncBadge: {
    backgroundColor: Theme.colors.primary + '15',
    padding: 10,
    borderRadius: 20,
  },
  syncBadgeOffline: {
    backgroundColor: Theme.colors.status.error + '15',
  },

  // Overview Styles
  overviewContainer: {
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.md,
  },
  overviewCard: {
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: '#FFFFFF',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Theme.spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    color: Theme.colors.text.primary,
  },
  statLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.secondary,
    marginTop: Theme.spacing.sm,
  },

  // Classes Section Styles
  classesSection: {
    paddingHorizontal: Theme.spacing.lg,
  },
  daySection: {
    marginBottom: Theme.spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayBadge: {
    backgroundColor: Theme.colors.background.secondary,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    marginRight: Theme.spacing.md,
    minWidth: 60,
    alignItems: 'center',
  },
  todayBadge: {
    backgroundColor: Theme.colors.primary,
  },
  dayBadgeText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.secondary,
  },
  todayBadgeText: {
    color: '#FFFFFF',
  },
  dayDate: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
  },
  daySummary: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
    marginTop: 2,
  },
  pendingText: {
    color: Theme.colors.status.warning,
    fontFamily: Theme.typography.fonts.medium,
  },
  dayContent: {
    paddingLeft: Theme.spacing.lg,
  },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
    backgroundColor: Theme.colors.background.secondary,
    borderRadius: Theme.borderRadius.lg,
    marginBottom: Theme.spacing.sm,
  },
  emptyDayText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.tertiary,
    marginTop: Theme.spacing.sm,
  },
  skeleton: {
    marginBottom: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
  },

  // Class Card Styles
  classCardWrapper: {
    marginBottom: Theme.spacing.sm,
  },
  classCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  timeBadge: {
    backgroundColor: Theme.colors.primary + '15',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
  },
  timeBadgeText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.primary,
  },
  classStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
  },
  className: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.sm,
  },
  classFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.tertiary,
  },
  progressContainer: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  progressBar: {
    height: 4,
    backgroundColor: Theme.colors.background.secondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Quick Actions Styles
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.xl,
  },
  actionButton: {
    flex: 1,
    maxWidth: 150,
  },
  actionGradient: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.xl,
    paddingVertical: Theme.spacing.lg,
    alignItems: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryAction: {
    // Custom styles for primary action
  },
  secondaryAction: {
    // Custom styles for secondary action
  },
  actionLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    color: '#FFFFFF',
    marginTop: Theme.spacing.xs,
  },
});