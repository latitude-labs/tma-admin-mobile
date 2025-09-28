import axios, { AxiosError } from 'axios';
import { getApiUrl } from '@/config/api';
import { useAuthStore } from '@/store/authStore';
import {
  CalendarEvent,
  HolidayRequest,
  OvertimeRequest,
  CoverageAssignment,
  AvailableCoach,
  CreateEventRequest,
  UpdateEventRequest,
  CreateHolidayRequest,
  CreateOvertimeRequest,
  UpdateOvertimeRequest,
  AssignCoverageRequest,
  CalendarSyncOperation,
  CalendarSyncResponse,
  DefaultSchedule,
  AffectedClass,
  EventsResponse,
  HolidayRequestsResponse,
  OvertimeRequestsResponse,
  OvertimeRequestSummary,
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
      const axiosError = error as AxiosError<{ message?: string; error?: string }>;
      // Check for 'error' field first (used by backend), then 'message'
      const errorMessage =
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        axiosError.message ||
        'An error occurred';
      throw new Error(errorMessage);
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

  async createEvent(data: CreateEventRequest): Promise<{ message: string; data: CalendarEvent }> {
    // TODO: Replace with actual API call when backend endpoint is ready
    console.log('[CalendarService] Creating event:', data);

    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockEvent: CalendarEvent = {
          id: Math.floor(Math.random() * 10000),
          title: data.title,
          type: data.type || 'event',
          date: data.date,
          start_time: data.start_time || null,
          end_time: data.end_time || null,
          description: data.description || null,
          location: data.location || null,
          club_id: 1,
          user_id: useAuthStore.getState().user?.id || 1,
          user_name: useAuthStore.getState().user?.name || 'Admin',
          status: 'confirmed',
          is_all_day: data.is_all_day || false,
          visibility: data.visibility || 'all',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log('[CalendarService] Mock event created:', mockEvent);
        resolve({
          message: 'Event created successfully',
          data: mockEvent,
        });
      }, 1000);
    });
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

  // ===== Overtime Request Methods =====

  async getOvertimeRequests(params?: {
    start_date?: string;
    end_date?: string;
    status?: string;
    user_id?: number;
    page?: number;
    per_page?: number;
  }): Promise<OvertimeRequestsResponse> {
    try {
      const response = await axios.get(`${getApiUrl()}/overtime-requests`, {
        params,
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getOvertimeRequestSummary(): Promise<{ data: OvertimeRequestSummary }> {
    try {
      const response = await axios.get(`${getApiUrl()}/overtime-requests/summary`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getOvertimeRequest(id: number): Promise<{ data: OvertimeRequest }> {
    try {
      const response = await axios.get(`${getApiUrl()}/overtime-requests/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async createOvertimeRequest(
    data: CreateOvertimeRequest
  ): Promise<{ message: string; data: OvertimeRequest }> {
    try {
      const response = await axios.post(
        `${getApiUrl()}/overtime-requests`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateOvertimeRequest(
    id: number,
    data: UpdateOvertimeRequest
  ): Promise<{ message: string; data: OvertimeRequest }> {
    try {
      const response = await axios.put(
        `${getApiUrl()}/overtime-requests/${id}`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteOvertimeRequest(id: number): Promise<{ message: string }> {
    try {
      const response = await axios.delete(
        `${getApiUrl()}/overtime-requests/${id}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async cancelOvertimeRequest(
    id: number
  ): Promise<{ message: string; data: OvertimeRequest }> {
    try {
      const response = await axios.post(
        `${getApiUrl()}/overtime-requests/${id}/cancel`,
        {},
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async approveOvertimeRequest(
    id: number,
    data?: { notes?: string }
  ): Promise<{ message: string; data: OvertimeRequest }> {
    try {
      const response = await axios.post(
        `${getApiUrl()}/overtime-requests/${id}/approve`,
        data || {},
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async rejectOvertimeRequest(
    id: number,
    data?: { reason?: string }
  ): Promise<{ message: string; data: OvertimeRequest }> {
    try {
      const response = await axios.post(
        `${getApiUrl()}/overtime-requests/${id}/reject`,
        data || {},
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