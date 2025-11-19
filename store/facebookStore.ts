import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { ENDPOINTS } from '../config/api';
import apiClient from '../services/api/client';
import {
  FacebookPage,
  AdvertisingMetrics,
  TimeRange,
  TimeSeriesResponse
} from '../types/facebook';
import { facebookService } from '../services/api/facebook.service';
import { useApiHealthStore } from './apiHealthStore';

interface FacebookPageWithMetrics extends FacebookPage {
  metrics?: {
    total_spend: number;
    total_bookings: number;
    cost_per_booking: number | null;
    club_bookings?: {
      club_id: number;
      club_name: string;
      bookings: number;
    }[];
    timeRange: TimeRange;
    lastFetched: string;
  };
}

interface FacebookState {
  pages: FacebookPageWithMetrics[];
  isLoading: boolean;
  isLoadingMetrics: boolean;
  error: string | null;
  searchQuery: string;
  selectedTimeRange: TimeRange;
  isOffline: boolean;
  lastSync: string | null;
  metricsDebounceTimer: ReturnType<typeof setTimeout> | null;
  timeSeriesData: Map<string, TimeSeriesResponse>;
  isLoadingTimeSeries: boolean;
  timeSeriesError: string | null;

  fetchFacebookPages: () => Promise<void>;
  refreshPages: () => Promise<void>;
  fetchMetricsForPage: (pageUuid: string, timeRange: TimeRange) => Promise<void>;
  fetchAllMetrics: (timeRange: TimeRange) => Promise<void>;
  fetchTimeSeriesForPage: (pageUuid: string, startDate: string, endDate: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setTimeRange: (range: TimeRange) => void;
  getFilteredPages: () => FacebookPageWithMetrics[];
  getTimeSeriesForPage: (pageUuid: string) => TimeSeriesResponse | undefined;
  clearError: () => void;
  clearTimeSeriesError: () => void;
}

const getDateRange = (range: TimeRange): { start: string; end: string } => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  switch (range) {
    case 'today':
      return { start: formatDate(today), end: formatDate(today) };
    case 'yesterday':
      return { start: formatDate(yesterday), end: formatDate(yesterday) };
    case 'last7days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start: formatDate(start), end: formatDate(today) };
    }
    case 'last30days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { start: formatDate(start), end: formatDate(today) };
    }
    default:
      return { start: formatDate(today), end: formatDate(today) };
  }
};

export const useFacebookStore = create<FacebookState>()(
  persist(
    (set, get) => ({
      pages: [],
      isLoading: false,
      isLoadingMetrics: false,
      error: null,
      searchQuery: '',
      selectedTimeRange: 'last7days',
      isOffline: false,
      lastSync: null,
      metricsDebounceTimer: null,
      timeSeriesData: new Map(),
      isLoadingTimeSeries: false,
      timeSeriesError: null,

      fetchFacebookPages: async () => {
        // Check API health first
        const apiHealth = useApiHealthStore.getState();
        if (!apiHealth.canMakeApiCall()) {
          // Use cached data when API is suspended
          return;
        }

        const netInfo = await NetInfo.fetch();

        if (!netInfo.isConnected) {
          set({ isOffline: true });
          // Use cached data
          return;
        }

        set({ isLoading: true, error: null, isOffline: false });

        try {
          const response = await apiClient.get<{ data: FacebookPage[] }>(
            ENDPOINTS.facebookPages
          );

          const pages = response.data.data;

          // Preserve existing metrics when updating pages
          const currentPages = get().pages;
          const pagesWithMetrics = pages.map(page => {
            const existing = currentPages.find(p => p.uuid === page.uuid);
            return {
              ...page,
              metrics: existing?.metrics
            };
          });

          set({
            pages: pagesWithMetrics,
            lastSync: new Date().toISOString(),
            isLoading: false,
          });

          // Auto-fetch metrics for the selected time range
          const timeRange = get().selectedTimeRange;
          await get().fetchAllMetrics(timeRange);

        } catch (error: any) {
          set({
            error: error.message || 'Failed to fetch Facebook pages',
            isLoading: false,
          });
        }
      },

      refreshPages: async () => {
        await get().fetchFacebookPages();
      },

      fetchMetricsForPage: async (pageUuid: string, timeRange: TimeRange) => {
        // Check API health first
        const apiHealth = useApiHealthStore.getState();
        if (!apiHealth.canMakeApiCall()) {
          return;
        }

        const netInfo = await NetInfo.fetch();

        if (!netInfo.isConnected) {
          set({ isOffline: true });
          return;
        }

        const { start, end } = getDateRange(timeRange);

        try {
          const params = new URLSearchParams({
            start_date: start,
            end_date: end,
            'facebook_page_uuids[]': pageUuid,
          });

          const response = await apiClient.get<AdvertisingMetrics>(
            `${ENDPOINTS.advertisingMetrics}?${params.toString()}`
          );

          const pages = get().pages;
          const updatedPages = pages.map(page => {
            if (page.uuid === pageUuid) {
              return {
                ...page,
                metrics: {
                  total_spend: response.data.total_spend,
                  total_bookings: response.data.total_bookings,
                  cost_per_booking: response.data.cost_per_booking,
                  club_bookings: response.data.club_bookings,
                  timeRange,
                  lastFetched: new Date().toISOString(),
                }
              };
            }
            return page;
          });

          set({ pages: updatedPages });
        } catch (error: any) {
          console.error(`Failed to fetch metrics for page ${pageUuid}:`, error);
        }
      },

      fetchAllMetrics: async (timeRange: TimeRange) => {
        // Check API health first
        const apiHealth = useApiHealthStore.getState();
        if (!apiHealth.canMakeApiCall()) {
          return;
        }

        const netInfo = await NetInfo.fetch();

        if (!netInfo.isConnected) {
          set({ isOffline: true });
          return;
        }

        set({ isLoadingMetrics: true });

        const pages = get().pages;
        const { start, end } = getDateRange(timeRange);

        // Clear metrics immediately to show skeleton
        const clearedPages = pages.map(page => ({
          ...page,
          metrics: undefined
        }));
        set({ pages: clearedPages })

        // Fetch metrics for all pages
        const pageUuids = pages.map(p => p.uuid);

        if (pageUuids.length === 0) {
          set({ isLoadingMetrics: false });
          return;
        }

        try {
          // Use the new batch endpoint - single request for all pages!
          // Group all page UUIDs into a single request as per API spec
          const batchRequest = {
            requests: [{
              page_uuids: pageUuids, // All UUIDs in one request
              start_date: start,
              end_date: end,
            }]
          };

          const response = await apiClient.post<{
            data: Array<{
              page_uuid: string;
              metrics: AdvertisingMetrics;
              error?: string;
            }>;
          }>(`${ENDPOINTS.advertisingMetrics}/batch`, batchRequest);

          // Process batch response
          const metricsMap = new Map();

          response.data.data.forEach(item => {
            if (!item.error && item.metrics) {
              metricsMap.set(item.page_uuid, {
                total_spend: item.metrics.total_spend,
                total_bookings: item.metrics.total_bookings,
                cost_per_booking: item.metrics.cost_per_booking,
                club_bookings: item.metrics.club_bookings,
                timeRange,
                lastFetched: new Date().toISOString(),
              });
            } else if (item.error) {
              console.error(`Failed to fetch metrics for page ${item.page_uuid}:`, item.error);
            }
          });

          // Update all pages at once with their metrics
          const currentPages = get().pages;
          const updatedPages = currentPages.map(page => ({
            ...page,
            metrics: metricsMap.get(page.uuid)
          }));

          set({ pages: updatedPages, isLoadingMetrics: false });

        } catch (error: any) {
          console.error('Failed to fetch metrics:', error);
          set({ isLoadingMetrics: false });
        }
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      setTimeRange: (range: TimeRange) => {
        const { metricsDebounceTimer } = get();

        // Clear existing timer
        if (metricsDebounceTimer) {
          clearTimeout(metricsDebounceTimer);
        }

        // Update the selected range immediately
        set({ selectedTimeRange: range });

        // Debounce the metrics fetch by 300ms to avoid rapid requests
        const timer = setTimeout(() => {
          get().fetchAllMetrics(range);
          set({ metricsDebounceTimer: null });
        }, 300);

        set({ metricsDebounceTimer: timer as any });
      },

      fetchTimeSeriesForPage: async (pageUuid: string, startDate: string, endDate: string) => {
        // Check API health first
        const apiHealth = useApiHealthStore.getState();
        if (!apiHealth.canMakeApiCall()) {
          return;
        }

        const netInfo = await NetInfo.fetch();

        if (!netInfo.isConnected) {
          set({ isOffline: true, timeSeriesError: 'No internet connection' });
          return;
        }

        set({ isLoadingTimeSeries: true, timeSeriesError: null, isOffline: false });

        try {
          const timeSeriesResponse = await facebookService.fetchTimeSeriesMetrics(
            pageUuid,
            startDate,
            endDate
          );

          const currentData = get().timeSeriesData;
          const newData = new Map(currentData);
          newData.set(pageUuid, timeSeriesResponse);

          set({
            timeSeriesData: newData,
            isLoadingTimeSeries: false,
          });
        } catch (error: any) {
          console.error(`Failed to fetch time series for page ${pageUuid}:`, error);
          set({
            timeSeriesError: error.message || 'Failed to fetch time series data',
            isLoadingTimeSeries: false,
          });
        }
      },

      getFilteredPages: () => {
        const { pages, searchQuery } = get();

        if (!searchQuery) {
          return pages;
        }

        return pages.filter(page =>
          page.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      },

      getTimeSeriesForPage: (pageUuid: string) => {
        return get().timeSeriesData.get(pageUuid);
      },

      clearError: () => set({ error: null }),

      clearTimeSeriesError: () => set({ timeSeriesError: null }),
    }),
    {
      name: 'facebook-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        pages: state.pages,
        lastSync: state.lastSync,
        selectedTimeRange: state.selectedTimeRange,
      }),
    }
  )
);