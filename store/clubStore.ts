import { create } from 'zustand';
import { Club } from '@/types/api';
import { clubsService } from '@/services/api/clubs.service';
import { offlineStorage } from '@/services/offline/storage';
import { useApiHealthStore } from './apiHealthStore';

interface ClubFormData {
  name: string;
  address?: string;
  postcode?: string;
  directions?: string;
  latitude?: number | null;
  longitude?: number | null;
  cadence_channel_ids?: string[];
  acuity_calendar_id?: string;
  google_place_id?: string;
  sync_hours_to_google?: boolean;
  class_prioritisation_enabled?: boolean;
}

interface ClubState {
  clubs: Club[];
  selectedClub: Club | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  isOffline: boolean;
  lastSync: string | null;
  fetchClubs: () => Promise<void>;
  refreshClubs: () => Promise<void>;
  getClubById: (id: number) => Club | undefined;
  getClassCountForClub: (clubId: number) => number;
  getStudentCountForClub: (clubId: number) => number;
  // Admin methods
  fetchAdminClubs: (search?: string) => Promise<void>;
  fetchAdminClub: (id: number) => Promise<void>;
  createClub: (data: ClubFormData) => Promise<Club>;
  updateClub: (id: number, data: Partial<ClubFormData>) => Promise<Club>;
  deleteClub: (id: number) => Promise<void>;
  setSelectedClub: (club: Club | null) => void;
  clearError: () => void;
}

export const useClubStore = create<ClubState>((set, get) => ({
  clubs: [],
  selectedClub: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  isOffline: false,
  lastSync: null,

  fetchClubs: async () => {
    // Check API health first
    const apiHealth = useApiHealthStore.getState();
    const canCallApi = apiHealth.canMakeApiCall();

    set({ isLoading: true, error: null });

    try {
      // Check if online and API is healthy
      const isOnline = await offlineStorage.isOnline();

      if (isOnline && canCallApi) {
        // Fetch from API only if healthy
        try {
          const clubs = await clubsService.getClubs();

          // Save to offline storage
          await offlineStorage.saveClubs(clubs);

          const syncInfo = await offlineStorage.getLastSync();

          set({
            clubs,
            isLoading: false,
            isOffline: false,
            lastSync: syncInfo.clubs || null,
          });
        } catch (apiError) {
          // If API fails, try offline storage
          const cachedClubs = await offlineStorage.getClubs();

          if (cachedClubs) {
            const syncInfo = await offlineStorage.getLastSync();
            set({
              clubs: cachedClubs,
              isLoading: false,
              isOffline: true,
              lastSync: syncInfo.clubs || null,
            });
          } else {
            throw apiError;
          }
        }
      } else {
        // Offline - load from storage
        const cachedClubs = await offlineStorage.getClubs();
        const syncInfo = await offlineStorage.getLastSync();

        if (cachedClubs) {
          set({
            clubs: cachedClubs,
            isLoading: false,
            isOffline: true,
            lastSync: syncInfo.clubs || null,
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
        error: error instanceof Error ? error.message : 'Failed to fetch clubs',
      });
    }
  },

  refreshClubs: async () => {
    // Force refresh from API if online
    const isOnline = await offlineStorage.isOnline();

    if (!isOnline) {
      set({ error: 'Cannot refresh while offline' });
      return;
    }

    await get().fetchClubs();
  },

  getClubById: (id: number) => {
    return get().clubs.find(club => club.id === id);
  },

  getClassCountForClub: (clubId: number) => {
    const club = get().clubs.find(c => c.id === clubId);
    return club?.class_times?.length || 0;
  },

  getStudentCountForClub: (clubId: number) => {
    // This would need to be calculated from actual enrollment data
    // For now, returning a placeholder
    const classCount = get().getClassCountForClub(clubId);
    return classCount * 15; // Assuming average of 15 students per class
  },

  // Admin methods
  fetchAdminClubs: async (search?: string) => {
    set({ isLoading: true, error: null });
    try {
      const clubs = await clubsService.getAdminClubs(search);
      set({ clubs, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch admin clubs',
      });
    }
  },

  fetchAdminClub: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const club = await clubsService.getAdminClub(id);
      set({ selectedClub: club, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch club details',
      });
    }
  },

  createClub: async (data: ClubFormData) => {
    set({ isCreating: true, error: null });
    try {
      const newClub = await clubsService.createClub(data);
      const clubs = [...get().clubs, newClub];
      set({ clubs, isCreating: false });
      return newClub;
    } catch (error) {
      set({
        isCreating: false,
        error: error instanceof Error ? error.message : 'Failed to create club',
      });
      throw error;
    }
  },

  updateClub: async (id: number, data: Partial<ClubFormData>) => {
    set({ isUpdating: true, error: null });
    try {
      const updatedClub = await clubsService.updateClub(id, data);
      const clubs = get().clubs.map(club =>
        club.id === id ? updatedClub : club
      );
      set({ clubs, selectedClub: updatedClub, isUpdating: false });
      return updatedClub;
    } catch (error) {
      set({
        isUpdating: false,
        error: error instanceof Error ? error.message : 'Failed to update club',
      });
      throw error;
    }
  },

  deleteClub: async (id: number) => {
    set({ isDeleting: true, error: null });
    try {
      await clubsService.deleteClub(id);
      const clubs = get().clubs.filter(club => club.id !== id);
      set({ clubs, isDeleting: false });
    } catch (error) {
      set({
        isDeleting: false,
        error: error instanceof Error ? error.message : 'Failed to delete club',
      });
      throw error;
    }
  },

  setSelectedClub: (club: Club | null) => {
    set({ selectedClub: club });
  },

  clearError: () => {
    set({ error: null });
  },
}));