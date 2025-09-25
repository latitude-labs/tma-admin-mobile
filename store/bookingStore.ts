import { create } from 'zustand';
import { Booking } from '@/types/api';
import { bookingsService } from '@/services/api/bookings.service';
import { offlineStorage } from '@/services/offline/storage';
import { useAuthStore } from './authStore';
import { requestManager } from '@/services/api/requestManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BookingFilters {
  status?: 'scheduled' | 'completed' | 'no-show' | 'cancelled';
  clubId?: number;
  classTimeId?: number;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
}

interface BookingState {
  bookings: Booking[];
  allBookings: Booking[]; // Store all bookings for offline access
  isLoading: boolean;
  error: string | null;
  isOffline: boolean;
  lastSync: string | null;
  lastSyncTimestamp: string | null; // For incremental sync
  syncCursor: string | null; // For cursor-based pagination
  filters: BookingFilters;
  pagination: PaginationState;
  viewMode: 'mine' | 'all';
  isInitialized: boolean; // Track if initial load is done
  setFilters: (filters: BookingFilters) => void;
  setViewMode: (mode: 'mine' | 'all') => void;
  fetchBookings: (forceRefresh?: boolean) => Promise<void>;
  fetchBookingsPage: (page: number) => Promise<void>;
  refreshBookings: () => Promise<void>;
  getFilteredBookings: () => Booking[];
  getUpcomingBookings: (days?: number) => Booking[];
  getTodaysBookings: () => Booking[];
  updateBookingStatus: (bookingId: number, status: 'completed' | 'no-show') => Promise<void>;
  setSearchQuery: (query: string) => void;
  applyFiltersAndPagination: () => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: [],
  allBookings: [],
  isLoading: false,
  error: null,
  isOffline: false,
  lastSync: null,
  lastSyncTimestamp: null,
  syncCursor: null,
  filters: {},
  viewMode: 'mine',
  isInitialized: false,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    perPage: 20,
  },

  setFilters: (filters: BookingFilters) => {
    set({ filters });
    // Automatically apply filters when they change
    get().applyFiltersAndPagination();
  },

  setViewMode: (mode: 'mine' | 'all') => {
    set({ viewMode: mode });
    // Re-apply filters when view mode changes
    get().applyFiltersAndPagination();
  },

  applyFiltersAndPagination: () => {
    const state = get();

    // Early return if no data
    if (state.allBookings.length === 0) {
      set({
        bookings: [],
        pagination: {
          ...state.pagination,
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
        },
      });
      return;
    }

    // Use requestAnimationFrame to prevent blocking the UI
    requestAnimationFrame(() => {
      const filtered = get().getFilteredBookings();

      // Calculate pagination based on filtered results
      const totalItems = filtered.length;
      const perPage = state.pagination.perPage;
      const totalPages = Math.ceil(totalItems / perPage);
      const currentPage = Math.min(state.pagination.currentPage, totalPages || 1);

      // Get paginated subset
      const start = (currentPage - 1) * perPage;
      const paginatedBookings = filtered.slice(start, start + perPage);

      set({
        bookings: paginatedBookings,
        pagination: {
          ...state.pagination,
          currentPage,
          totalPages,
          totalItems,
        },
      });
    });
  },

  fetchBookings: async (forceRefresh = false) => {
    const state = get();

    // Prevent duplicate requests
    if (state.isLoading && !forceRefresh) {
      console.log('[BookingStore] Already loading, skipping duplicate request');
      return;
    }

    // If we have data and it's not forced refresh, check if we need to fetch
    if (!forceRefresh && state.isInitialized && state.allBookings.length > 0) {
      const lastSyncTime = state.lastSyncTimestamp ? new Date(state.lastSyncTimestamp).getTime() : 0;
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (now - lastSyncTime < fiveMinutes) {
        console.log('[BookingStore] Data is fresh, using cache');
        get().applyFiltersAndPagination();
        return;
      }
    }

    set({ isLoading: true, error: null });

    try {
      const isOnline = await offlineStorage.isOnline();

      if (!isOnline) {
        // Offline - load from storage
        const cachedBookings = await offlineStorage.getBookings();
        const syncInfo = await offlineStorage.getLastSync();

        if (cachedBookings) {
          set({
            allBookings: cachedBookings,
            isLoading: false,
            isOffline: true,
            lastSync: syncInfo.bookings || null,
            isInitialized: true,
          });
          get().applyFiltersAndPagination();
        } else {
          set({
            isLoading: false,
            error: 'No internet connection and no cached data available',
            isOffline: true,
          });
        }
        return;
      }

      // Online - use incremental sync if we have a sync timestamp
      const lastTimestamp = await AsyncStorage.getItem('bookings_last_sync');
      const cursor = await AsyncStorage.getItem('bookings_sync_cursor');

      // Use request manager for deduplication
      const fetchBookingsData = async () => {
        if (lastTimestamp && !forceRefresh) {
          // Incremental sync
          console.log('[BookingStore] Performing incremental sync since', lastTimestamp);

          const syncResponse = await bookingsService.syncBookings({
            modified_since: lastTimestamp,
            cursor: cursor || undefined,
          });

          // Merge updated bookings
          const existingBookings = get().allBookings;
          const updatedIds = new Set(syncResponse.data.updated.map((b: Booking) => b.id));
          const deletedIds = new Set(syncResponse.data.deleted);

          // Remove deleted and updated bookings from existing
          const filteredBookings = existingBookings.filter(
            b => !updatedIds.has(b.id) && !deletedIds.has(b.id)
          );

          // Add updated bookings
          const mergedBookings = [...filteredBookings, ...syncResponse.data.updated];

          // Update sync metadata
          await AsyncStorage.setItem('bookings_last_sync', syncResponse.meta.sync_timestamp);
          if (syncResponse.meta.next_cursor) {
            await AsyncStorage.setItem('bookings_sync_cursor', syncResponse.meta.next_cursor);
          } else {
            await AsyncStorage.removeItem('bookings_sync_cursor');
          }

          return mergedBookings;
        } else {
          // Full sync - limit initial fetch to last 30 days for performance
          console.log('[BookingStore] Performing full sync');

          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);

          const allBookings = await bookingsService.getAllBookings({
            start_date: get().filters.startDate || thirtyDaysAgo.toISOString().split('T')[0],
            end_date: get().filters.endDate || tomorrow.toISOString().split('T')[0],
          });

          // Save sync timestamp
          const now = new Date().toISOString();
          await AsyncStorage.setItem('bookings_last_sync', now);
          await AsyncStorage.removeItem('bookings_sync_cursor');

          return allBookings;
        }
      };

      // Execute with request manager for deduplication and caching
      const allBookings = await requestManager.execute(
        '/bookings',
        fetchBookingsData,
        {
          params: {
            startDate: get().filters.startDate,
            endDate: get().filters.endDate
          },
          cacheDuration: 5 * 60 * 1000, // 5 minutes
          forceRefresh,
        }
      );

      // Save to offline storage
      await offlineStorage.saveBookings(allBookings);
      const syncInfo = await offlineStorage.getLastSync();

      set({
        allBookings,
        isLoading: false,
        isOffline: false,
        lastSync: syncInfo.bookings || null,
        lastSyncTimestamp: new Date().toISOString(),
        isInitialized: true,
      });

      // Apply filters and pagination after fetching
      get().applyFiltersAndPagination();

    } catch (error) {
      // Try to use cached data on error
      const cachedBookings = await offlineStorage.getBookings();
      if (cachedBookings && cachedBookings.length > 0) {
        set({
          allBookings: cachedBookings,
          isLoading: false,
          isOffline: true,
          isInitialized: true,
        });
        get().applyFiltersAndPagination();
      } else {
        set({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch bookings',
        });
      }
    }
  },

  fetchBookingsPage: async (page: number) => {
    const state = get();
    set({
      pagination: { ...state.pagination, currentPage: page }
    });
    get().applyFiltersAndPagination();
  },

  refreshBookings: async () => {
    await get().fetchBookings(true);
  },

  getFilteredBookings: () => {
    const { allBookings, filters, viewMode } = get();
    const user = useAuthStore.getState().user;
    let filtered = [...allBookings];

    // Apply view mode filter
    if (viewMode === 'mine' && user?.class_time_ids && user.class_time_ids.length > 0) {
      // Filter to only show bookings for the user's assigned class times
      filtered = filtered.filter(booking =>
        booking.class_time?.id && user.class_time_ids?.includes(booking.class_time.id)
      );
    }
    // 'all' mode shows everything (no additional filtering needed)

    // Apply search filter
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const searchLower = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(booking => {
        return (
          booking.names?.toLowerCase().includes(searchLower) ||
          booking.email?.toLowerCase().includes(searchLower) ||
          booking.phone?.includes(searchLower)
        );
      });
    }

    if (filters.status) {
      filtered = filtered.filter(booking => {
        if (filters.status === 'cancelled') {
          return booking.cancelled_at !== null;
        }
        if (filters.status === 'no-show') {
          return booking.no_show === true;
        }
        if (filters.status === 'completed') {
          return !booking.cancelled_at && !booking.no_show && new Date(booking.start_time) < new Date();
        }
        if (filters.status === 'scheduled') {
          return !booking.cancelled_at && !booking.no_show && new Date(booking.start_time) >= new Date();
        }
        return true;
      });
    }

    if (filters.clubId) {
      filtered = filtered.filter(booking => booking.club?.id === filters.clubId);
    }

    if (filters.classTimeId) {
      filtered = filtered.filter(booking => booking.class_time?.id === filters.classTimeId);
    }

    // Sort by start time descending
    return filtered.sort((a, b) =>
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
  },

  setSearchQuery: (query: string) => {
    const state = get();
    set({
      filters: { ...state.filters, searchQuery: query }
    });
    // applyFiltersAndPagination is already called by setFilters
  },

  getUpcomingBookings: (days = 7) => {
    const { allBookings, viewMode } = get();
    const user = useAuthStore.getState().user;
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const now = new Date();

    let bookingsToFilter = allBookings;

    // Apply view mode filter
    if (viewMode === 'mine' && user?.class_time_ids && user.class_time_ids.length > 0) {
      bookingsToFilter = bookingsToFilter.filter(booking =>
        booking.class_time?.id && user.class_time_ids?.includes(booking.class_time.id)
      );
    }

    return bookingsToFilter
      .filter(booking => {
        const startTime = new Date(booking.start_time);
        return startTime >= now &&
               startTime <= cutoff &&
               !booking.cancelled_at &&
               !booking.no_show;
      })
      .sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
  },

  getTodaysBookings: () => {
    const { allBookings, viewMode } = get();
    const user = useAuthStore.getState().user;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let bookingsToFilter = allBookings;

    // Apply view mode filter
    if (viewMode === 'mine' && user?.class_time_ids && user.class_time_ids.length > 0) {
      bookingsToFilter = bookingsToFilter.filter(booking =>
        booking.class_time?.id && user.class_time_ids?.includes(booking.class_time.id)
      );
    }

    return bookingsToFilter
      .filter(booking => {
        const startTime = new Date(booking.start_time);
        return startTime >= today &&
               startTime < tomorrow &&
               !booking.cancelled_at;
      })
      .sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
  },

  updateBookingStatus: async (bookingId: number, status: 'completed' | 'no-show') => {
    const { allBookings } = get();

    // Optimistically update the UI immediately
    const updatedBookings = allBookings.map(booking => {
      if (booking.id === bookingId) {
        if (status === 'no-show') {
          return {
            ...booking,
            no_show: true,
            no_show_at: new Date().toISOString(),
            attendance_status: 'no-show' as const
          };
        } else if (status === 'completed') {
          return {
            ...booking,
            checked_in_at: new Date().toISOString(),
            attendance_status: 'completed' as const
          };
        }
      }
      return booking;
    });

    set({ allBookings: updatedBookings });
    get().applyFiltersAndPagination();
    await offlineStorage.saveBookings(updatedBookings);

    // Queue the operation for sync (handles both online and offline)
    await bookingsService.updateBookingAttendanceStatusOffline(bookingId, status);
  },
}))