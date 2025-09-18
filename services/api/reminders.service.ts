import apiClient from './client';

export interface Reminder {
  id: number;
  title: string;
  description?: string;
  reminder_time: string;
  status: 'pending' | 'completed' | 'snoozed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  booking_id?: number;
  user_id: number;
  created_by?: number;
  snooze_until?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardRemindersResponse {
  reminders: Reminder[];
  stats: {
    overdue: number;
    today: number;
    upcoming: number;
  };
}

export interface CreateReminderParams {
  title: string;
  description?: string;
  reminder_time: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  booking_id?: number;
  user_id?: number; // For admins creating reminders for other coaches
}

export interface UpdateReminderParams {
  status?: 'pending' | 'completed' | 'snoozed' | 'cancelled';
  snooze_until?: string;
  title?: string;
  description?: string;
  reminder_time?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export class RemindersService {
  /**
   * Get reminders for the dashboard (sorted by priority and time)
   */
  async getDashboardReminders(): Promise<DashboardRemindersResponse> {
    try {
      const response = await apiClient.get<DashboardRemindersResponse>('/reminders/dashboard');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch dashboard reminders:', error);
      throw error;
    }
  }

  /**
   * Get all reminders for the current user
   */
  async getMyReminders(): Promise<Reminder[]> {
    try {
      const response = await apiClient.get<Reminder[]>('/reminders/my');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
      throw error;
    }
  }

  /**
   * Create a new reminder
   */
  async createReminder(params: CreateReminderParams): Promise<Reminder> {
    try {
      const response = await apiClient.post<Reminder>('/reminders', params);
      return response.data;
    } catch (error) {
      console.error('Failed to create reminder:', error);
      throw error;
    }
  }

  /**
   * Update an existing reminder
   */
  async updateReminder(id: number, params: UpdateReminderParams): Promise<Reminder> {
    try {
      const response = await apiClient.put<Reminder>(`/reminders/${id}`, params);
      return response.data;
    } catch (error) {
      console.error('Failed to update reminder:', error);
      throw error;
    }
  }

  /**
   * Complete a reminder
   */
  async completeReminder(id: number): Promise<{ success: boolean; message: string; reminder: Reminder }> {
    try {
      const response = await apiClient.put(`/reminders/${id}/complete`);
      return response.data;
    } catch (error) {
      console.error('Failed to complete reminder:', error);
      throw error;
    }
  }

  /**
   * Snooze a reminder
   */
  async snoozeReminder(id: number, snoozeUntil: Date): Promise<Reminder> {
    try {
      const response = await apiClient.put<Reminder>(`/reminders/${id}`, {
        status: 'snoozed',
        snooze_until: snoozeUntil.toISOString()
      });
      return response.data;
    } catch (error) {
      console.error('Failed to snooze reminder:', error);
      throw error;
    }
  }

  /**
   * Cancel a reminder
   */
  async cancelReminder(id: number): Promise<Reminder> {
    try {
      const response = await apiClient.put<Reminder>(`/reminders/${id}`, {
        status: 'cancelled'
      });
      return response.data;
    } catch (error) {
      console.error('Failed to cancel reminder:', error);
      throw error;
    }
  }

  /**
   * Bulk complete reminders
   */
  async bulkCompleteReminders(reminderIds: number[]): Promise<{ success: boolean; count: number }> {
    try {
      const response = await apiClient.post('/reminders/bulk-complete', {
        reminder_ids: reminderIds
      });
      return response.data;
    } catch (error) {
      console.error('Failed to bulk complete reminders:', error);
      throw error;
    }
  }

  /**
   * Bulk snooze reminders
   */
  async bulkSnoozeReminders(reminderIds: number[], snoozeUntil: Date): Promise<{ success: boolean; count: number }> {
    try {
      const response = await apiClient.post('/reminders/bulk-snooze', {
        reminder_ids: reminderIds,
        snooze_until: snoozeUntil.toISOString()
      });
      return response.data;
    } catch (error) {
      console.error('Failed to bulk snooze reminders:', error);
      throw error;
    }
  }

  /**
   * Delete a reminder
   */
  async deleteReminder(id: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete(`/reminders/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      throw error;
    }
  }

  /**
   * Create a booking-related reminder (convenience method)
   */
  async createBookingReminder(
    bookingId: number,
    reminderTime: Date,
    title: string,
    description?: string
  ): Promise<Reminder> {
    return this.createReminder({
      title,
      description,
      reminder_time: reminderTime.toISOString(),
      booking_id: bookingId,
      priority: 'high'
    });
  }
}

export const remindersService = new RemindersService();