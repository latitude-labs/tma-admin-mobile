import client from './client';
import {
  EndOfDayReport,
  CreateEndOfDayReportData,
  EndOfDayReportFilters
} from '@/types/endOfDay';
import { PaginatedResponse } from '@/types/api';

export const endOfDayApi = {
  // List End of Day reports with filters
  async listReports(filters?: EndOfDayReportFilters): Promise<PaginatedResponse<EndOfDayReport>> {
    const params = new URLSearchParams();

    if (filters?.club_id) params.append('club_id', filters.club_id.toString());
    if (filters?.user_id) params.append('user_id', filters.user_id.toString());
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.per_page) params.append('per_page', filters.per_page.toString());

    const queryString = params.toString();
    const url = `/end-of-day-reports${queryString ? `?${queryString}` : ''}`;

    const response = await client.get<PaginatedResponse<EndOfDayReport>>(url);
    return response.data;
  },

  // Get single End of Day report
  async getReport(id: number): Promise<EndOfDayReport> {
    const response = await client.get<{ data: EndOfDayReport }>(`/end-of-day-reports/${id}`);
    return response.data.data;
  },

  // Create End of Day report
  async createReport(data: CreateEndOfDayReportData): Promise<{ message: string; report: EndOfDayReport }> {
    const response = await client.post<{ data: { message: string; report: EndOfDayReport } }>(
      '/end-of-day-reports',
      data
    );
    return response.data.data;
  },

  // Update End of Day report
  async updateReport(
    id: number,
    data: Partial<CreateEndOfDayReportData>
  ): Promise<{ message: string; report: EndOfDayReport }> {
    const response = await client.put<{ data: { message: string; report: EndOfDayReport } }>(
      `/end-of-day-reports/${id}`,
      data
    );
    return response.data.data;
  },

  // Check if report exists for a club and date
  async checkReportExists(clubId: number, date: string): Promise<boolean> {
    try {
      const response = await this.listReports({
        club_id: clubId,
        date_from: date,
        date_to: date,
        per_page: 1,
      });
      return response.data.length > 0;
    } catch (error) {
      console.error('Error checking report existence:', error);
      return false;
    }
  },
};