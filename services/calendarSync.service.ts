import NetInfo from '@react-native-community/netinfo';
import { useCalendarStore } from '@/store/calendarStore';
import { calendarService } from '@/services/api/calendar.service';
import { CalendarSyncOperation } from '@/types/calendar';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { classTimesService } from '@/services/api/classTimes.service';

class CalendarSyncService {
  private syncInProgress = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private networkListener: (() => void) | null = null;

  /**
   * Initialize the sync service
   * Sets up network listeners and periodic sync
   */
  async initialize() {
    // Set up network state listener
    this.networkListener = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        // When coming back online, sync any pending changes
        this.syncIfNeeded();
      }
    });

    // Set up periodic sync (every 5 minutes)
    this.syncInterval = setInterval(() => {
      this.syncIfNeeded();
    }, 300000); // 5 minutes

    // Load user's assigned class times
    this.loadUserClassTimes().catch(console.error);

    // Initial load - just fetch current month, don't block
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    // Load current month immediately
    this.loadMonth(year, month).catch(console.error);

    // Prefetch adjacent months in background
    this.prefetchAdjacentMonths(year, month);
  }

  /**
   * Clean up listeners and intervals
   */
  dispose() {
    if (this.networkListener) {
      this.networkListener();
      this.networkListener = null;
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Check if sync is needed and perform it
   */
  private async syncIfNeeded() {
    const store = useCalendarStore.getState();

    // Don't sync if already in progress
    if (this.syncInProgress || store.isSyncing) {
      return;
    }

    // Check if we have unsynced changes
    if (!store.hasUnsyncedChanges()) {
      // Still fetch latest data if online
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected && netInfo.isInternetReachable) {
        await this.fetchLatestData();
      }
      return;
    }

    // Perform sync
    await this.performSync();
  }

  /**
   * Perform full synchronization
   */
  async performSync(): Promise<boolean> {
    const store = useCalendarStore.getState();

    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected || !netInfo.isInternetReachable) {
      console.log('No network connection, skipping sync');
      return false;
    }

    this.syncInProgress = true;
    store.setSyncing(true);

    try {
      // Get sync queue
      const syncQueue = [...store.syncQueue];

      if (syncQueue.length === 0) {
        await this.fetchLatestData();
        return true;
      }

      // Batch sync operations
      const response = await calendarService.batchSyncEvents(
        syncQueue,
        store.lastSyncTime || undefined
      );

      // Process sync response
      for (const synced of response.synced) {
        if (synced.status === 'success' && synced.client_id) {
          store.removeFromSyncQueue(synced.client_id);

          // Update local IDs with server IDs for new items
          if (synced.client_id.startsWith('temp-')) {
            const events = store.events;
            const event = events.find((e: any) => e.id === synced.client_id);
            if (event && synced.server_id) {
              store.updateEvent(synced.client_id as any, { id: synced.server_id });
            }
          }
        }
      }

      // Handle conflicts (server wins strategy)
      for (const conflict of response.conflicts) {
        if (conflict.resolution === 'server_wins') {
          // Update local data with server version
          store.updateEvent(conflict.id, conflict.server_version);
        }
      }

      // Update sync time
      store.setLastSyncTime(response.server_time);

      // Fetch latest data after sync
      await this.fetchLatestData();

      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      return false;
    } finally {
      this.syncInProgress = false;
      store.setSyncing(false);
    }
  }

  /**
   * Fetch latest calendar data from server
   */
  private async fetchLatestData() {
    const store = useCalendarStore.getState();

    try {
      // Ensure currentDate is a valid Date object
      let currentDate = store.filters.selectedDate;

      // Handle if selectedDate is stored as string or is invalid
      if (!currentDate || typeof currentDate === 'string') {
        currentDate = currentDate ? new Date(currentDate) : new Date();
      }

      // Validate the date
      if (!(currentDate instanceof Date) || isNaN(currentDate.getTime())) {
        console.warn('Invalid selectedDate in store, using current date');
        currentDate = new Date();
      }

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      // Just load the current month, adjacent months will be loaded on demand
      await this.loadMonth(year, month);

      // Also load holiday requests for this month
      await this.loadHolidayRequests(year, month);

      // Clean up expired cache
      store.clearExpiredCache();

    } catch (error) {
      console.error('Failed to fetch latest data:', error);
      // Don't set error in store for better offline experience
      // store.setEventsError('Failed to load calendar data');
    }
  }

  /**
   * Force a manual sync
   */
  async forceSync(): Promise<boolean> {
    const store = useCalendarStore.getState();
    store.invalidateCache(); // Clear cache to force fresh data
    return await this.performSync();
  }

  /**
   * Load events for a specific month
   */
  async loadMonth(year: number, month: number): Promise<void> {
    const store = useCalendarStore.getState();
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    // Check cache first
    if (store.isMonthCached(monthKey)) {
      console.log(`Month ${monthKey} is already cached`);
      return;
    }

    // Check if we're offline
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected || !netInfo.isInternetReachable) {
      console.log('Offline - using cached data only');
      // Don't throw error, just use whatever cached data we have
      return;
    }

    console.log(`Loading events for ${monthKey}`);

    try {
      const events = await calendarService.getMonthEvents(year, month);

      // Get existing events, excluding the month we're loading
      const existingEvents = store.events.filter((e) => {
        if (!e.start_date) return false;
        try {
          const eventDate = new Date(e.start_date);
          // Keep events that are NOT in the month we just loaded
          return !(eventDate.getFullYear() === year && eventDate.getMonth() === month - 1);
        } catch (error) {
          console.warn('Invalid date in event:', e.id, e.start_date);
          return false;
        }
      });

      // Merge events and remove duplicates
      const eventIds = new Set(existingEvents.map(e => e.id));
      const newEvents = events.filter(e => !eventIds.has(e.id));

      store.setEvents([...existingEvents, ...newEvents]);
      store.markMonthCached(monthKey);

      console.log(`Loaded ${newEvents.length} new events for ${monthKey}`);

      // Also load holiday requests for this month
      await this.loadHolidayRequests(year, month);
    } catch (error) {
      console.error('Failed to load month:', error);
      // Don't set error in store - this allows offline usage to continue
      // store.setEventsError('Failed to load calendar data');
    }
  }

  /**
   * Prefetch adjacent months for smoother navigation
   */
  async prefetchAdjacentMonths(year: number, month: number): Promise<void> {
    // Check if we're online before prefetching
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected || !netInfo.isInternetReachable) {
      return; // Don't prefetch when offline
    }

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    // Prefetch in background (don't await)
    setTimeout(() => {
      // Load previous month
      this.loadMonth(prevYear, prevMonth).catch(err =>
        console.log(`Failed to prefetch ${prevYear}-${prevMonth}:`, err)
      );

      // Load next month
      this.loadMonth(nextYear, nextMonth).catch(err =>
        console.log(`Failed to prefetch ${nextYear}-${nextMonth}:`, err)
      );
    }, 500); // Small delay to prioritize current month loading
  }

  /**
   * Load holiday requests for a specific month
   */
  async loadHolidayRequests(year: number, month: number): Promise<void> {
    const store = useCalendarStore.getState();

    // Check if we're offline
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected || !netInfo.isInternetReachable) {
      console.log('Offline - using cached holiday requests');
      return;
    }

    const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
    const endDate = format(new Date(year, month, 0), 'yyyy-MM-dd'); // Last day of month

    try {
      store.setHolidayRequestsLoading(true);

      // Fetch approved holiday requests for this month
      const response = await calendarService.getHolidayRequests({
        status: 'approved',
        date_from: startDate,
        date_to: endDate,
      });

      if (response.data) {
        // Convert approved holiday requests to calendar events for display
        const holidayEvents: any[] = [];

        response.data.forEach(request => {
          // Parse dates properly - handle both YYYY-MM-DD and ISO formats
          let startDateStr = request.start_date;
          let endDateStr = request.end_date;

          // If the date already includes time/timezone info, extract just the date part
          if (startDateStr.includes('T')) {
            startDateStr = startDateStr.split('T')[0];
          }
          if (endDateStr.includes('T')) {
            endDateStr = endDateStr.split('T')[0];
          }

          // Create an event for each day in the holiday period
          const startDate = new Date(startDateStr + 'T00:00:00');
          const endDate = new Date(endDateStr + 'T00:00:00'); // Use start of end day for calculation

          // Calculate the total number of days (inclusive)
          const msPerDay = 1000 * 60 * 60 * 24;
          const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;

          // Create events for each day
          const currentDate = new Date(startDate);
          let dayIndex = 0;

          for (let i = 0; i < totalDays; i++) {
            const dayDateStr = format(currentDate, 'yyyy-MM-dd');

            holidayEvents.push({
              id: `holiday-${request.id}-day-${i}` as any,
              title: request.reason === 'holiday' ? 'Holiday' :
                     request.reason === 'sick' ? 'Sick Leave' :
                     request.reason === 'personal' ? 'Personal Leave' : 'Time Off',
              description: request.notes,
              start_date: `${dayDateStr}T00:00:00`,
              end_date: `${dayDateStr}T23:59:59`,
              all_day: true,
              status: 'confirmed' as const,
              type: 'holiday' as const,
              is_cover: false,
              coach: request.user,
              notes: request.notes,
              metadata: {
                holiday_request_id: request.id,
                reason: request.reason,
                day_of_period: i + 1,
                total_days: totalDays,
              },
            });

            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
          }
        });

        // Get existing events excluding holiday events for this month
        const existingEvents = store.events.filter((e) => {
          const eventId = e.id.toString();

          // Keep non-holiday events
          if (!eventId.startsWith('holiday-')) return true;

          // For holiday events, check if they're not in the current month
          if (!e.start_date) return false;
          try {
            // Extract just the date part if it includes time
            let eventDateStr = e.start_date;
            if (eventDateStr.includes('T')) {
              eventDateStr = eventDateStr.split('T')[0];
            }

            const eventDate = new Date(eventDateStr + 'T00:00:00');
            if (!isNaN(eventDate.getTime())) {
              // Keep holiday events that are NOT in the current month
              return !(eventDate.getFullYear() === year && eventDate.getMonth() === month - 1);
            }
            return false;
          } catch (error) {
            return false;
          }
        });

        // Merge with existing events
        store.setEvents([...existingEvents, ...holidayEvents]);
        store.setHolidayRequests(response.data);

        console.log(`Loaded ${response.data.length} holiday requests for ${year}-${month}`);
      }
    } catch (error) {
      console.error('Failed to load holiday requests:', error);
    } finally {
      store.setHolidayRequestsLoading(false);
    }
  }

  /**
   * Create a local event (offline-capable)
   */
  async createEvent(eventData: any): Promise<void> {
    const store = useCalendarStore.getState();

    // Create temporary local event
    const tempId = `temp-${Date.now()}`;
    const tempEvent = {
      ...eventData,
      id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add to local store
    store.addEvent(tempEvent);

    // Add to sync queue
    store.addToSyncQueue({
      client_id: tempId,
      operation: 'create',
      data: eventData,
    });

    // Try to sync immediately if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected && netInfo.isInternetReachable) {
      await this.performSync();
    }
  }

  /**
   * Update a local event (offline-capable)
   */
  async updateEvent(id: number, updates: any): Promise<void> {
    const store = useCalendarStore.getState();

    // Update locally
    store.updateEvent(id, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    // Add to sync queue
    store.addToSyncQueue({
      id,
      operation: 'update',
      data: updates,
    });

    // Try to sync immediately if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected && netInfo.isInternetReachable) {
      await this.performSync();
    }
  }

  /**
   * Delete a local event (offline-capable)
   */
  async deleteEvent(id: number): Promise<void> {
    const store = useCalendarStore.getState();

    // Delete locally
    store.deleteEvent(id);

    // Add to sync queue
    store.addToSyncQueue({
      id,
      operation: 'delete',
      data: {},
    });

    // Try to sync immediately if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected && netInfo.isInternetReachable) {
      await this.performSync();
    }
  }

  /**
   * Submit a holiday request
   */
  async submitHolidayRequest(requestData: any): Promise<void> {
    const store = useCalendarStore.getState();

    try {
      store.setHolidayRequestsLoading(true);

      // Submit to backend
      const response = await calendarService.createHolidayRequest(requestData);

      // Add to local store
      store.addHolidayRequest(response.data);

      // Clear draft
      store.setHolidayRequestDraft(null);

    } catch (error) {
      console.error('Failed to submit holiday request:', error);
      throw error;
    } finally {
      store.setHolidayRequestsLoading(false);
    }
  }

  /**
   * Load user's assigned class times
   */
  async loadUserClassTimes(): Promise<void> {
    const store = useCalendarStore.getState();

    // Check if we're online
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected || !netInfo.isInternetReachable) {
      console.log('Offline - cannot load class times');
      return;
    }

    try {
      store.setClassTimesLoading(true);

      // Fetch the user's assigned class times
      const classTimes = await classTimesService.getClassTimes();

      console.log(`Loaded ${classTimes.length} assigned class times`);
      store.setUserClassTimes(classTimes);

    } catch (error) {
      console.error('Failed to load user class times:', error);
    } finally {
      store.setClassTimesLoading(false);
    }
  }

  /**
   * Populate calendar with default schedule
   * @deprecated No longer needed - calendar automatically shows user's assigned classes
   */
  async populateDefaultSchedule(params: {
    user_id?: number;
    start_date: string;
    end_date: string;
    exclude_holidays?: boolean;
  }): Promise<void> {
    console.log('populateDefaultSchedule is deprecated - calendar now automatically shows assigned classes');
    // Just reload class times instead
    await this.loadUserClassTimes();
  }
}

// Create singleton instance
export const calendarSyncService = new CalendarSyncService();