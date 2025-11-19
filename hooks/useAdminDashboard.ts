import { bookingsService } from '@/services/api/bookings.service';
import { clubsService } from '@/services/api/clubs.service';
import { useAuthStore } from '@/store/authStore';
import { useBookingStore } from '@/store/bookingStore';
import { useClubStore } from '@/store/clubStore';
import { useFacebookStore } from '@/store/facebookStore';
import { useSyncStore } from '@/store/syncStore';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

export interface DashboardStats {
  monthlyBookings: number;
  todaysBookings: number;
  todaysTrials: number;
  upcomingBookings: number;
  totalClubs: number;
}

export interface DashboardTrends {
  todaysBookings: { direction: 'up' | 'down' | 'neutral'; percentage: number };
  todaysTrials: { direction: 'up' | 'down' | 'neutral'; percentage: number };
  upcomingBookings: { direction: 'up' | 'down' | 'neutral'; percentage: number };
  monthlyBookings: { direction: 'up' | 'down' | 'neutral'; percentage: number };
}

export const useAdminDashboard = () => {
  const { user } = useAuthStore();
  const {
    fetchBookings,
    refreshBookings,
  } = useBookingStore();
  const { fetchClubs } = useClubStore();
  const { fetchFacebookPages } = useFacebookStore();
  const {
    setLastSyncTime,
    canSync,
    recordSyncAttempt,
    getRemainingWaitTime,
    isSyncing
  } = useSyncStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    monthlyBookings: 0,
    todaysBookings: 0,
    todaysTrials: 0,
    upcomingBookings: 0,
    totalClubs: 0
  });

  // Mock trends data - connected to nothing for now as per original file
  const [trends] = useState<DashboardTrends>({
    todaysBookings: { direction: 'up', percentage: 12 },
    todaysTrials: { direction: 'up', percentage: 8 },
    upcomingBookings: { direction: 'up', percentage: 15 },
    monthlyBookings: { direction: 'up', percentage: 23 },
  });

  const fetchStats = async () => {
    try {
      const [bookingTotals, clubsCount] = await Promise.all([
        bookingsService.getBookingsTotals(),
        clubsService.getClubsCount()
      ]);

      setStats({
        monthlyBookings: bookingTotals.month || 0,
        todaysBookings: bookingTotals.today || 0,
        todaysTrials: bookingTotals.trials_today || 0,
        upcomingBookings: bookingTotals.upcoming || 0,
        totalClubs: clubsCount.total || 0
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const loadInitialData = async () => {
    // Initial delay for animation smoothness (inherited from original)
    await new Promise(resolve => setTimeout(resolve, 100));

    await fetchStats();

    const bookingState = useBookingStore.getState();
    if (!bookingState.isInitialized || bookingState.allBookings.length === 0) {
      fetchBookings().catch(console.error);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleRefresh = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
        fetchClubs(),
        refreshBookings(),
        fetchStats(),
        user?.is_admin ? fetchFacebookPages() : Promise.resolve(),
      ]);
      setLastSyncTime(Date.now());
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    isLoading,
    isRefreshing,
    stats,
    trends,
    handleRefresh,
    user
  };
};
