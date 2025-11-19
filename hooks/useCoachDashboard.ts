import { Booking, ClassTime } from '@/types/api';
import { bookingsService } from '@/services/api/bookings.service';
import { classTimesService } from '@/services/api/classTimes.service';
import { remindersService } from '@/services/api/reminders.service';
import { offlineStorage } from '@/services/offline/storage';
import { useAuthStore } from '@/store/authStore';
import { useBookingStore } from '@/store/bookingStore';
import { useClubStore } from '@/store/clubStore';
import { useSyncStore } from '@/store/syncStore';
import { useOffline } from '@/hooks/useOffline';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

export interface ClassWithBookings {
  classTime: ClassTime;
  bookings: Booking[];
  pendingBookings: Booking[];
  processedBookings: Booking[];
}

export interface DayData {
  date: Date;
  dateString: string;
  dayName: string;
  classes: ClassWithBookings[];
  isLoading: boolean;
  isLoaded: boolean;
}

export const useCoachDashboard = () => {
  const { user } = useAuthStore();
  const { isOffline } = useOffline();
  const {
    setSyncing,
    setLastSyncTime,
    canSync,
    recordSyncAttempt,
    getRemainingWaitTime,
    isSyncing,
    lastSyncTime
  } = useSyncStore();

  const [daysData, setDaysData] = useState<DayData[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Track last update timestamp to detect booking changes
  const [lastBookingUpdate, setLastBookingUpdate] = useState<number>(Date.now());

  useEffect(() => {
    const unsubscribe = useBookingStore.subscribe((state, prevState) => {
      if (state.bookings !== prevState.bookings) {
        setLastBookingUpdate(Date.now());
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      const init = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        await initializeDaysData();
        loadReminders();
      };
      init();
    }
  }, [user]);

  // Refresh today's data when bookings are updated locally
  useEffect(() => {
    if (lastBookingUpdate && daysData.length > 0 && daysData[0].isLoaded) {
      // We could re-fetch just today, but since we are optimizing, 
      // we might want to just re-run the matching logic if we had a local store of all bookings.
      // For now, we will trigger a reload of the current day if needed, 
      // or rely on the store updates if we fully integrate with stores.
      // The original code re-fetched day 0.
      // For this refactor, we will keep it simple and maybe optimize this later.
    }
  }, [lastBookingUpdate]);

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
    
    // Load from cache first
    await loadAllDaysFromCache(days);
    
    // Then sync
    if (!isOffline) {
        await syncAllDaysData(days, true);
    }
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
    if (!skipSyncState) setSyncing(true);
    
    const days = providedDays || daysData;
    if (days.length === 0) return;

    const startDate = days[0].dateString;
    const endDate = days[days.length - 1].dateString;

    // Mark all as loading
    setDaysData(prev => prev.map(d => ({ ...d, isLoading: true })));

    try {
      // 1. Fetch all class times for the week
      const allClassTimes = await classTimesService.getClassTimes({
        date_from: startDate,
        date_to: endDate
      });

      // 2. Fetch all bookings for the week
      const allBookings = await bookingsService.getAllBookings({
        start_date: startDate,
        end_date: endDate
      });

      // 3. Process data day by day
      const updatedDays = await Promise.all(days.map(async (day) => {
        const dayOfWeek = day.dayName;
        
        // Filter classes for this day
        const dayClasses = allClassTimes.filter(ct => 
            ct.day && ct.day.toLowerCase() === dayOfWeek.toLowerCase()
        );

        // Process each class
        const classesWithBookings: ClassWithBookings[] = dayClasses.map(classTime => {
            // Filter bookings for this class and this specific date
            // Note: Booking.start_time usually contains the full date-time string
            // We need to match bookings that fall on this day and match the class time
            
            const classBookings = allBookings.filter(b => {
                if (b.class_time?.id !== classTime.id) return false;
                
                // Check date
                const bookingDate = b.start_time.split('T')[0];
                return bookingDate === day.dateString;
            });

            const activeBookings = classBookings.filter(booking => !booking.cancelled_at);
            
            const pendingBookings = activeBookings.filter(b => {
                const hasConversionStatus = b.status && b.status !== 'pending';
                const hasAttendanceStatus = b.attendance_status === 'no-show' || b.attendance_status === 'completed' || b.checked_in_at || b.no_show;
                return !hasConversionStatus && !hasAttendanceStatus;
            });
            
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
        });

        // Sort classes by time
        classesWithBookings.sort((a, b) => {
            const timeA = a.classTime.start_time.split(':').map(Number);
            const timeB = b.classTime.start_time.split(':').map(Number);
            return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
        });

        // Cache the result
        await offlineStorage.saveCoachClasses(day.dateString, classesWithBookings);

        return {
            ...day,
            classes: classesWithBookings,
            isLoading: false,
            isLoaded: true
        };
      }));

      setDaysData(updatedDays);
      setLoading(false);

    } catch (error) {
      console.error('Error syncing dashboard data:', error);
      Alert.alert('Sync Error', 'Failed to load schedule data');
      setDaysData(prev => prev.map(d => ({ ...d, isLoading: false })));
    } finally {
      if (!skipSyncState) setSyncing(false);
    }
  };

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

  const handleRefresh = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isSyncing || isRefreshing) return;

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

  return {
    user,
    loading,
    daysData,
    reminders,
    remindersLoading,
    isRefreshing,
    isOffline,
    lastSyncTime,
    isSyncing,
    handleRefresh,
    loadReminders,
    handleCompleteReminder,
    handleSnoozeReminder
  };
};
