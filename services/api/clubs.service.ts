import { Club } from '@/types/api';
import apiClient from './client';

interface ClubsResponse {
  data: Club[];
}

interface ClubResponse {
  data: Club;
}

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

export class ClubsService {
  async getClubs(includeAll: boolean = false): Promise<Club[]> {
    try {
      const params = includeAll ? { include_all: true } : {};
      const response = await apiClient.get<ClubsResponse>('/clubs', { params });
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

  // Admin endpoints
  async getAdminClubs(search?: string): Promise<Club[]> {
    try {
      const params = search ? { search } : {};
      const response = await apiClient.get<ClubsResponse>('/admin/clubs', { params });
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch admin clubs:', error);
      throw error;
    }
  }

  async getAdminClub(id: number): Promise<Club> {
    try {
      const response = await apiClient.get<ClubResponse>(`/admin/clubs/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch club:', error);
      throw error;
    }
  }

  async createClub(data: ClubFormData): Promise<Club> {
    try {
      const response = await apiClient.post<ClubResponse>('/admin/clubs', data);
      return response.data.data;
    } catch (error) {
      console.error('Failed to create club:', error);
      throw error;
    }
  }

  async updateClub(id: number, data: Partial<ClubFormData>): Promise<Club> {
    try {
      const response = await apiClient.put<ClubResponse>(`/admin/clubs/${id}`, data);
      return response.data.data;
    } catch (error) {
      console.error('Failed to update club:', error);
      throw error;
    }
  }

  async deleteClub(id: number): Promise<void> {
    try {
      await apiClient.delete(`/admin/clubs/${id}`);
    } catch (error) {
      console.error('Failed to delete club:', error);
      throw error;
    }
  }
}

export const clubsService = new ClubsService();