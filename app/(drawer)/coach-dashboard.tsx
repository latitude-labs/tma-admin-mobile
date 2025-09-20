import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import Svg, { Circle } from 'react-native-svg';

import { RemindersSection } from '@/components/dashboard/RemindersSection';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { Card } from '@/components/ui';
import { Theme } from '@/constants/Theme';
import { useOffline } from '@/hooks/useOffline';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { bookingsService } from '@/services/api/bookings.service';
import { classTimesService } from '@/services/api/classTimes.service';
import { remindersService } from '@/services/api/reminders.service';
import { offlineStorage } from '@/services/offline/storage';
import { useAuthStore } from '@/store/authStore';
import { useBookingStore } from '@/store/bookingStore';
import { useClubStore } from '@/store/clubStore';
import { useSyncStore } from '@/store/syncStore';
import { Booking, ClassTime } from '@/types/api';

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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set()); // All days collapsed by default
  const [showAllDays, setShowAllDays] = useState(false); // Show only 3 days by default
  const [currentTime, setCurrentTime] = useState(Date.now());

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

  // Track last update timestamp to detect booking changes
  const [lastBookingUpdate, setLastBookingUpdate] = useState<number>(Date.now());

  // Refresh dashboard when returning from booking screens
  useEffect(() => {
    const unsubscribe = useBookingStore.subscribe(
      (state) => state.bookings,
      () => {
        // When bookings change, refresh today's data
        setLastBookingUpdate(Date.now());
      }
    );
    return unsubscribe;
  }, []);

  // Refresh today's data when bookings are updated
  useEffect(() => {
    if (lastBookingUpdate && daysData.some(d => d.isLoaded)) {
      // Refresh today's data
      const todayIndex = daysData.findIndex(d => d.dateString === new Date().toISOString().split('T')[0]);
      if (todayIndex !== -1 && daysData[todayIndex].isLoaded && !daysData[todayIndex].isLoading) {
        loadDayData(daysData[todayIndex], todayIndex);
      }
    }
  }, [lastBookingUpdate]);

  // Update current time every minute for sync time display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

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
    router.push('/reminders');
  };

  const handleViewAllReminders = () => {
    router.push('/reminders');
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

      // Filter classes to only include those for this specific day
      const dayOfWeek = dayData.dayName;
      const filteredClassTimes = classTimes.filter(classTime => {
        // Check if the class's day matches the current day
        const classDay = classTime.day;
        return classDay && classDay.toLowerCase() === dayOfWeek.toLowerCase();
      })

      const classesWithBookings: ClassWithBookings[] = await Promise.all(
        filteredClassTimes.map(async (classTime) => {
          try {
            const bookingsData = await bookingsService.getAllBookings({
              class_time_id: classTime.id,
              start_date: dayData.dateString,
              end_date: dayData.dateString
            });

            const activeBookings = bookingsData.filter(booking => !booking.cancelled_at);
            // Pending = no conversion status or pending status, AND not marked as no-show or completed
            const pendingBookings = activeBookings.filter(b => {
              const hasConversionStatus = b.status && b.status !== 'pending';
              const hasAttendanceStatus = b.attendance_status === 'no-show' || b.attendance_status === 'completed' || b.checked_in_at || b.no_show;
              return !hasConversionStatus && !hasAttendanceStatus;
            });
            // Processed = has conversion status (not pending) OR marked as no-show/completed
            const processedBookings = activeBookings.filter(b => {
              const hasConversionStatus = b.status && b.status !== 'pending';
              const hasAttendanceStatus = b.attendance_status === 'no-show' || b.attendance_status === 'completed' || b.checked_in_at || b.no_show;
              return hasConversionStatus || hasAttendanceStatus;
            });

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

  const getLastSyncText = () => {
    if (!lastSyncTime) return '';

    const diff = currentTime - lastSyncTime;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (diff < 60000) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
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
    if (total === 0) return colors.textTertiary;
    if (classWithBookings.pendingBookings.length === 0) return colors.statusSuccess;
    if (classWithBookings.processedBookings.length === 0) return colors.statusWarning;
    return colors.statusInfo;
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
        <ActivityIndicator size="large" color={colors.tint} />
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
      >
        {/* Friendly Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingEmoji}>
                {new Date().getHours() < 12 ? '☀️' : new Date().getHours() < 18 ? '🌤️' : '🌙'}
              </Text>
              <View>
                <Text style={styles.greeting}>
                  Hi {user?.name?.split(' ')[0] || 'Coach'} 👋
                </Text>
                <Text style={styles.greetingSubtext}>
                  {stats.classes > 0 ? `${stats.classes} classes today!` : 'No classes today'} · {new Date().toLocaleDateString('en-GB', { weekday: 'long' })}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.syncBadge, isOffline && styles.syncBadgeOffline]}
              onPress={handleRefresh}
              disabled={isSyncing || isRefreshing}
            >
              <View style={styles.syncBadgeContent}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons
                    name={isOffline ? 'cloud-offline' : (isSyncing || isRefreshing) ? 'sync' : 'checkmark-circle'}
                    size={20}
                    color={isOffline ? colors.statusError : colors.tint}
                  />
                </Animated.View>
                {lastSyncTime && !isSyncing && !isRefreshing && (
                  <Text style={[styles.syncTimeText, isOffline && styles.syncTimeTextOffline]}>
                    {getLastSyncText()}
                  </Text>
                )}
              </View>
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

        {/* Today's Overview with Circular Progress - Moved after Classes */}
        <View style={styles.overviewContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Metrics</Text>
            {stats.percentage === 100 && <Text style={styles.celebrateEmoji}>🎉</Text>}
          </View>
          <Card variant="elevated" style={styles.overviewCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <CircularProgress
                  percentage={stats.classes > 0 ? Math.min(100, stats.classes * 20) : 0}
                  size={70}
                  strokeWidth={7}
                  color={colors.tint}
                  bgColor={`${colors.tint}15`}
                >
                  <View style={styles.statContent}>
                    <Text style={styles.statNumber}>{stats.classes}</Text>
                  </View>
                </CircularProgress>
                <Text style={styles.statLabel}>Classes</Text>
              </View>

              <View style={styles.statItem}>
                <CircularProgress
                  percentage={stats.bookings > 0 ? Math.min(100, (stats.bookings / 30) * 100) : 0}
                  size={70}
                  strokeWidth={7}
                  color={colors.statusInfo}
                  bgColor={`${colors.statusInfo}15`}
                >
                  <View style={styles.statContent}>
                    <Text style={styles.statNumber}>{stats.bookings}</Text>
                  </View>
                </CircularProgress>
                <Text style={styles.statLabel}>Trials</Text>
              </View>

              <View style={styles.statItem}>
                <CircularProgress
                  percentage={stats.percentage}
                  size={70}
                  strokeWidth={7}
                  color={
                    stats.percentage === 100 ? colors.statusSuccess :
                    stats.percentage >= 75 ? colors.statusWarning :
                    colors.statusInfo
                  }
                  bgColor={
                    stats.percentage === 100 ? `${colors.statusSuccess}15` :
                    stats.percentage >= 75 ? `${colors.statusWarning}15` :
                    `${colors.statusInfo}15`
                  }
                >
                  <View style={styles.statContent}>
                    <Text style={styles.statNumber}>{stats.percentage}%</Text>
                  </View>
                </CircularProgress>
                <Text style={styles.statLabel}>Complete</Text>
              </View>
            </View>

            {stats.percentage === 100 && (
              <View style={styles.completionBadge}>
                <Text style={styles.completionText}>🏆 All classes processed!</Text>
              </View>
            )}
          </Card>
        </View>

        {/* Classes Section - Moved before stats */}
        <View style={styles.classesSection}>
          <View style={styles.sectionHeaderWithAction}>
            <Text style={styles.sectionTitle}>Your Classes</Text>
            {!showAllDays && (
              <TouchableOpacity
                onPress={() => setShowAllDays(true)}
                style={styles.viewMoreButton}
                activeOpacity={0.7}
              >
                <Text style={styles.viewMoreText}>View week</Text>
                <Ionicons name="chevron-down" size={16} color={colors.tint} />
              </TouchableOpacity>
            )}
          </View>

          {daysData.slice(0, showAllDays ? 7 : 3).map((day, dayIndex) => {
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
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <Animated.View style={styles.dayContent}>
                    {day.isLoading ? (
                      <SkeletonLoader height={80} style={styles.skeleton} />
                    ) : !hasClasses ? (
                      <View style={styles.emptyDay}>
                        <Ionicons name="calendar-outline" size={32} color={colors.textTertiary} />
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
                                  <View style={[styles.statDot, { backgroundColor: colors.statusWarning }]} />
                                  <Text style={styles.statText}>{classWithBookings.pendingBookings.length}</Text>
                                  <View style={[styles.statDot, { backgroundColor: colors.statusSuccess }]} />
                                  <Text style={styles.statText}>{classWithBookings.processedBookings.length}</Text>
                                </View>
                              </View>

                              <Text style={styles.className}>
                                {classWithBookings.classTime.name || 'Class'}
                              </Text>

                              <View style={styles.classFooter}>
                                <View style={styles.locationRow}>
                                  <Ionicons name="location" size={14} color={colors.textTertiary} />
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
                                        ]}>
                                      </View>
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

          {showAllDays && daysData.length > 3 && (
            <TouchableOpacity
              onPress={() => {
                setShowAllDays(false);
                setExpandedDays(new Set()); // Collapse all days
              }}
              style={styles.collapseButton}
              activeOpacity={0.7}
            >
              <Text style={styles.collapseText}>Show less</Text>
              <Ionicons name="chevron-up" size={16} color={colors.tint} />
            </TouchableOpacity>
          )}
        </View>
        <View style={{ height: 150 }} />
      </ScrollView>

      {/* Floating Action Buttons */}
      <View style={styles.floatingActions}>
        <TouchableOpacity
          style={[styles.fab, styles.fabSecondary]}
          onPress={() => router.push('/clubs')}
          activeOpacity={0.9}
        >
          <Ionicons name="business" size={22} color={colors.tint} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fab, styles.fabPrimary]}
          onPress={() => router.push('/eod-wizard')}
          activeOpacity={0.9}
        >
          <View style={styles.fabContent}>
            <Ionicons name="document-text" size={26} color="#fff" />
            <Text style={styles.fabLabel}>EOD</Text>
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const createStyles = (palette: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.backgroundSecondary,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.backgroundSecondary,
  },
  loadingText: {
    fontSize: Theme.typography.sizes.md,
    color: palette.textSecondary,
    fontFamily: Theme.typography.fonts.medium,
    marginTop: Theme.spacing.md,
  },

  // Header Styles
  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.lg,
    backgroundColor: palette.background,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: Theme.spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  greetingEmoji: {
    fontSize: 32,
  },
  greeting: {
    fontSize: 24,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
  },
  greetingSubtext: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
    marginTop: 2,
  },
  date: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
  },
  syncBadge: {
    backgroundColor: palette.tint + '10',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.tint + '20',
  },
  syncBadgeOffline: {
    backgroundColor: palette.statusError + '10',
    borderColor: palette.statusError + '20',
  },
  syncBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncTimeText: {
    fontSize: 12,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.tint,
  },
  syncTimeTextOffline: {
    color: palette.statusError,
  },

  // Overview Styles
  overviewContainer: {
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  celebrateEmoji: {
    fontSize: 24,
  },
  overviewCard: {
    borderRadius: 16,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Theme.spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textPrimary,
    lineHeight: Theme.typography.sizes.xl,
  },
  statLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textSecondary,
    marginTop: Theme.spacing.sm,
  },
  completionBadge: {
    backgroundColor: palette.statusSuccess + '10',
    paddingVertical: 10,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: 12,
    marginTop: Theme.spacing.md,
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.statusSuccess + '20',
  },
  completionText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.statusSuccess,
  },

  // Classes Section Styles
  classesSection: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    backgroundColor: palette.tint + '10',
    borderRadius: Theme.borderRadius.full,
  },
  viewMoreText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.tint,
  },
  collapseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
  },
  collapseText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.tint,
  },
  daySection: {
    marginBottom: Theme.spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    paddingBottom: Theme.spacing.md,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayBadge: {
    backgroundColor: palette.backgroundSecondary,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: Theme.spacing.md,
    minWidth: 56,
    alignItems: 'center',
  },
  todayBadge: {
    backgroundColor: palette.tint + '15',
    borderWidth: 1,
    borderColor: palette.tint + '30',
  },
  dayBadgeText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textSecondary,
  },
  todayBadgeText: {
    color: palette.tint,
    fontFamily: Theme.typography.fonts.bold,
  },
  dayDate: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  daySummary: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: palette.textSecondary,
    marginTop: 2,
  },
  pendingText: {
    color: palette.statusWarning,
    fontFamily: Theme.typography.fonts.medium,
  },
  dayContent: {
    paddingLeft: Theme.spacing.lg,
  },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
    backgroundColor: palette.backgroundSecondary + '50',
    borderRadius: 12,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: palette.borderLight,
    borderStyle: 'dashed',
  },
  emptyDayText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: palette.textTertiary,
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
    backgroundColor: palette.background,
    borderRadius: 12,
    padding: Theme.spacing.md,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: palette.borderLight,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  timeBadge: {
    backgroundColor: palette.tint + '10',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeBadgeText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.tint,
  },
  classStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
  },
  className: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: palette.textPrimary,
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
    color: palette.textTertiary,
  },
  progressContainer: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  progressBar: {
    height: 3,
    backgroundColor: palette.backgroundSecondary,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
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
    backgroundColor: palette.tint,
    borderRadius: Theme.borderRadius.xl,
    paddingVertical: Theme.spacing.lg,
    alignItems: 'center',
    shadowColor: palette.tint,
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
    color: palette.textInverse,
    marginTop: Theme.spacing.xs,
  },

  // Floating Action Button Styles
  floatingActions: {
    position: 'absolute',
    bottom: Theme.spacing.xl,
    right: Theme.spacing.lg,
    flexDirection: 'column',
    gap: Theme.spacing.md,
    alignItems: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  fabPrimary: {
    backgroundColor: palette.tint,
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  fabSecondary: {
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.borderLight,
  },
  fabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabLabel: {
    fontSize: 10,
    fontFamily: Theme.typography.fonts.bold,
    color: palette.textInverse,
    marginTop: 2,
  },
});
