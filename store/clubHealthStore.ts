import { create } from 'zustand';
import {
  ClubHealthData,
  ClubHealthSummary,
  DateRange,
} from '@/types/clubHealth';
import { Club } from '@/types/api';
import { clubHealthDataService } from '@/services/api/clubHealthConfig';

interface ClubHealthState {
  // Data
  clubs: Club[];
  clubsHealth: ClubHealthData[];
  clubsSummary: ClubHealthSummary[];
  selectedClubId: number | null;
  selectedDateRange: DateRange;

  // UI State
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Actions
  fetchClubs: () => Promise<void>;
  fetchClubsHealth: (dateRange?: DateRange) => Promise<void>;
  fetchClubHealth: (clubId: number, dateRange?: DateRange) => Promise<void>;
  fetchClubsSummary: () => Promise<void>;
  setSelectedClubId: (clubId: number | null) => void;
  setSelectedDateRange: (dateRange: DateRange) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  clubs: [],
  clubsHealth: [],
  clubsSummary: [],
  selectedClubId: null,
  selectedDateRange: 'last_30_days' as DateRange,
  isLoading: false,
  isRefreshing: false,
  error: null,
};

export const useClubHealthStore = create<ClubHealthState>((set, get) => ({
  ...initialState,

  fetchClubs: async () => {
    set({ isLoading: true, error: null });
    try {
      const clubs = await clubHealthDataService.getClubs();
      set({ clubs, isLoading: false });

      // Set the first club as selected if none is selected
      if (!get().selectedClubId && clubs.length > 0) {
        set({ selectedClubId: clubs[0].id });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch clubs',
        isLoading: false,
      });
    }
  },

  fetchClubsHealth: async (dateRange?: DateRange) => {
    const range = dateRange || get().selectedDateRange;
    const clubs = get().clubs;

    if (clubs.length === 0) {
      // Fetch clubs first if not loaded
      await get().fetchClubs();
    }

    set({ isLoading: true, error: null });

    try {
      const clubsHealth = await clubHealthDataService.getAllClubsHealth(get().clubs, range);
      set({
        clubsHealth,
        selectedDateRange: range,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch clubs health data',
        isLoading: false,
      });
    }
  },

  fetchClubHealth: async (clubId: number, dateRange?: DateRange) => {
    const range = dateRange || get().selectedDateRange;
    set({ isRefreshing: true, error: null });

    try {
      const club = get().clubs.find(c => c.id === clubId);
      if (!club) {
        throw new Error('Club not found');
      }

      const clubHealth = await clubHealthDataService.getClubHealthData(club, range);

      // Update or add the club health data in the array
      const currentClubsHealth = get().clubsHealth;
      const existingIndex = currentClubsHealth.findIndex(
        (ch) => ch.club.id === clubId
      );

      let updatedClubsHealth;
      if (existingIndex >= 0) {
        updatedClubsHealth = [...currentClubsHealth];
        updatedClubsHealth[existingIndex] = clubHealth;
      } else {
        updatedClubsHealth = [...currentClubsHealth, clubHealth];
      }

      set({
        clubsHealth: updatedClubsHealth,
        selectedDateRange: range,
        isRefreshing: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch club health data',
        isRefreshing: false,
      });
    }
  },

  fetchClubsSummary: async () => {
    set({ isLoading: true, error: null });

    try {
      const clubsSummary = await clubHealthDataService.getClubsSummary(get().selectedDateRange);
      set({ clubsSummary, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch clubs summary',
        isLoading: false,
      });
    }
  },

  setSelectedClubId: (clubId: number | null) => {
    set({ selectedClubId: clubId });
  },

  setSelectedDateRange: (dateRange: DateRange) => {
    set({ selectedDateRange: dateRange });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set(initialState);
  },
}));