export type DateRange = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'last_3_months';
export type HealthStatus = 'critical' | 'poor' | 'needs_attention' | 'good' | 'excellent';
export type IssueSeverity = 'warning' | 'critical';

export interface DateRangeOption {
  label: string;
  value: DateRange;
  getDates: () => { start: Date; end: Date };
}

export interface IndividualScores {
  booking_efficiency: number;      // Cost per booking score
  show_up_rate: number;            // Attendance score
  enrollment_conversion: number;   // Conversion to membership
  revenue_health: number;          // ROAS score
  growth_trajectory: number;       // Growth trend score
  retention_quality: number;       // Student retention score
}

export interface HealthIssue {
  type: string;
  severity: IssueSeverity;
  message: string;
  metric: string;
  value: number;
}

export interface MetricsSnapshot {
  club_id: number;
  club_name: string;
  date_range: string;
  period_start: string;
  period_end: string;
  bookings_count: number;
  enrollment_rate: number;
  no_show_rate: number;
  attendance_rate: number;
  new_students: number;
  returning_students: number;
  total_revenue: number;
  average_class_size: number;
  bookings_change: number;
  enrollment_change: number;
  no_show_change: number;
  attendance_change: number;
}

export interface AdMetricsSnapshot {
  total_spend: number;
  bookings_from_ads: number;
  cost_per_booking: number | null;
  roas: number | null;
}

export interface ClubHealthScore {
  club_id: number;
  club_name: string;
  overall_score: number;
  health_status: HealthStatus;
  individual_scores: IndividualScores;
  key_issues: HealthIssue[];
  ai_summary: string | null;
  metrics_snapshot?: MetricsSnapshot; // For list endpoint
  ad_metrics_snapshot?: AdMetricsSnapshot; // For list endpoint
  metrics?: MetricsSnapshot; // For single endpoint
  ad_metrics?: AdMetricsSnapshot; // For single endpoint
  calculated_at: string;
}

export interface ClubHealthDetailResponse {
  data: ClubHealthScore;
  calculated: boolean;
}

export interface TrendPoint {
  date: string;
  overall_score: number;
  health_status: HealthStatus;
  booking_efficiency: number;
  show_up_rate: number;
  enrollment_conversion: number;
  revenue_health: number;
  growth_trajectory: number;
  retention_quality: number;
}

export interface ClubHealthTrend {
  club_id: number;
  club_name: string;
  period: string;
  trend_points: TrendPoint[];
  summary: {
    start_score: number;
    end_score: number;
    average_score: number;
    min_score: number;
    max_score: number;
    improvement: number;
  };
}

export interface ClubHealthTrendResponse {
  data: ClubHealthTrend;
}

export interface ClubHealthListResponse {
  data: ClubHealthScore[];
}

// Legacy interfaces kept for backward compatibility
export interface ClubMetrics {
  club_id: number;
  club_name: string;
  date_range: DateRange;
  period_start: string;
  period_end: string;

  // Core metrics
  bookings_count: number;
  enrollment_rate: number; // Percentage (0-100)
  no_show_rate: number; // Percentage (0-100)
  attendance_rate: number; // Percentage (0-100)

  // Additional metrics
  new_students: number;
  returning_students: number;
  total_revenue?: number;
  average_class_size?: number;

  // Comparisons to previous period
  bookings_change?: number; // Percentage change
  enrollment_change?: number;
  no_show_change?: number;
  attendance_change?: number;
}

export interface FacebookAdsMetrics {
  club_id: number;
  date_range: DateRange;
  period_start: string;
  period_end: string;

  // Core ad metrics
  total_spend: number;
  impressions: number;
  clicks: number;
  ctr: number; // Click-through rate percentage
  cost_per_click: number;

  // Conversion metrics
  bookings_from_ads: number;
  cost_per_booking: number;
  conversion_rate: number; // Percentage

  // Performance indicators
  roas?: number; // Return on ad spend

  // Campaign breakdown
  campaigns?: CampaignMetrics[];
}

export interface CampaignMetrics {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface ClubHealthData {
  club: {
    id: number;
    name: string;
    address: string;
    postcode: string;
  };
  metrics: ClubMetrics;
  facebook_ads?: FacebookAdsMetrics;
  last_updated: string;
}

export interface ClubHealthSummary {
  club_id: number;
  club_name: string;
  health_score: number; // 0-100 overall health score
  key_metric: {
    label: string;
    value: string;
    trend: 'up' | 'down' | 'stable';
  };
}

// Helper function to get date ranges
export const getDateRange = (range: DateRange): { start: Date; end: Date } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  switch (range) {
    case 'today':
      return {
        start: today,
        end: now,
      };

    case 'yesterday':
      return {
        start: yesterday,
        end: today,
      };

    case 'last_7_days':
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return {
        start: weekAgo,
        end: now,
      };

    case 'last_30_days':
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return {
        start: monthAgo,
        end: now,
      };

    case 'last_3_months':
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return {
        start: threeMonthsAgo,
        end: now,
      };

    default:
      return {
        start: today,
        end: now,
      };
  }
};

export const dateRangeOptions: DateRangeOption[] = [
  {
    label: 'Today',
    value: 'today',
    getDates: () => getDateRange('today'),
  },
  {
    label: 'Yesterday',
    value: 'yesterday',
    getDates: () => getDateRange('yesterday'),
  },
  {
    label: 'Last 7 Days',
    value: 'last_7_days',
    getDates: () => getDateRange('last_7_days'),
  },
  {
    label: 'Last 30 Days',
    value: 'last_30_days',
    getDates: () => getDateRange('last_30_days'),
  },
  {
    label: 'Last 3 Months',
    value: 'last_3_months',
    getDates: () => getDateRange('last_3_months'),
  },
];