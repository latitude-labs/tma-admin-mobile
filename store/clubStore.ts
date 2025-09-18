import { create } from 'zustand';
import { Club } from '@/types/api';
import { clubsService } from '@/services/api/clubs.service';
import { offlineStorage } from '@/services/offline/storage';
import { useApiHealthStore } from './apiHealthStore';

interface ClubState {
  clubs: Club[];
  isLoading: boolean;
  error: string | null;
  isOffline: boolean;
  lastSync: string | null;
  fetchClubs: () => Promise<void>;
  refreshClubs: () => Promise<void>;
  getClubById: (id: number) => Club | undefined;
  getClassCountForClub: (clubId: number) => number;
  getStudentCountForClub: (clubId: number) => number;
}

export const useClubStore = create<ClubState>((set, get) => ({
  clubs: [],
  isLoading: false,
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
}));