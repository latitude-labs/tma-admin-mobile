import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CalendarEvent,
  HolidayRequest,
  CoverageAssignment,
  AvailableCoach,
  CalendarFilters,
  CalendarView,
  EventType,
  CalendarSyncOperation,
  DateRange
} from '@/types/calendar';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isWithinInterval, eachDayOfInterval, getDay, isSameDay } from 'date-fns';
import { ClassTime } from '@/types/api';

interface CalendarStore {
  // Events
  events: CalendarEvent[];
  eventsLoading: boolean;
  eventsError: string | null;

  // Class Times (user's assigned classes)
  userClassTimes: ClassTime[];
  classTimesLoading: boolean;

  // Holiday Requests
  holidayRequests: HolidayRequest[];
  holidayRequestsLoading: boolean;
  pendingHolidayRequests: HolidayRequest[];

  // Coverage
  coverageAssignments: CoverageAssignment[];
  availableCoaches: AvailableCoach[];
  coverageLoading: boolean;

  // UI State
  filters: CalendarFilters;
  selectedEvent: CalendarEvent | null;
  selectedDateRange: DateRange | null;
  holidayRequestDraft: {
    start: Date | null;
    end: Date | null;
    reason?: string;
    notes?: string;
  } | null;

  // Sync State
  syncQueue: CalendarSyncOperation[];
  lastSyncTime: string | null;
  isSyncing: boolean;

  // Cache Management
  cachedMonths: string[]; // YYYY-MM format
  cacheExpiry: Record<string, number>;

  // Actions - Events
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: number, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: number) => void;
  setEventsLoading: (loading: boolean) => void;
  setEventsError: (error: string | null) => void;

  // Actions - Class Times
  setUserClassTimes: (classTimes: ClassTime[]) => void;
  setClassTimesLoading: (loading: boolean) => void;

  // Actions - Holiday Requests
  setHolidayRequests: (requests: HolidayRequest[]) => void;
  addHolidayRequest: (request: HolidayRequest) => void;
  updateHolidayRequest: (id: number, updates: Partial<HolidayRequest>) => void;
  deleteHolidayRequest: (id: number) => void;
  setHolidayRequestsLoading: (loading: boolean) => void;

  // Actions - Coverage
  setCoverageAssignments: (assignments: CoverageAssignment[]) => void;
  setAvailableCoaches: (coaches: AvailableCoach[]) => void;
  updateCoverageAssignment: (id: number, updates: Partial<CoverageAssignment>) => void;

  // Actions - UI State
  setFilters: (filters: Partial<CalendarFilters>) => void;
  setSelectedEvent: (event: CalendarEvent | null) => void;
  setSelectedDateRange: (range: DateRange | null) => void;
  setCalendarView: (view: CalendarView) => void;
  setSelectedDate: (date: Date) => void;
  toggleEventType: (type: EventType) => void;
  setHolidayRequestDraft: (draft: typeof holidayRequestDraft | null) => void;

  // Actions - Sync
  addToSyncQueue: (operation: CalendarSyncOperation) => void;
  removeFromSyncQueue: (clientId: string) => void;
  clearSyncQueue: () => void;
  setSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: string) => void;

  // Actions - Cache
  markMonthCached: (month: string) => void;
  isMonthCached: (month: string) => boolean;
  clearExpiredCache: () => void;
  invalidateCache: () => void;

  // Computed/Helper Methods
  getEventsForDate: (date: Date) => CalendarEvent[];
  getEventsForDateRange: (start: Date, end: Date) => CalendarEvent[];
  getEventsForMonth: (year: number, month: number) => CalendarEvent[];
  getFilteredEvents: () => CalendarEvent[];
  getEventById: (id: number | string) => CalendarEvent | undefined;
  getPendingHolidayRequests: () => HolidayRequest[];
  getCoverageNeededEvents: () => CalendarEvent[];
  hasUnsyncedChanges: () => boolean;
  generateClassEventsForDate: (date: Date) => CalendarEvent[];
  generateClassEventsForDateRange: (start: Date, end: Date) => CalendarEvent[];
  getCombinedEventsForDate: (date: Date) => CalendarEvent[];
  getCombinedEventsForDateRange: (start: Date, end: Date) => CalendarEvent[];
}

// Initial state for filters
const initialFilters: CalendarFilters = {
  view: 'month',
  selectedDate: new Date(),
  showTypes: ['class', 'holiday', 'overtime', 'custom'],
  selectedUsers: [],
  selectedClubs: [],
  showTeamEvents: false,
  showCoverageNeeded: false,
};

// Custom storage to handle Date serialization
const calendarStorage = {
  getItem: async (name: string) => {
    const str = await AsyncStorage.getItem(name);
    if (!str) return null;

    const data = JSON.parse(str);

    // Convert selectedDate back to Date object if it exists
    if (data?.state?.filters?.selectedDate) {
      data.state.filters.selectedDate = new Date(data.state.filters.selectedDate);
    }

    // Convert date range if it exists
    if (data?.state?.selectedDateRange) {
      if (data.state.selectedDateRange.start) {
        data.state.selectedDateRange.start = new Date(data.state.selectedDateRange.start);
      }
      if (data.state.selectedDateRange.end) {
        data.state.selectedDateRange.end = new Date(data.state.selectedDateRange.end);
      }
    }

    return data;
  },
  setItem: async (name: string, value: any) => {
    await AsyncStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: async (name: string) => {
    await AsyncStorage.removeItem(name);
  },
};

export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set, get) => ({
      // Initial State
      events: [],
      eventsLoading: false,
      eventsError: null,
      userClassTimes: [],
      classTimesLoading: false,
      holidayRequests: [],
      holidayRequestsLoading: false,
      pendingHolidayRequests: [],
      coverageAssignments: [],
      availableCoaches: [],
      coverageLoading: false,
      filters: initialFilters,
      selectedEvent: null,
      selectedDateRange: null,
      holidayRequestDraft: null,
      syncQueue: [],
      lastSyncTime: null,
      isSyncing: false,
      cachedMonths: [],
      cacheExpiry: {},

      // Event Actions
      setEvents: (events) => set({ events, eventsError: null }),

      addEvent: (event) => set((state) => ({
        events: [...state.events, event],
        syncQueue: [
          ...state.syncQueue,
          {
            client_id: `temp-${Date.now()}`,
            operation: 'create',
            entity: 'event',
            data: event,
            timestamp: Date.now(),
          },
        ],
      })),

      updateEvent: (id, updates) => set((state) => ({
        events: state.events.map((e) =>
          e.id === id ? { ...e, ...updates } : e
        ),
        syncQueue: [
          ...state.syncQueue,
          {
            id,
            operation: 'update',
            entity: 'event',
            data: updates,
            timestamp: Date.now(),
          },
        ],
      })),

      deleteEvent: (id) => set((state) => ({
        events: state.events.filter((e) => e.id !== id),
        syncQueue: [
          ...state.syncQueue,
          {
            id,
            operation: 'delete',
            entity: 'event',
            data: null,
            timestamp: Date.now(),
          },
        ],
      })),

      setEventsLoading: (loading) => set({ eventsLoading: loading }),
      setEventsError: (error) => set({ eventsError: error }),

      // Class Times Actions
      setUserClassTimes: (classTimes) => set({ userClassTimes: classTimes }),
      setClassTimesLoading: (loading) => set({ classTimesLoading: loading }),

      // Holiday Request Actions
      setHolidayRequests: (requests) => set({
        holidayRequests: requests,
        pendingHolidayRequests: requests.filter(r => r.status === 'pending')
      }),

      addHolidayRequest: (request) => set((state) => ({
        holidayRequests: [...state.holidayRequests, request],
        pendingHolidayRequests: request.status === 'pending'
          ? [...state.pendingHolidayRequests, request]
          : state.pendingHolidayRequests,
        syncQueue: [
          ...state.syncQueue,
          {
            client_id: `holiday-${Date.now()}`,
            operation: 'create',
            entity: 'holiday_request',
            data: request,
            timestamp: Date.now(),
          },
        ],
      })),

      updateHolidayRequest: (id, updates) => set((state) => {
        const updatedRequests = state.holidayRequests.map((r) =>
          r.id === id ? { ...r, ...updates } : r
        );
        return {
          holidayRequests: updatedRequests,
          pendingHolidayRequests: updatedRequests.filter(r => r.status === 'pending'),
          syncQueue: [
            ...state.syncQueue,
            {
              id,
              operation: 'update',
              entity: 'holiday_request',
              data: updates,
              timestamp: Date.now(),
            },
          ],
        };
      }),

      deleteHolidayRequest: (id) => set((state) => ({
        holidayRequests: state.holidayRequests.filter((r) => r.id !== id),
        pendingHolidayRequests: state.pendingHolidayRequests.filter((r) => r.id !== id),
      })),

      setHolidayRequestsLoading: (loading) => set({ holidayRequestsLoading: loading }),

      // Coverage Actions
      setCoverageAssignments: (assignments) => set({ coverageAssignments: assignments }),
      setAvailableCoaches: (coaches) => set({ availableCoaches: coaches }),

      updateCoverageAssignment: (id, updates) => set((state) => ({
        coverageAssignments: state.coverageAssignments.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
        syncQueue: [
          ...state.syncQueue,
          {
            id,
            operation: 'update',
            entity: 'coverage',
            data: updates,
            timestamp: Date.now(),
          },
        ],
      })),

      // UI State Actions
      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters },
      })),

      setSelectedEvent: (event) => set({ selectedEvent: event }),
      setSelectedDateRange: (range) => set({ selectedDateRange: range }),

      setCalendarView: (view) => set((state) => ({
        filters: { ...state.filters, view },
      })),

      setSelectedDate: (date) => set((state) => ({
        filters: { ...state.filters, selectedDate: date },
      })),

      toggleEventType: (type) => set((state) => {
        const showTypes = state.filters.showTypes.includes(type)
          ? state.filters.showTypes.filter((t) => t !== type)
          : [...state.filters.showTypes, type];
        return {
          filters: { ...state.filters, showTypes },
        };
      }),

      setHolidayRequestDraft: (draft) => set({ holidayRequestDraft: draft }),

      // Sync Actions
      addToSyncQueue: (operation) => set((state) => ({
        syncQueue: [...state.syncQueue, operation],
      })),

      removeFromSyncQueue: (clientId) => set((state) => ({
        syncQueue: state.syncQueue.filter((op) => op.client_id !== clientId),
      })),

      clearSyncQueue: () => set({ syncQueue: [] }),
      setSyncing: (syncing) => set({ isSyncing: syncing }),
      setLastSyncTime: (time) => set({ lastSyncTime: time }),

      // Cache Actions
      markMonthCached: (month) => set((state) => ({
        cachedMonths: [...new Set([...state.cachedMonths, month])],
        cacheExpiry: {
          ...state.cacheExpiry,
          [month]: Date.now() + 86400000, // 24 hour expiry for better offline experience
        },
      })),

      isMonthCached: (month) => {
        const state = get();
        if (!state.cachedMonths.includes(month)) return false;
        const expiry = state.cacheExpiry[month];
        return expiry ? expiry > Date.now() : false;
      },

      clearExpiredCache: () => set((state) => {
        const now = Date.now();
        const validMonths = state.cachedMonths.filter((month) => {
          const expiry = state.cacheExpiry[month];
          return expiry && expiry > now;
        });
        return {
          cachedMonths: validMonths,
          cacheExpiry: Object.fromEntries(
            Object.entries(state.cacheExpiry).filter(
              ([month]) => validMonths.includes(month)
            )
          ),
        };
      }),

      invalidateCache: () => set({
        cachedMonths: [],
        cacheExpiry: {},
      }),

      // Helper Methods
      getEventsForDate: (date) => {
        const state = get();
        const dateStr = format(date, 'yyyy-MM-dd');
        return state.events.filter((event) => {
          if (!event.start_date) return false;
          try {
            // Handle different date formats more robustly
            let eventDateStr = event.start_date;

            // Extract just the date part if it includes time
            if (eventDateStr.includes('T')) {
              eventDateStr = eventDateStr.split('T')[0];
            }

            // For dates like "2025-09-21", we can compare directly
            if (eventDateStr === dateStr) {
              return true;
            }

            // Try parsing as a full date if needed
            const eventDate = new Date(event.start_date);
            if (!isNaN(eventDate.getTime())) {
              return format(eventDate, 'yyyy-MM-dd') === dateStr;
            }

            return false;
          } catch (error) {
            console.warn('Invalid date in event:', event.id, event.start_date);
            return false;
          }
        });
      },

      getEventsForDateRange: (start, end) => {
        const state = get();
        return state.events.filter((event) => {
          if (!event.start_date) return false;
          try {
            // Handle different date formats
            let eventDateStr = event.start_date;

            // Extract just the date part if it includes time
            if (eventDateStr.includes('T')) {
              eventDateStr = eventDateStr.substring(0, 10); // Get YYYY-MM-DD part
            }

            // Parse the date
            const eventDate = new Date(eventDateStr + 'T00:00:00');
            if (!isNaN(eventDate.getTime())) {
              return isWithinInterval(eventDate, { start, end });
            }

            // Fallback: try parsing the original date string
            const fallbackDate = new Date(event.start_date);
            if (!isNaN(fallbackDate.getTime())) {
              return isWithinInterval(fallbackDate, { start, end });
            }

            return false;
          } catch (error) {
            console.warn('Invalid date in event:', event.id, event.start_date);
            return false;
          }
        });
      },

      getEventsForMonth: (year, month) => {
        const state = get();
        const monthStart = startOfMonth(new Date(year, month - 1));
        const monthEnd = endOfMonth(new Date(year, month - 1));
        return state.getEventsForDateRange(monthStart, monthEnd);
      },

      getEventById: (id: number | string) => {
        const state = get();

        // Handle string IDs (generated events and holiday events)
        if (typeof id === 'string') {
          // Handle generated events
          if (id.startsWith('generated-')) {
            // Extract the date from the ID to find the generated event
            const parts = id.split('-');
            if (parts.length >= 5) {
              const dateStr = `${parts[parts.length - 3]}-${parts[parts.length - 2].padStart(2, '0')}-${parts[parts.length - 1].padStart(2, '0')}`;
              const date = new Date(dateStr);

              if (!isNaN(date.getTime())) {
                const dayEvents = state.getCombinedEventsForDate(date);
                return dayEvents.find(e => e.id === id);
              }
            }
            return undefined;
          }

          // Handle holiday events (IDs like "holiday-3" or "holiday-3-day-0")
          if (id.startsWith('holiday-')) {
            return state.events.find(e => e.id === id);
          }

          // Try to find by string ID
          return state.events.find(e => String(e.id) === id);
        }

        // Handle regular numeric IDs
        return state.events.find(e => e.id === id);
      },

      getFilteredEvents: () => {
        const state = get();
        let filtered = [...state.events];

        // Filter by event types
        filtered = filtered.filter((e) => state.filters.showTypes.includes(e.type));

        // Filter by selected users
        if (state.filters.selectedUsers.length > 0) {
          filtered = filtered.filter((e) =>
            e.coach?.id && state.filters.selectedUsers.includes(e.coach.id)
          );
        }

        // Filter by selected clubs
        if (state.filters.selectedClubs.length > 0) {
          filtered = filtered.filter((e) =>
            e.club?.id && state.filters.selectedClubs.includes(e.club.id)
          );
        }

        // Filter by coverage needed
        if (state.filters.showCoverageNeeded) {
          filtered = filtered.filter((e) => e.metadata?.needs_coverage === true);
        }

        return filtered;
      },

      getPendingHolidayRequests: () => {
        const state = get();
        return state.holidayRequests.filter((r) => r.status === 'pending');
      },

      getCoverageNeededEvents: () => {
        const state = get();
        return state.events.filter((e) =>
          e.metadata?.needs_coverage === true &&
          e.status === 'confirmed'
        );
      },

      hasUnsyncedChanges: () => {
        const state = get();
        return state.syncQueue.length > 0;
      },

      // Generate class events from user's assigned class times
      generateClassEventsForDate: (date) => {
        const state = get();
        const generatedEvents: CalendarEvent[] = [];
        const dayOfWeek = getDay(date); // 0 = Sunday, 1 = Monday, etc.
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDayName = dayNames[dayOfWeek];

        // Find class times for this day of week
        state.userClassTimes.forEach((classTime) => {
          if (classTime.day?.toLowerCase() === currentDayName) {
            // Create a generated event for this class
            const startDateTime = `${format(date, 'yyyy-MM-dd')} ${classTime.start_time}`;
            const endDateTime = classTime.end_time ? `${format(date, 'yyyy-MM-dd')} ${classTime.end_time}` : startDateTime;

            generatedEvents.push({
              id: `generated-class-${classTime.id}-${format(date, 'yyyy-MM-dd')}`,
              title: classTime.name || 'Class Time',
              description: `${classTime.club?.name || ''}`,
              type: 'class',
              start_date: startDateTime,
              end_date: endDateTime,
              all_day: false,
              status: 'confirmed',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              metadata: {
                generated: true,
                class_time_id: classTime.id,
                club_id: classTime.club_id
              },
              coach: {
                id: 0,
                name: classTime.coaches || '',
                email: ''
              },
              club: classTime.club
            } as CalendarEvent);
          }
        });

        return generatedEvents;
      },

      generateClassEventsForDateRange: (start, end) => {
        const state = get();
        const generatedEvents: CalendarEvent[] = [];
        const days = eachDayOfInterval({ start, end });

        days.forEach((date) => {
          const dayEvents = state.generateClassEventsForDate(date);
          generatedEvents.push(...dayEvents);
        });

        return generatedEvents;
      },

      // Get combined events (custom + generated class times)
      getCombinedEventsForDate: (date) => {
        const state = get();
        const dateStr = format(date, 'yyyy-MM-dd');

        // Get custom events from backend
        const customEvents = state.events.filter((event) => {
          if (!event.start_date) return false;
          try {
            // Handle different date formats more robustly
            let eventDateStr = event.start_date;

            // Extract just the date part if it includes time
            if (eventDateStr.includes('T')) {
              eventDateStr = eventDateStr.split('T')[0];
            }

            // For dates like "2025-09-21", we can compare directly
            if (eventDateStr === dateStr) {
              return true;
            }

            // Try parsing as a full date if needed
            const eventDate = new Date(event.start_date);
            if (!isNaN(eventDate.getTime())) {
              return format(eventDate, 'yyyy-MM-dd') === dateStr;
            }

            return false;
          } catch (error) {
            console.warn('Invalid date in event:', event.id, event.start_date);
            return false;
          }
        });

        // Generate class events for this date
        const generatedEvents = state.generateClassEventsForDate(date);

        // Filter out generated events that have a corresponding custom event
        // (in case the backend already has an event for this class time)
        const filteredGeneratedEvents = generatedEvents.filter((genEvent) => {
          const metadata = genEvent.metadata as any;
          if (!metadata?.class_time_id) return true;

          // Check if there's already a custom event for this class time on this date
          return !customEvents.some((customEvent) => {
            const customMeta = customEvent.metadata as any;
            return customMeta?.class_time_id === metadata.class_time_id;
          });
        });

        return [...customEvents, ...filteredGeneratedEvents];
      },

      getCombinedEventsForDateRange: (start, end) => {
        const state = get();
        const combinedEvents: CalendarEvent[] = [];
        const days = eachDayOfInterval({ start, end });

        days.forEach((date) => {
          const dayEvents = state.getCombinedEventsForDate(date);
          combinedEvents.push(...dayEvents);
        });

        return combinedEvents;
      },
    }),
    {
      name: 'calendar-storage',
      storage: calendarStorage,
      partialize: (state) => ({
        events: state.events,
        holidayRequests: state.holidayRequests,
        coverageAssignments: state.coverageAssignments,
        syncQueue: state.syncQueue,
        lastSyncTime: state.lastSyncTime,
        cachedMonths: state.cachedMonths,
        cacheExpiry: state.cacheExpiry,
        filters: state.filters,
      }),
    }
  )
);