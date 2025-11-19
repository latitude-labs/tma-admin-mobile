import apiClient from './client';
import { Booking, PaginatedResponse, BookingStatistics, KitOrder, Reminder } from '@/types/api';
import { offlineStorage } from '@/services/offline/storage';
import { CommandFactory, queueCommand } from '@/services/offline/commandFactory';

interface BookingsParams {
  start_date?: string;
  end_date?: string;
  club_id?: number;
  class_time_id?: number;
  status?: 'pending' | 'paid_dd' | 'paid_awaiting_dd' | 'unpaid_dd' | 'unpaid_coach_call' | 'not_joining';
  per_page?: number;
  page?: number;
  modified_since?: string;
  cursor?: string;
  include_deleted?: boolean;
}

interface SyncResponse {
  data: {
    updated: Booking[];
    deleted: number[];
  };
  meta: {
    sync_timestamp: string;
    has_more: boolean;
    next_cursor?: string;
    counts: {
      updated: number;
      deleted: number;
    };
  };
}

interface UpdateBookingStatusParams {
  status: 'pending' | 'paid_dd' | 'paid_awaiting_dd' | 'unpaid_dd' | 'unpaid_coach_call' | 'not_joining';
  kit_items?: Array<{ type: string; size: string; }>;
  package_name?: 'basic' | 'silver' | 'gold';
  reminder_time?: string;
}

interface UpdateAttendanceStatusParams {
  status: 'completed' | 'no-show' | 'cancelled' | 'scheduled';
}

export class BookingsService {
  async getBookings(params: BookingsParams = {}): Promise<PaginatedResponse<Booking>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Booking>>('/bookings', {
        params: {
          ...params,
          include: 'club,class_time',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      throw error;
    }
  }

  async getAllBookings(params: Omit<BookingsParams, 'page' | 'per_page'> = {}): Promise<Booking[]> {
    const allBookings: Booking[] = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const response = await this.getBookings({
        ...params,
        page,
        per_page: 100,
      });

      allBookings.push(...response.data);

      if (page >= response.meta.last_page) {
        hasMorePages = false;
      } else {
        page++;
      }
    }

    return allBookings;
  }

  async getBookingsTotals(): Promise<{ month: number; today: number; trials_today: number; upcoming: number }> {
    try {
      const response = await apiClient.get<{ data: { today: number; trials_today: number; month: number; upcoming: number } }>('/bookings/totals');

      return {
        month: response.data.data.month || 0,
        today: response.data.data.today || 0,
        trials_today: response.data.data.trials_today || 0,
        upcoming: response.data.data.upcoming || 0
      };
    } catch (error) {
      console.error('Failed to fetch bookings totals:', error);
      throw error;
    }
  }

  async getBookingStatistics(status?: string): Promise<BookingStatistics> {
    try {
      const response = await apiClient.get<BookingStatistics>('/bookings/stats', {
        params: status ? { status } : undefined,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch booking statistics:', error);
      throw error;
    }
  }

  async updateBookingConversionStatus(bookingId: number, params: UpdateBookingStatusParams): Promise<{
    success: boolean;
    message: string;
    booking: {
      id: number;
      status: string;
      kit_order_id?: number;
      reminder_id?: number;
    };
  }> {
    try {
      const response = await apiClient.put(`/bookings/${bookingId}/conversion-status`, params);
      return response.data;
    } catch (error) {
      console.error('Failed to update booking conversion status:', error);
      throw error;
    }
  }

  async updateBookingAttendanceStatus(bookingId: number, params: UpdateAttendanceStatusParams): Promise<{
    success: boolean;
    message: string;
    booking: Booking;
  }> {
    try {
      const response = await apiClient.put(`/bookings/${bookingId}/status`, params);
      return response.data;
    } catch (error) {
      console.error('Failed to update booking attendance status:', error);
      throw error;
    }
  }

  // Offline-capable version of updateBookingAttendanceStatus
  async updateBookingAttendanceStatusOffline(bookingId: number, status: 'completed' | 'no-show' | 'cancelled' | 'scheduled'): Promise<void> {
    const isOnline = await offlineStorage.isOnline();

    if (isOnline) {
      // Try to update directly if online
      try {
        await this.updateBookingAttendanceStatus(bookingId, { status });
        return;
      } catch (error) {
        console.log('Direct update failed, queuing for sync:', error);
      }
    }

    // Queue the operation for later sync
    queueCommand(CommandFactory.updateBookingStatus(bookingId, status));

    // Optimistically update local data
    // This would be handled by the booking store
  }


  async createKitOrder(bookingId: number, items: Array<{ type: string; size: string; }>): Promise<KitOrder> {
    try {
      const response = await apiClient.post<KitOrder>('/kit-orders', {
        booking_id: bookingId,
        items,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create kit order:', error);
      throw error;
    }
  }

  async getKitOrdersForBooking(bookingId: number): Promise<KitOrder[]> {
    try {
      const response = await apiClient.get<KitOrder[]>(`/kit-orders/${bookingId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch kit orders:', error);
      throw error;
    }
  }

  async createReminder(bookingId: number, reminderTime: string): Promise<Reminder> {
    try {
      const response = await apiClient.post<Reminder>('/reminders', {
        booking_id: bookingId,
        reminder_time: reminderTime,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create reminder:', error);
      throw error;
    }
  }

  async getMyReminders(): Promise<Reminder[]> {
    try {
      const response = await apiClient.get<Reminder[]>('/reminders/my');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
      throw error;
    }
  }

  async completeReminder(reminderId: number): Promise<{
    success: boolean;
    message: string;
    reminder: Reminder;
  }> {
    try {
      const response = await apiClient.put(`/reminders/${reminderId}/complete`);
      return response.data;
    } catch (error) {
      console.error('Failed to complete reminder:', error);
      throw error;
    }
  }

  async syncBookings(params: {
    modified_since?: string;
    cursor?: string;
    include_deleted?: boolean;
  }): Promise<SyncResponse> {
    try {
      // Format the timestamp to match backend expected format: Y-m-d\TH:i:s
      let formattedSince: string | undefined;
      if (params.modified_since) {
        // Convert from ISO 8601 with milliseconds to Y-m-d\TH:i:s format
        const date = new Date(params.modified_since);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        formattedSince = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      }

      // Map frontend param names to backend expected names
      const apiParams: any = {
        include: 'club,class_time',
      };
      if (formattedSince) {
        apiParams.since = formattedSince;
      }
      if (params.cursor) {
        apiParams.cursor = params.cursor;
      }
      // Note: include_deleted is not in the API spec, removing it

      const response = await apiClient.get<SyncResponse>('/bookings/sync', {
        params: apiParams,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to sync bookings:', error);
      throw error;
    }
  }

  async createBooking(data: {
    class_id: number;
    datetime: string;
    phone: string;
    email: string;
    names: string[];
    whatsapp_reminder?: boolean;
    mailing_list_opt_in?: boolean;
    contact_name?: string;
  }): Promise<Booking> {
    try {
      const response = await apiClient.post<{ bookings: Booking[]; message: string }>('/admin/bookings', {
        bookings: [
          {
            class_id: data.class_id,
            datetime: data.datetime,
            phone: data.phone,
            email: data.email,
            names: data.names,
            whatsapp_reminder: data.whatsapp_reminder || false,
          },
        ],
        mailing_list_opt_in: data.mailing_list_opt_in || false,
        contact_name: data.contact_name || null,
      });

      // The API returns an array of created bookings, we return the first one
      return response.data.bookings[0];
    } catch (error) {
      console.error('Failed to create booking:', error);
      throw error;
    }
  }
}

export const bookingsService = new BookingsService();