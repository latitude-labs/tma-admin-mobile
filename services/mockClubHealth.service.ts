import {
  ClubHealthData,
  ClubHealthSummary,
  DateRange,
  ClubMetrics,
  FacebookAdsMetrics,
  CampaignMetrics,
  getDateRange
} from '@/types/clubHealth';
import { Club } from '@/types/api';

// Mock clubs data
const mockClubs: Club[] = [
  {
    id: 1,
    name: 'TMA Central London',
    address: '123 High Street',
    postcode: 'SW1A 1AA',
    latitude: 51.5074,
    longitude: -0.1278
  },
  {
    id: 2,
    name: 'TMA North London',
    address: '456 Main Road',
    postcode: 'N1 2AB',
    latitude: 51.5450,
    longitude: -0.1043
  },
  {
    id: 3,
    name: 'TMA East London',
    address: '789 Park Lane',
    postcode: 'E1 4BC',
    latitude: 51.5155,
    longitude: -0.0729
  },
  {
    id: 4,
    name: 'TMA West London',
    address: '321 Queens Road',
    postcode: 'W4 5DE',
    latitude: 51.4903,
    longitude: -0.2671
  },
  {
    id: 5,
    name: 'TMA South London',
    address: '654 Kings Avenue',
    postcode: 'SE1 6FG',
    latitude: 51.5034,
    longitude: -0.1195
  },
];

// Helper to generate realistic metrics based on date range
const generateMetrics = (club: Club, dateRange: DateRange): ClubMetrics => {
  const baseMultiplier = {
    today: 0.1,
    yesterday: 0.1,
    last_7_days: 1,
    last_30_days: 4.3,
    last_3_months: 13,
  }[dateRange];

  const { start, end } = getDateRange(dateRange);

  // Generate semi-random but consistent metrics for each club
  const seed = club.id;
  const bookingsBase = 20 + (seed * 7);
  const enrollmentBase = 65 + (seed * 3);
  const noShowBase = 8 + (seed * 2);

  // Add some variation
  const variation = Math.sin(Date.now() / 10000000) * 5;

  const bookings = Math.round(bookingsBase * baseMultiplier);
  const enrollmentRate = Math.min(95, Math.max(40, enrollmentBase + variation));
  const noShowRate = Math.min(25, Math.max(3, noShowBase + variation));
  const attendanceRate = 100 - noShowRate;

  return {
    club_id: club.id,
    club_name: club.name,
    date_range: dateRange,
    period_start: start.toISOString(),
    period_end: end.toISOString(),

    bookings_count: bookings,
    enrollment_rate: Number(enrollmentRate.toFixed(1)),
    no_show_rate: Number(noShowRate.toFixed(1)),
    attendance_rate: Number(attendanceRate.toFixed(1)),

    new_students: Math.round(bookings * 0.3),
    returning_students: Math.round(bookings * 0.7),
    total_revenue: bookings * 45, // Average £45 per booking
    average_class_size: Math.round(bookings / (baseMultiplier * 7)), // Rough average

    // Comparisons (positive clubs trending up, negative trending down based on ID)
    bookings_change: club.id % 2 === 0 ? 12.5 : -8.3,
    enrollment_change: club.id % 2 === 0 ? 5.2 : -3.1,
    no_show_change: club.id % 2 === 0 ? -2.1 : 1.5,
    attendance_change: club.id % 2 === 0 ? 2.1 : -1.5,
  };
};

// Helper to generate Facebook ads metrics
const generateFacebookAdsMetrics = (club: Club, dateRange: DateRange): FacebookAdsMetrics => {
  const baseMultiplier = {
    today: 0.1,
    yesterday: 0.1,
    last_7_days: 1,
    last_30_days: 4.3,
    last_3_months: 13,
  }[dateRange];

  const { start, end } = getDateRange(dateRange);
  const seed = club.id;

  const spend = Number((150 * baseMultiplier * (1 + seed * 0.2)).toFixed(2));
  const impressions = Math.round(10000 * baseMultiplier * (1 + seed * 0.15));
  const clicks = Math.round(impressions * 0.025); // 2.5% CTR
  const bookingsFromAds = Math.round(clicks * 0.08); // 8% conversion

  const campaigns: CampaignMetrics[] = [
    {
      id: `camp_${club.id}_1`,
      name: 'Summer Trial Classes',
      status: 'active',
      spend: spend * 0.4,
      impressions: Math.round(impressions * 0.4),
      clicks: Math.round(clicks * 0.45),
      conversions: Math.round(bookingsFromAds * 0.5),
    },
    {
      id: `camp_${club.id}_2`,
      name: 'Back to School',
      status: 'active',
      spend: spend * 0.35,
      impressions: Math.round(impressions * 0.35),
      clicks: Math.round(clicks * 0.3),
      conversions: Math.round(bookingsFromAds * 0.3),
    },
    {
      id: `camp_${club.id}_3`,
      name: 'Weekend Warriors',
      status: 'paused',
      spend: spend * 0.25,
      impressions: Math.round(impressions * 0.25),
      clicks: Math.round(clicks * 0.25),
      conversions: Math.round(bookingsFromAds * 0.2),
    },
  ];

  return {
    club_id: club.id,
    date_range: dateRange,
    period_start: start.toISOString(),
    period_end: end.toISOString(),

    total_spend: spend,
    impressions,
    clicks,
    ctr: Number(((clicks / impressions) * 100).toFixed(2)),
    cost_per_click: Number((spend / clicks).toFixed(2)),

    bookings_from_ads: bookingsFromAds,
    cost_per_booking: bookingsFromAds > 0 ? Number((spend / bookingsFromAds).toFixed(2)) : 0,
    conversion_rate: Number(((bookingsFromAds / clicks) * 100).toFixed(2)),

    roas: bookingsFromAds * 45 / spend, // Assuming £45 per booking revenue

    campaigns,
  };
};

// Generate health score based on metrics
const calculateHealthScore = (metrics: ClubMetrics): number => {
  let score = 50; // Base score

  // Enrollment rate contributes most (up to 30 points)
  score += (metrics.enrollment_rate / 100) * 30;

  // Attendance rate contributes (up to 20 points)
  score += (metrics.attendance_rate / 100) * 20;

  // Deduct for high no-show rate
  score -= metrics.no_show_rate * 0.5;

  // Bonus for positive trends
  if (metrics.bookings_change && metrics.bookings_change > 0) score += 5;
  if (metrics.enrollment_change && metrics.enrollment_change > 0) score += 5;

  return Math.min(100, Math.max(0, Math.round(score)));
};

export class MockClubHealthService {
  async getClubs(): Promise<Club[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockClubs;
  }

  async getClubHealthData(clubId: number, dateRange: DateRange): Promise<ClubHealthData> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const club = mockClubs.find(c => c.id === clubId);
    if (!club) {
      throw new Error('Club not found');
    }

    const metrics = generateMetrics(club, dateRange);
    const facebookAds = generateFacebookAdsMetrics(club, dateRange);

    return {
      club: {
        id: club.id,
        name: club.name,
        address: club.address || '',
        postcode: club.postcode || '',
      },
      metrics,
      facebook_ads: facebookAds,
      last_updated: new Date().toISOString(),
    };
  }

  async getAllClubsHealth(dateRange: DateRange): Promise<ClubHealthData[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return Promise.all(
      mockClubs.map(club => this.getClubHealthData(club.id, dateRange))
    );
  }

  async getClubsSummary(): Promise<ClubHealthSummary[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));

    return mockClubs.map(club => {
      const metrics = generateMetrics(club, 'last_30_days');
      const healthScore = calculateHealthScore(metrics);

      // Determine key metric to highlight
      let keyMetric;
      if (metrics.bookings_change && metrics.bookings_change > 10) {
        keyMetric = {
          label: 'Bookings',
          value: `+${metrics.bookings_change}%`,
          trend: 'up' as const,
        };
      } else if (metrics.enrollment_rate > 75) {
        keyMetric = {
          label: 'Enrollment',
          value: `${metrics.enrollment_rate}%`,
          trend: 'up' as const,
        };
      } else if (metrics.no_show_rate > 15) {
        keyMetric = {
          label: 'No-Shows',
          value: `${metrics.no_show_rate}%`,
          trend: 'down' as const,
        };
      } else {
        keyMetric = {
          label: 'Attendance',
          value: `${metrics.attendance_rate}%`,
          trend: 'stable' as const,
        };
      }

      return {
        club_id: club.id,
        club_name: club.name,
        health_score: healthScore,
        key_metric: keyMetric,
      };
    });
  }
}

export const mockClubHealthService = new MockClubHealthService();