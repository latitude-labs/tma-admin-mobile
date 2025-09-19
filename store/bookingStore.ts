import { create } from 'zustand';
import { Booking } from '@/types/api';
import { bookingsService } from '@/services/api/bookings.service';
import { offlineStorage } from '@/services/offline/storage';

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
  isLoading: boolean;
  error: string | null;
  isOffline: boolean;
  lastSync: string | null;
  filters: BookingFilters;
  pagination: PaginationState;
  setFilters: (filters: BookingFilters) => void;
  fetchBookings: (forceRefresh?: boolean) => Promise<void>;
  fetchBookingsPage: (page: number) => Promise<void>;
  refreshBookings: () => Promise<void>;
  getFilteredBookings: () => Booking[];
  getUpcomingBookings: (days?: number) => Booking[];
  getTodaysBookings: () => Booking[];
  updateBookingStatus: (bookingId: number, status: 'completed' | 'no-show') => Promise<void>;
  setSearchQuery: (query: string) => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: [],
  isLoading: false,
  error: null,
  isOffline: false,
  lastSync: null,
  filters: {},
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    perPage: 20,
  },

  setFilters: (filters: BookingFilters) => {
    set({ filters });
  },

  fetchBookings: async (forceRefresh = false) => {
    set({ isLoading: true, error: null });

    try {
      const isOnline = await offlineStorage.isOnline();

      if (isOnline && forceRefresh) {
        // Force fetch from API with pagination
        try {
          const response = await bookingsService.getBookings({
            start_date: get().filters.startDate,
            end_date: get().filters.endDate,
            club_id: get().filters.clubId,
            class_time_id: get().filters.classTimeId,
            page: get().pagination.currentPage,
            per_page: get().pagination.perPage,
          });

          // Save to offline storage
          await offlineStorage.saveBookings(response.data);

          const syncInfo = await offlineStorage.getLastSync();

          set({
            bookings: response.data,
            pagination: {
              currentPage: response.meta.current_page,
              totalPages: response.meta.last_page,
              totalItems: response.meta.total,
              perPage: response.meta.per_page,
            },
            isLoading: false,
            isOffline: false,
            lastSync: syncInfo.bookings || null,
          });
        } catch (apiError) {
          // If API fails, load from cache
          const cachedBookings = await offlineStorage.getBookings();

          if (cachedBookings) {
            const syncInfo = await offlineStorage.getLastSync();
            set({
              bookings: cachedBookings,
              isLoading: false,
              isOffline: true,
              lastSync: syncInfo.bookings || null,
            });
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
            bookings: cachedBookings,
            isLoading: false,
            isOffline: false,
            lastSync: syncInfo.bookings || null,
          });

          // Fetch fresh data in background
          try {
            const response = await bookingsService.getBookings({
              start_date: get().filters.startDate,
              end_date: get().filters.endDate,
              club_id: get().filters.clubId,
              class_time_id: get().filters.classTimeId,
              page: get().pagination.currentPage,
              per_page: get().pagination.perPage,
            });

            await offlineStorage.saveBookings(response.data);
            const freshSyncInfo = await offlineStorage.getLastSync();

            set({
              bookings: response.data,
              pagination: {
                currentPage: response.meta.current_page,
                totalPages: response.meta.last_page,
                totalItems: response.meta.total,
                perPage: response.meta.per_page,
              },
              lastSync: freshSyncInfo.bookings || null,
            });
          } catch (error) {
            console.warn('Background refresh failed:', error);
          }
        } else {
          // No cache, fetch from API
          const response = await bookingsService.getBookings({
            start_date: get().filters.startDate,
            end_date: get().filters.endDate,
            club_id: get().filters.clubId,
            class_time_id: get().filters.classTimeId,
            page: get().pagination.currentPage,
            per_page: get().pagination.perPage,
          });

          await offlineStorage.saveBookings(response.data);
          const syncInfo = await offlineStorage.getLastSync();

          set({
            bookings: response.data,
            pagination: {
              currentPage: response.meta.current_page,
              totalPages: response.meta.last_page,
              totalItems: response.meta.total,
              perPage: response.meta.per_page,
            },
            isLoading: false,
            isOffline: false,
            lastSync: syncInfo.bookings || null,
          });
        }
      } else {
        // Offline - load from storage
        const cachedBookings = await offlineStorage.getBookings();
        const syncInfo = await offlineStorage.getLastSync();

        if (cachedBookings) {
          set({
            bookings: cachedBookings,
            isLoading: false,
            isOffline: true,
            lastSync: syncInfo.bookings || null,
          });
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
    await get().fetchBookings(true);
  },

  refreshBookings: async () => {
    await get().fetchBookings(true);
  },

  getFilteredBookings: () => {
    const { bookings, filters } = get();
    let filtered = [...bookings];

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
  },

  getUpcomingBookings: (days = 7) => {
    const { bookings } = get();
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const now = new Date();

    return bookings
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
    const { bookings } = get();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return bookings
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
    const { bookings } = get();

    // Optimistically update the UI immediately
    const updatedBookings = bookings.map(booking => {
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

    set({ bookings: updatedBookings });
    await offlineStorage.saveBookings(updatedBookings);

    // Queue the operation for sync (handles both online and offline)
    await bookingsService.updateBookingAttendanceStatusOffline(bookingId, status);
  },
}));