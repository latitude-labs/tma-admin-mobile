import {
  Coach,
  CoachStats,
  CreateCoachData,
  UpdateCoachData,
  DateRangeFilter,
} from '@/types/coaches';
import apiClient from './client';

// Response interfaces matching the API structure
interface CoachesListResponse {
  data: Coach[];
  links: Record<string, any>;
  meta: Record<string, any>;
}

interface CoachResponse {
  message: string;
  data: Coach;
}

interface DeleteCoachResponse {
  success: boolean;
  message: string;
}

class CoachesService {
  async getAllCoaches(search?: string): Promise<Coach[]> {
    try {
      const params = search ? { search } : {};
      const response = await apiClient.get<CoachesListResponse>('/coaches', { params });
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch coaches:', error);
      throw error;
    }
  }

  async getCoachById(id: number): Promise<Coach> {
    try {
      const response = await apiClient.get<{ data: Coach }>(`/coaches/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch coach:', error);
      throw error;
    }
  }

  async getCoachStats(id: number, dateRange: DateRangeFilter): Promise<CoachStats> {
    try {
      const response = await apiClient.get<CoachStats>(`/coaches/${id}/stats`, {
        params: { date_range: dateRange },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch coach stats:', error);
      throw error;
    }
  }

  async createCoach(data: CreateCoachData): Promise<Coach> {
    try {
      const response = await apiClient.post<CoachResponse>('/coaches', data);
      return response.data.data;
    } catch (error: any) {
      console.error('Failed to create coach:', error);

      // Handle validation errors
      if (error.status === 422) {
        const validationErrors = error.data?.errors;
        if (validationErrors?.email) {
          throw new Error('Email already exists');
        }
        throw new Error(error.message || 'Validation failed');
      }

      throw error;
    }
  }

  async updateCoach(id: number, data: UpdateCoachData): Promise<Coach> {
    try {
      const response = await apiClient.put<CoachResponse>(`/coaches/${id}`, data);
      return response.data.data;
    } catch (error: any) {
      console.error('Failed to update coach:', error);

      // Handle validation errors
      if (error.status === 422) {
        const validationErrors = error.data?.errors;
        if (validationErrors?.email) {
          throw new Error('Email already exists');
        }
        throw new Error(error.message || 'Validation failed');
      }

      throw error;
    }
  }

  async deleteCoach(id: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete<DeleteCoachResponse>(`/coaches/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete coach:', error);
      throw error;
    }
  }
}

export const coachesService = new CoachesService();
