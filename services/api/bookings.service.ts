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
}

interface UpdateBookingStatusParams {
  status: 'pending' | 'paid_dd' | 'paid_awaiting_dd' | 'unpaid_dd' | 'unpaid_coach_call' | 'not_joining';
  kit_items?: Array<{ type: string; size: string; }>;
  reminder_time?: string;
}

export class BookingsService {
  async getBookings(params: BookingsParams = {}): Promise<PaginatedResponse<Booking>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Booking>>('/bookings', {
        params,
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

  async getBookingsTotals(): Promise<{ month: number; today: number; upcoming: number }> {
    try {
      const response = await apiClient.get<{ data: { today: number; month: number; upcoming: number } }>('/bookings/totals');

      return {
        month: response.data.data.month || 0,
        today: response.data.data.today || 0,
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

  async updateBookingStatus(bookingId: number, params: UpdateBookingStatusParams): Promise<{
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
      const response = await apiClient.put(`/bookings/${bookingId}/status`, params);
      return response.data;
    } catch (error) {
      console.error('Failed to update booking status:', error);
      throw error;
    }
  }

  // Offline-capable version of updateBookingStatus
  async updateBookingStatusOffline(bookingId: number, status: string): Promise<void> {
    const isOnline = await offlineStorage.isOnline();

    if (isOnline) {
      // Try to update directly if online
      try {
        await this.updateBookingStatus(bookingId, { status: status as any });
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

  // Offline-capable version of marking a booking as no-show
  async markBookingNoShowOffline(bookingId: number): Promise<void> {
    const isOnline = await offlineStorage.isOnline();

    if (isOnline) {
      // Try to update directly if online
      try {
        await apiClient.patch(`/bookings/${bookingId}/no-show`, { no_show: true });
        return;
      } catch (error) {
        console.log('Direct update failed, queuing for sync:', error);
      }
    }

    // Queue the operation for later sync
    queueCommand(CommandFactory.markBookingNoShow(bookingId));
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
}

export const bookingsService = new BookingsService();