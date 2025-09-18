export interface FacebookPage {
  id: number;
  uuid: string;
  name: string;
  facebook_page_id: string;
  organisation_id: number;
  status: 'active' | 'inactive' | 'error';
  url: string;
  last_synced_at: string | null;
  clubs?: {
    id: number;
    name: string;
  }[];
}

export interface AdvertisingMetrics {
  total_spend: number;
  total_bookings: number;
  cost_per_booking: number | null;
  club_bookings?: {
    club_id: number;
    club_name: string;
    bookings: number;
  }[];
}

export type TimeRange = 'today' | 'yesterday' | 'last7days' | 'last30days';

export interface TimeRangeOption {
  label: string;
  value: TimeRange;
  getDates: () => { start: string; end: string };
}