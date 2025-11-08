export interface User {
  id: number;
  email: string;
  name?: string;
  phone_number?: string | null;
  is_admin: boolean;
  email_verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Club {
  id: number;
  name: string;
  slug?: string;
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
  class_times?: ClassTime[];
  last_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassTime {
  id: number;
  club_id: number;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  name?: string;
  start_time: string;
  end_time?: string;
  coaches?: string;
  helpers?: string[];
  priority?: number;
  is_accepting_bookings?: boolean;
  todays_booking_count?: number;
  club?: Club;
}

export interface Booking {
  id: number;
  uuid: string;
  names: string;
  email?: string;
  phone?: string;
  status?: 'pending' | 'paid_dd' | 'paid_awaiting_dd' | 'unpaid_dd' | 'unpaid_coach_call' | 'not_joining';
  attendance_status?: 'scheduled' | 'completed' | 'no-show' | 'cancelled';
  start_time: string;
  cancelled_at?: string | null;
  checked_in_at?: string | null;
  no_show_at?: string | null;
  no_show: boolean;
  channel: 'Cadence' | 'Website';
  channel_display_name?: string;
  source?: string;
  class_time?: ClassTime;
  club?: Club;
}

export interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  links: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
  path: string;
  per_page: number;
  to: number | null;
  total: number;
}

export interface PaginationLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  links: PaginationLinks;
  meta: PaginationMeta;
}

export interface BookingStatistics {
  total: number;
  converted: number;
  pending: number;
  not_joining: number;
  conversion_rate: number;
  by_status: {
    paid_dd: number;
    paid_awaiting_dd: number;
    unpaid_dd: number;
    unpaid_coach_call: number;
    not_joining: number;
  };
}

export interface KitOrder {
  id: number;
  booking_id: number;
  items: Array<{
    type: string;
    size: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: number;
  booking_id: number;
  user_id: number;
  reminder_time: string;
  status: 'pending' | 'completed';
  created_at: string;
  updated_at: string;
}