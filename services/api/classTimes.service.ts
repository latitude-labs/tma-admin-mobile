import apiClient from './client';
import { ClassTime } from '@/types/api';

interface ClassTimesParams {
  date_from?: string;
  date_to?: string;
  club_id?: number;
}

interface ClassTimesResponse {
  data: ClassTime[];
}

interface ClassTimeResponse {
  data: ClassTime;
}

export interface ClassTimeFormData {
  club_id: number;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  name: string;
  start_time: string;
  end_time: string;
  helpers?: string[];
  priority?: number;
  is_accepting_bookings?: boolean;
}

export const classTimesService = {
  async getClassTimes(params?: ClassTimesParams): Promise<ClassTime[]> {
    try {
      const response = await apiClient.get<ClassTimesResponse>('/class-times', { params });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching class times:', error);
      throw error;
    }
  },

  async getTodaysClassTimes(clubId?: number): Promise<ClassTime[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getClassTimes({
      date_from: today,
      date_to: today,
      club_id: clubId,
    });
  },

  // Admin endpoints for class time management
  async createClassTime(data: ClassTimeFormData): Promise<ClassTime> {
    try {
      const response = await apiClient.post<ClassTimeResponse>('/admin/class-times', data);
      return response.data.data;
    } catch (error) {
      console.error('Failed to create class time:', error);
      throw error;
    }
  },

  async getClassTime(id: number): Promise<ClassTime> {
    try {
      const response = await apiClient.get<ClassTimeResponse>(`/admin/class-times/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch class time:', error);
      throw error;
    }
  },

  async updateClassTime(id: number, data: Partial<ClassTimeFormData>): Promise<ClassTime> {
    try {
      const response = await apiClient.put<ClassTimeResponse>(`/admin/class-times/${id}`, data);
      return response.data.data;
    } catch (error) {
      console.error('Failed to update class time:', error);
      throw error;
    }
  },

  async deleteClassTime(id: number): Promise<void> {
    try {
      await apiClient.delete(`/admin/class-times/${id}`);
    } catch (error) {
      console.error('Failed to delete class time:', error);
      throw error;
    }
  }
};