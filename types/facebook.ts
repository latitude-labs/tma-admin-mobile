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

export interface TimeSeriesDataPoint {
  date: string;
  total_spend: number;
  chats: number;
  bookings: number;
  cost_per_booking: number | null;
}

export interface TimeSeriesMetadata {
  start_date: string;
  end_date: string;
  facebook_page_uuids?: string[];
  club_ids?: number[];
}

export interface TimeSeriesSummary {
  total_spend: number;
  total_chats: number;
  total_bookings: number;
  average_cost_per_booking: number | null;
}

export interface TimeSeriesResponse {
  data: TimeSeriesDataPoint[];
  metadata: TimeSeriesMetadata;
  summary: TimeSeriesSummary;
}

export interface RunningAd {
  id: string;
  name: string;
  copy: string;
  image_url: string | null;
  status: 'active' | 'paused';
  daily_budget: number;
  impressions: number;
  reach: number;
  clicks: number;
}

export type ChartMetric = 'spend' | 'chats' | 'bookings' | 'cost_per_booking';