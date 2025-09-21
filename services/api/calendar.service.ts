import axios, { AxiosError } from 'axios';
import { getApiUrl } from '@/config/api';
import { useAuthStore } from '@/store/authStore';
import {
  CalendarEvent,
  HolidayRequest,
  CoverageAssignment,
  AvailableCoach,
  CreateEventRequest,
  UpdateEventRequest,
  CreateHolidayRequest,
  AssignCoverageRequest,
  CalendarSyncOperation,
  CalendarSyncResponse,
  DefaultSchedule,
  AffectedClass,
  EventsResponse,
  HolidayRequestsResponse,
  TeamCalendarResponse,
  PopulateScheduleResponse,
  ConflictsCheckResponse,
  PopulateDefaultScheduleRequest,
} from '@/types/calendar';
import { format } from 'date-fns';

class CalendarService {
  private getAuthToken(): string {
    const token = useAuthStore.getState().token;
    if (!token) {
      throw new Error('No authentication token available');
    }
    return token;
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json',
    };
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || 'An error occurred';
      throw new Error(message);
    }
    throw error;
  }

  // ===== Calendar Events (Rota) =====

  async getEvents(params: {
    start_date: string;
    end_date: string;
    club_id?: number;
    status?: string;
    type?: string;
    include_team?: boolean;
    user_id?: number;
  }): Promise<EventsResponse> {
    try {
      const response = await axios.get(`${getApiUrl()}/rota`, {
        params,
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getUpcomingEvents(limit: number = 10): Promise<EventsResponse> {
    try {
      const response = await axios.get(`${getApiUrl()}/rota/upcoming`, {
        params: { limit },
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getCalendarEvents(params: {
    start: string;
    end: string;
    include_team?: boolean;
  }): Promise<any[]> {
    try {
      const response = await axios.get(`${getApiUrl()}/rota/calendar`, {
        params,
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getEvent(id: number): Promise<{ data: CalendarEvent }> {
    try {
      const response = await axios.get(`${getApiUrl()}/rota/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async batchSyncEvents(
    events: CalendarSyncOperation[],
    lastSyncTime?: string
  ): Promise<CalendarSyncResponse> {
    try {
      const response = await axios.post(
        `${getApiUrl()}/rota/batch-sync`,
        {
          events,
          last_sync_timestamp: lastSyncTime,
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getDefaultSchedule(userId?: number): Promise<{ data: DefaultSchedule }> {
    try {
      const params = userId ? { user_id: userId } : {};
      const response = await axios.get(`${getApiUrl()}/rota/default-schedule`, {
        params,
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async populateDefaultSchedule(
    params: PopulateDefaultScheduleRequest
  ): Promise<PopulateScheduleResponse> {
    try {
      const response = await axios.post(
        `${getApiUrl()}/rota/populate-default`,
        params,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getAvailableCoaches(params: {
    date: string;
    class_time_id: number;
  }): Promise<{ data: AvailableCoach[] }> {
    try {
      const response = await axios.get(`${getApiUrl()}/rota/available-coaches`, {
        params,
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async assignCover(eventId: number, data: {
    covering_user_id: number;
    notes?: string;
  }): Promise<{ message: string; data: CalendarEvent }> {
    try {
      const response = await axios.post(
        `${getApiUrl()}/rota/${eventId}/assign-cover`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async confirmCover(eventId: number, data: {
    status: 'confirmed' | 'declined';
    notes?: string;
  }): Promise<{ message: string; data: CalendarEvent }> {
    try {
      const response = await axios.put(
        `${getApiUrl()}/rota/${eventId}/confirm-cover`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ===== Holiday Requests =====

  async getHolidayRequests(params?: {
    status?: string;
    user_id?: number;
    date_from?: string;
    date_to?: string;
    needs_coverage?: boolean;
  }): Promise<HolidayRequestsResponse> {
    try {
      const response = await axios.get(`${getApiUrl()}/holiday-requests`, {
        params,
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getHolidayRequest(id: number): Promise<{ data: HolidayRequest }> {
    try {
      const response = await axios.get(`${getApiUrl()}/holiday-requests/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async createHolidayRequest(
    data: CreateHolidayRequest
  ): Promise<{ message: string; data: HolidayRequest }> {
    try {
      const response = await axios.post(
        `${getApiUrl()}/holiday-requests`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateHolidayRequest(
    id: number,
    data: { status: 'approved' | 'rejected'; rejection_reason?: string }
  ): Promise<{ message: string; data: HolidayRequest }> {
    try {
      const response = await axios.put(
        `${getApiUrl()}/holiday-requests/${id}`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async cancelHolidayRequest(
    id: number
  ): Promise<{ message: string; data: HolidayRequest }> {
    try {
      const response = await axios.post(
        `${getApiUrl()}/holiday-requests/${id}/cancel`,
        {},
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getAffectedClasses(holidayRequestId: number): Promise<{ data: AffectedClass[] }> {
    try {
      const response = await axios.get(
        `${getApiUrl()}/holiday-requests/${holidayRequestId}/affected-classes`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async assignHolidayCoverage(
    holidayRequestId: number,
    data: AssignCoverageRequest
  ): Promise<{ message: string; data: HolidayRequest }> {
    try {
      const response = await axios.post(
        `${getApiUrl()}/holiday-requests/${holidayRequestId}/assign-coverage`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ===== Helper Methods =====

  async getMonthEvents(year: number, month: number, userId?: number): Promise<CalendarEvent[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const params: any = {
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      include_team: true, // Include team events to get all custom rota events
    };

    if (userId) {
      params.user_id = userId;
    }

    const response = await this.getEvents(params);
    return response.data;
  }

  async getCurrentWeekEvents(userId?: number): Promise<CalendarEvent[]> {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));

    const params: any = {
      start_date: format(startOfWeek, 'yyyy-MM-dd'),
      end_date: format(endOfWeek, 'yyyy-MM-dd'),
    };

    if (userId) {
      params.user_id = userId;
    }

    const response = await this.getEvents(params);
    return response.data;
  }

  async getTodayEvents(userId?: number): Promise<CalendarEvent[]> {
    const today = new Date();
    const params: any = {
      start_date: format(today, 'yyyy-MM-dd'),
      end_date: format(today, 'yyyy-MM-dd'),
    };

    if (userId) {
      params.user_id = userId;
    }

    const response = await this.getEvents(params);
    return response.data;
  }

  async getTeamCalendar(params: {
    start_date: string;
    end_date: string;
    include_self?: boolean;
  }): Promise<TeamCalendarResponse> {
    try {
      const response = await axios.get(`${getApiUrl()}/rota`, {
        params: { ...params, include_team: true },
        headers: this.getHeaders(),
      });
      // Map to expected format
      return {
        data: response.data.data,
        team_members: [], // This would need to come from a separate endpoint or be included in response
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}

export const calendarService = new CalendarService();