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
  }
};