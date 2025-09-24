import { create } from 'zustand';
import { Booking } from '@/types/api';
import { bookingsService } from '@/services/api/bookings.service';
import { offlineStorage } from '@/services/offline/storage';
import { useAuthStore } from './authStore';

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
  filters: BookingFilters;
  pagination: PaginationState;
  viewMode: 'mine' | 'all';
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
  filters: {},
  viewMode: 'mine',
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    perPage: 20,
  },

  setFilters: (filters: BookingFilters) => {
    set({ filters });
  },

  setViewMode: (mode: 'mine' | 'all') => {
    set({ viewMode: mode });
    // Re-apply filters when view mode changes
    get().applyFiltersAndPagination();
  },

  applyFiltersAndPagination: () => {
    const state = get();
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
  },

  fetchBookings: async (forceRefresh = false) => {
    set({ isLoading: true, error: null });

    try {
      const isOnline = await offlineStorage.isOnline();

      if (isOnline && forceRefresh) {
        // Force fetch ALL bookings for offline capability
        try {
          const allBookings = await bookingsService.getAllBookings({
            start_date: get().filters.startDate,
            end_date: get().filters.endDate,
          });

          // Save ALL bookings to offline storage
          await offlineStorage.saveBookings(allBookings);

          const syncInfo = await offlineStorage.getLastSync();

          set({
            allBookings,
            isLoading: false,
            isOffline: false,
            lastSync: syncInfo.bookings || null,
          });

          // Apply filters and pagination after fetching
          get().applyFiltersAndPagination();
        } catch (apiError) {
          // If API fails, load from cache
          const cachedBookings = await offlineStorage.getBookings();

          if (cachedBookings) {
            const syncInfo = await offlineStorage.getLastSync();
            set({
              allBookings: cachedBookings,
              isLoading: false,
              isOffline: true,
              lastSync: syncInfo.bookings || null,
            });
            get().applyFiltersAndPagination();
          } else {
            throw apiError;
          }
        }
      } else if (isOnline) {
        // Try cache first for better performance
        const cachedBookings = await offlineStorage.getBookings();

        if (cachedBookings && cachedBookings.length > 0) {
          const syncInfo = await offlineStorage.getLastSync();
          set({
            allBookings: cachedBookings,
            isLoading: false,
            isOffline: false,
            lastSync: syncInfo.bookings || null,
          });
          get().applyFiltersAndPagination();

          // Fetch fresh data in background
          try {
            const allBookings = await bookingsService.getAllBookings({
              start_date: get().filters.startDate,
              end_date: get().filters.endDate,
            });

            await offlineStorage.saveBookings(allBookings);
            const freshSyncInfo = await offlineStorage.getLastSync();

            set({
              allBookings,
              lastSync: freshSyncInfo.bookings || null,
            });
            get().applyFiltersAndPagination();
          } catch (error) {
            console.warn('Background refresh failed:', error);
          }
        } else {
          // No cache, fetch from API
          const allBookings = await bookingsService.getAllBookings({
            start_date: get().filters.startDate,
            end_date: get().filters.endDate,
          });

          await offlineStorage.saveBookings(allBookings);
          const syncInfo = await offlineStorage.getLastSync();

          set({
            allBookings,
            isLoading: false,
            isOffline: false,
            lastSync: syncInfo.bookings || null,
          });
          get().applyFiltersAndPagination();
        }
      } else {
        // Offline - load from storage
        const cachedBookings = await offlineStorage.getBookings();
        const syncInfo = await offlineStorage.getLastSync();

        if (cachedBookings) {
          set({
            allBookings: cachedBookings,
            isLoading: false,
            isOffline: true,
            lastSync: syncInfo.bookings || null,
          });
          get().applyFiltersAndPagination();
        } else {
          set({
            isLoading: false,
            error: 'No internet connection and no cached data available',
            isOffline: true,
          });
        }
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch bookings',
      });
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
    get().applyFiltersAndPagination();
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