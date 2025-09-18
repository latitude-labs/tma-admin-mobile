import { Club } from '@/types/api';
import apiClient from './client';

interface ClubsResponse {
  data: Club[];
}

export class ClubsService {
  async getClubs(): Promise<Club[]> {
    try {
      const response = await apiClient.get<ClubsResponse>('/clubs');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch clubs:', error);
      throw error;
    }
  }

  async getClubsCount(): Promise<{ total: number }> {
    try {
      const response = await apiClient.get('/clubs-count');
      console.log('Raw clubs-count response:', response.data);

      // Handle different possible response structures
      const data = response.data.data || response.data;

      return {
        total: data.total || data.count || data.clubs_count || 0
      };
    } catch (error) {
      console.error('Failed to fetch clubs count:', error);
      throw error;
    }
  }
}

export const clubsService = new ClubsService();