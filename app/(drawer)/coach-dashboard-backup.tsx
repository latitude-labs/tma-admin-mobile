import { SkeletonLoader } from '@/components/SkeletonLoader';
import { Badge, Card } from '@/components/ui';
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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [reminders, setReminders] = useState<any[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const { bookings, fetchBookings } = useBookingStore();
  const { clubs, fetchClubs } = useClubStore();

  useEffect(() => {
    // This dashboard is only for non-admin users (coaches)
    // Admin users should be routed to dashboard by the root layout
    if (user) {
      initializeDaysData();
      loadReminders();
    }

    // Cleanup function to reset states on unmount
    return () => {
      setIsRefreshing(false);
      setSyncing(false);
    };
  }, [user]);

  // Sync all days data when coming back online
  useEffect(() => {
    if (!isOffline && daysData.length > 0) {
      // Skip sync state management for automatic background sync
      syncAllDaysData(undefined, true);
    }
  }, [isOffline]);

  // Rotation animation for sync icon
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
      // Stop any ongoing animation and reset
      rotateAnim.stopAnimation();
      rotateAnim.setValue(0);
    }

    // Cleanup function to stop animation when component unmounts or dependencies change
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
      // Don't show error alert for reminders, just fail silently
    } finally {
      setRemindersLoading(false);
    }
  };

  const handleCompleteReminder = async (id: number) => {
    try {
      await remindersService.completeReminder(id);
      // Reload reminders after completion
      loadReminders();
    } catch (error) {
      console.error('Failed to complete reminder:', error);
      Alert.alert('Error', 'Failed to complete reminder');
    }
  };

  const handleSnoozeReminder = async (id: number, snoozeUntil: Date) => {
    try {
      await remindersService.snoozeReminder(id, snoozeUntil);
      // Reload reminders after snoozing
      loadReminders();
    } catch (error) {
      console.error('Failed to snooze reminder:', error);
      Alert.alert('Error', 'Failed to snooze reminder');
    }
  };

  const handleAddReminder = () => {
    // TODO: Navigate to add reminder screen (to be implemented)
    Alert.alert('Coming Soon', 'Add reminder feature will be available soon');
  };

  const handleViewAllReminders = () => {
    // TODO: Navigate to all reminders screen (to be implemented)
    Alert.alert('Coming Soon', 'View all reminders will be available soon');
  };

  const initializeDaysData = async () => {
    const days: DayData[] = [];
    const today = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Create next 7 days data structure
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

    // Load all days from cache first for immediate availability
    await loadAllDaysFromCache(days);

    // Then sync all days in the background (skip sync state since this is initial load)
    syncAllDaysData(days, true);
  };

  const loadAllDaysFromCache = async (days: DayData[]) => {
    try {
      const updatedDays = await Promise.all(
        days.map(async (day, index) => {
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
      console.error('Error loading cached data:', error);
      setLoading(false);
    }
  };

  const syncAllDaysData = async (days?: DayData[], skipSyncState = false) => {
    const daysToSync = days || daysData;
    if (daysToSync.length === 0) return;

    // Only set syncing state if not skipping (e.g., when called from handleRefresh)
    if (!skipSyncState) {
      setSyncing(true);
    }

    try {
      // Fetch all days data in parallel
      const allDaysPromises = daysToSync.map(async (day) => {
        try {
          const [dayClasses, bookingsData] = await Promise.all([
            classTimesService.getClassTimes({
              date_from: day.dateString,
              date_to: day.dateString
            }),
            bookingsService.getAllBookings({
              start_date: day.dateString,
              end_date: day.dateString
            })
          ]);

          // Process and group the data
          const classesWithBookings: ClassWithBookings[] = dayClasses.map(classTime => {
            const allBookings = bookingsData.filter(booking =>
              booking.class_time?.id === classTime.id &&
              !booking.cancelled_at
            );

            const pendingBookings = allBookings.filter(b =>
              !b.status || b.status === 'pending'
            );

            const processedBookings = allBookings.filter(b =>
              b.status && b.status !== 'pending'
            );

            return {
              classTime,
              bookings: allBookings,
              pendingBookings,
              processedBookings
            };
          });

          // Sort classes
          classesWithBookings.sort((a, b) => {
            const aPending = a.pendingBookings.length > 0 ? 1 : 0;
            const bPending = b.pendingBookings.length > 0 ? 1 : 0;
            if (aPending !== bPending) {
              return bPending - aPending;
            }

            const timeA = a.classTime.start_time.split(':').map(Number);
            const timeB = b.classTime.start_time.split(':').map(Number);
            return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
          });

          // Save to cache
          await offlineStorage.saveCoachClasses(day.dateString, classesWithBookings);

          return {
            dateString: day.dateString,
            classes: classesWithBookings
          };
        } catch (error) {
          console.error(`Error syncing day ${day.dateString}:`, error);
          return null;
        }
      });

      const results = await Promise.all(allDaysPromises);

      // Update state with synced data
      setDaysData(prev => {
        const updated = [...prev];
        results.forEach(result => {
          if (result) {
            const index = updated.findIndex(d => d.dateString === result.dateString);
            if (index !== -1) {
              updated[index] = {
                ...updated[index],
                classes: result.classes,
                isLoading: false,
                isLoaded: true
              };
            }
          }
        });
        return updated;
      });

      setLoading(false);
    } catch (error) {
      console.error('Error syncing all days:', error);
      setLoading(false);
    } finally {
      // Always clear syncing state if we were managing it
      if (!skipSyncState) {
        setSyncing(false);
      }
    }
  };

  const loadDayData = async (index: number, dayData?: DayData) => {
    if (!dayData || dayData.isLoaded || dayData.isLoading) return;

    // Try to load from cache first
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

      if (index === 0) {
        setLoading(false);
      }

      // If online, refresh in background
      if (!isOffline) {
        try {
          const [dayClasses, bookingsData] = await Promise.all([
            classTimesService.getClassTimes({
              date_from: dayData.dateString,
              date_to: dayData.dateString
            }),
            bookingsService.getAllBookings({
              start_date: dayData.dateString,
              end_date: dayData.dateString
            })
          ]);

          const classesWithBookings: ClassWithBookings[] = dayClasses.map(classTime => {
            const allBookings = bookingsData.filter(booking =>
              booking.class_time?.id === classTime.id &&
              !booking.cancelled_at
            );

            const pendingBookings = allBookings.filter(b =>
              !b.status || b.status === 'pending'
            );

            const processedBookings = allBookings.filter(b =>
              b.status && b.status !== 'pending'
            );

            return {
              classTime,
              bookings: allBookings,
              pendingBookings,
              processedBookings
            };
          });

          classesWithBookings.sort((a, b) => {
            const aPending = a.pendingBookings.length > 0 ? 1 : 0;
            const bPending = b.pendingBookings.length > 0 ? 1 : 0;
            if (aPending !== bPending) {
              return bPending - aPending;
            }

            const timeA = a.classTime.start_time.split(':').map(Number);
            const timeB = b.classTime.start_time.split(':').map(Number);
            return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
          });

          // Save to cache and update state
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
        } catch (error) {
          console.error('Background refresh failed:', error);
        }
      }
      return;
    }

    // No cache, load from API
    if (isOffline) {
      setDaysData(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], isLoading: false };
        return updated;
      });

      if (index === 0) {
        setLoading(false);
        Alert.alert('Offline', 'No cached data available for this day');
      }
      return;
    }

    // Update loading state
    setDaysData(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isLoading: true };
      return updated;
    });

    try {
      const [dayClasses, bookingsData] = await Promise.all([
        classTimesService.getClassTimes({
          date_from: dayData.dateString,
          date_to: dayData.dateString
        }),
        bookingsService.getAllBookings({
          start_date: dayData.dateString,
          end_date: dayData.dateString
        })
      ]);

      const classesWithBookings: ClassWithBookings[] = dayClasses.map(classTime => {
        const allBookings = bookingsData.filter(booking =>
          booking.class_time?.id === classTime.id &&
          !booking.cancelled_at
        );

        const pendingBookings = allBookings.filter(b =>
          !b.status || b.status === 'pending'
        );

        const processedBookings = allBookings.filter(b =>
          b.status && b.status !== 'pending'
        );

        return {
          classTime,
          bookings: allBookings,
          pendingBookings,
          processedBookings
        };
      });

      classesWithBookings.sort((a, b) => {
        const aPending = a.pendingBookings.length > 0 ? 1 : 0;
        const bPending = b.pendingBookings.length > 0 ? 1 : 0;
        if (aPending !== bPending) {
          return bPending - aPending;
        }

        const timeA = a.classTime.start_time.split(':').map(Number);
        const timeB = b.classTime.start_time.split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });

      // Save to cache
      await offlineStorage.saveCoachClasses(dayData.dateString, classesWithBookings);

      // Update state
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

  const formatSyncTime = (time: number | null) => {
    if (!time) return 'Never';
    const diff = Date.now() - time;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const handleRefresh = async () => {
    // Prevent multiple simultaneous refreshes
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
        `You've reached the sync limit (3 times per 2 minutes).\n\nPlease wait ${minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`} before syncing again.`,
        [{ text: 'OK' }]
      );
      return;
    }

    recordSyncAttempt();
    setIsRefreshing(true);

    try {
      // Sync all days data (syncAllDaysData will manage setSyncing internally)
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

  // Handle day change - data should already be loaded or cached
  useEffect(() => {
    if (currentDayIndex >= 0 && daysData[currentDayIndex]) {
      const currentDay = daysData[currentDayIndex];
      // Only load if not already loaded (shouldn't happen with sync)
      if (!currentDay.isLoaded && !currentDay.isLoading && !isOffline) {
        loadDayData(currentDayIndex, currentDay);
      }
    }
  }, [currentDayIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== undefined) {
      const newIndex = viewableItems[0].index;
      setCurrentDayIndex(newIndex);
    }
  }).current;

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

  const renderDayClasses = ({ item: dayData, index }: { item: DayData; index: number }) => {
    if (!dayData) {
      return null;
    }

    const isToday = index === 0;

    return (
      <View style={styles.dayContainer}>
        <Card variant="elevated" style={styles.dayCard}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle}>
              {isToday ? 'Today' : dayData.dayName}
            </Text>
            <Text style={styles.dayDate}>
              {dayData.date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: index > 0 && dayData.date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
              })}
            </Text>
          </View>

          {dayData.isLoading ? (
            <View style={styles.skeletonContainer}>
              <SkeletonLoader height={120} style={{ marginBottom: Theme.spacing.md }} />
              <SkeletonLoader height={120} style={{ marginBottom: Theme.spacing.md }} />
            </View>
          ) : dayData.classes.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={Theme.colors.text.tertiary} />
              <Text style={styles.emptyText}>No classes scheduled</Text>
            </View>
          ) : (
            dayData.classes.map((classWithBookings) => (
              <ClassCard
                key={classWithBookings.classTime.id}
                classWithBookings={classWithBookings}
                onPress={() => navigateToClass(classWithBookings, dayData.dateString)}
              />
            ))
          )}
        </Card>
      </View>
    );
  };

  const ClassCard: React.FC<{
    classWithBookings: ClassWithBookings;
    onPress: () => void;
  }> = ({ classWithBookings, onPress }) => {

    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Card variant="filled" style={styles.classCard}>
          <View style={styles.classHeader}>
            <View style={styles.classTimeContainer}>
              <Text style={styles.classTime}>
                {formatTime(classWithBookings.classTime.start_time)}
              </Text>
              <Text style={styles.classTimeSeparator}>-</Text>
              <Text style={styles.classTime}>
                {classWithBookings.classTime.end_time ?
                  formatTime(classWithBookings.classTime.end_time) :
                  'TBD'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Theme.colors.text.secondary} />
          </View>

          <View style={styles.classInfo}>
            <Text style={styles.className}>
              {classWithBookings.classTime.name || 'Class'}
            </Text>
            <Text style={styles.clubName}>
              <Ionicons name="location-outline" size={14} color={Theme.colors.text.secondary} />
              {' '}{classWithBookings.classTime.club?.name || 'Club'}
            </Text>
          </View>

          {classWithBookings.classTime.helpers && classWithBookings.classTime.helpers.length > 0 && (
            <View style={styles.helpersContainer}>
              <Text style={styles.helpersLabel}>Helpers:</Text>
              <Text style={styles.helpersNames}>
                {classWithBookings.classTime.helpers.join(', ')}
              </Text>
            </View>
          )}

          <View style={styles.bookingStats}>
            <View style={styles.bookingStatRow}>
              <View style={styles.bookingStatLeft}>
                <Ionicons name="time-outline" size={18} color={Theme.colors.status.warning} />
                <Text style={styles.bookingStatLabel}>Pending</Text>
              </View>
              <Text style={styles.bookingStatValue}>
                {classWithBookings.pendingBookings.length}
              </Text>
            </View>
            <View style={styles.bookingStatRow}>
              <View style={styles.bookingStatLeft}>
                <Ionicons name="checkmark-circle" size={18} color={Theme.colors.status.success} />
                <Text style={styles.bookingStatLabel}>Processed</Text>
              </View>
              <Text style={styles.bookingStatValue}>
                {classWithBookings.processedBookings.length}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your classes...</Text>
      </View>
    );
  }

  const currentDay = daysData[currentDayIndex];

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefresh}
            tintColor="transparent"
            colors={["transparent"]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back, {user?.name || 'Coach'}!</Text>
          <Text style={styles.date}>{new Date().toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}</Text>
          <View style={styles.syncStatus}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons
                name={isOffline ? 'cloud-offline' : (isSyncing || isRefreshing) ? 'sync' : 'cloud-done'}
                size={20}
                color={isOffline ? Theme.colors.status.error : (isSyncing || isRefreshing) ? Theme.colors.primary : Theme.colors.status.success}
              />
            </Animated.View>
            <Text style={styles.syncText}>
              {isOffline ? 'Offline' : (isSyncing || isRefreshing) ? 'Syncing...' : `Synced ${formatSyncTime(lastSyncTime)}`}
            </Text>
          </View>
        </View>

        <RemindersSection
          reminders={reminders}
          loading={remindersLoading}
          onCompleteReminder={handleCompleteReminder}
          onSnoozeReminder={handleSnoozeReminder}
          onAddReminder={handleAddReminder}
          onViewAll={handleViewAllReminders}
        />

        {currentDay && (
          <Card variant="elevated" style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Ionicons name="people" size={24} color={Theme.colors.primary} />
                <Text style={styles.statValue}>{currentDay.classes.length}</Text>
                <Text style={styles.statLabel}>Classes</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="person-add" size={24} color={Theme.colors.status.success} />
                <Text style={styles.statValue}>
                  {currentDay.classes.reduce((sum, c) => sum + c.bookings.length, 0)}
                </Text>
                <Text style={styles.statLabel}>Bookings</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="checkmark-circle" size={24} color={Theme.colors.status.info} />
                <Text style={styles.statValue}>
                  {currentDay.classes.reduce((sum, c) => sum + c.processedBookings.length, 0)}
                </Text>
                <Text style={styles.statLabel}>Processed</Text>
              </View>
            </View>
          </Card>
        )}

        <View style={styles.classesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Classes</Text>
            <View style={styles.dayIndicator}>
              <Text style={styles.dayIndicatorText}>
                {currentDayIndex + 1} / {daysData.length}
              </Text>
            </View>
          </View>

          <FlatList
            ref={flatListRef}
            data={daysData}
            renderItem={renderDayClasses}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{
              itemVisiblePercentThreshold: 50
            }}
            style={styles.flatList}
          />
        </View>

        <Card variant="filled" style={styles.quickActionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/eod-wizard')}
            >
              <Ionicons name="document-text" size={24} color={Theme.colors.primary} />
              <Text style={styles.actionText}>End of Day Report</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/clubs')}
            >
              <Ionicons name="business" size={24} color={Theme.colors.primary} />
              <Text style={styles.actionText}>View All Clubs</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.secondary,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background.secondary,
  },
  loadingText: {
    fontSize: Theme.typography.sizes.lg,
    color: Theme.colors.text.secondary,
    fontFamily: Theme.typography.fonts.regular,
    marginTop: Theme.spacing.md,
  },
  header: {
    marginBottom: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
  },
  greeting: {
    fontSize: Theme.typography.sizes['xl'],
    fontFamily: Theme.typography.fonts.bold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  date: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Theme.spacing.sm,
  },
  syncText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
  },
  summaryCard: {
    marginBottom: Theme.spacing.xl,
    marginHorizontal: Theme.spacing.lg,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Theme.spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: Theme.typography.sizes['2xl'],
    fontFamily: Theme.typography.fonts.bold,
    color: Theme.colors.text.primary,
    marginTop: Theme.spacing.xs,
  },
  statLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
    marginTop: Theme.spacing.xs,
  },
  classesSection: {
    marginBottom: Theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
  },
  dayIndicator: {
    backgroundColor: Theme.colors.background.primary,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.sm,
  },
  dayIndicatorText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.secondary,
  },
  flatList: {
    height: 'auto',
  },
  dayContainer: {
    width: screenWidth,
    paddingHorizontal: Theme.spacing.lg,
  },
  dayCard: {
    minHeight: 200,
  },
  dayHeader: {
    marginBottom: Theme.spacing.lg,
  },
  dayTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontFamily: Theme.typography.fonts.bold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  dayDate: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
  },
  skeletonContainer: {
    padding: Theme.spacing.sm,
  },
  classCard: {
    marginBottom: Theme.spacing.md,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  classTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classTime: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.primary,
  },
  classTimeSeparator: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.text.secondary,
    marginHorizontal: Theme.spacing.xs,
  },
  classInfo: {
    marginBottom: Theme.spacing.md,
  },
  className: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  clubName: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border.light,
  },
  helpersLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.semibold,
    color: Theme.colors.text.secondary,
    marginRight: Theme.spacing.sm,
  },
  helpersNames: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.primary,
    flex: 1,
  },
  bookingStats: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border.light,
    paddingTop: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  bookingStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.xs,
  },
  bookingStatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  bookingStatLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.secondary,
  },
  bookingStatValue: {
    fontSize: Theme.typography.sizes.lg,
    fontFamily: Theme.typography.fonts.bold,
    color: Theme.colors.text.primary,
  },
  bookingsPreview: {
    paddingTop: Theme.spacing.sm,
  },
  bookingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  bookingName: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.primary,
    flex: 1,
  },
  moreBookings: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.secondary,
    fontStyle: 'italic',
    marginTop: Theme.spacing.xs,
  },
  noBookings: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.regular,
    color: Theme.colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: Theme.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
  },
  emptyText: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.secondary,
    marginTop: Theme.spacing.md,
  },
  quickActionsCard: {
    marginBottom: Theme.spacing.lg,
    marginHorizontal: Theme.spacing.lg,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.background.primary,
    borderRadius: Theme.borderRadius.md,
  },
  actionText: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fonts.medium,
    color: Theme.colors.text.primary,
    marginTop: Theme.spacing.sm,
  },
});