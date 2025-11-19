import {
  ClubHealthScore,
  ClubHealthTrend,
  DateRange,
  HealthStatus
} from '@/types/clubHealth';
import apiClient from './client';

export interface ClubHealthFilters {
  date_range?: DateRange;
  status?: HealthStatus;
  latest_only?: boolean;
}

export interface TrendPeriod {
  period: '7_days' | '30_days' | '3_months';
}

class ClubHealthNewService {
  /**
   * Get all club health scores with optional filtering
   */
  async getAllClubsHealth(filters?: ClubHealthFilters): Promise<ClubHealthScore[]> {
    try {
      const params = {
        date_range: filters?.date_range || 'last_30_days',
        status: filters?.status,
        latest_only: filters?.latest_only ?? true,
      };

      const response = await apiClient.get<{ data: ClubHealthScore[] }>('/clubs/health', {
        params,
      });

      if (!response.data || !response.data.data) {
        throw new Error('Failed to fetch club health scores');
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch club health scores:', error);
      throw error;
    }
  }

  /**
   * Get single club health score with detailed metrics
   */
  async getClubHealth(
    clubId: number,
    dateRange?: DateRange,
    recalculate: boolean = false
  ): Promise<ClubHealthScore> {
    try {
      const params = {
        date_range: dateRange || 'last_30_days',
        recalculate,
      };

      const response = await apiClient.get<{ data: ClubHealthScore; calculated: boolean }>(`/clubs/health/${clubId}`, {
        params,
      });

      if (!response.data || !response.data.data) {
        throw new Error('Failed to fetch club health data');
      }

      // Normalize the response to have consistent field names
      const healthData = response.data.data;
      if (healthData.metrics && !healthData.metrics_snapshot) {
        healthData.metrics_snapshot = healthData.metrics;
      }
      if (healthData.ad_metrics && !healthData.ad_metrics_snapshot) {
        healthData.ad_metrics_snapshot = healthData.ad_metrics;
      }

      return healthData;
    } catch (error) {
      console.error(`Failed to fetch health data for club ${clubId}:`, error);
      throw error;
    }
  }

  /**
   * Get club health trend over time
   */
  async getClubHealthTrend(
    clubId: number,
    period: '7_days' | '30_days' | '3_months' = '30_days'
  ): Promise<ClubHealthTrend | null> {
    try {
      const response = await apiClient.get<{ data: ClubHealthTrend }>(
        `/clubs/health/${clubId}/trend`,
        {
          params: { period },
        }
      );

      if (!response.data || !response.data.data) {
        throw new Error('Failed to fetch club health trend');
      }

      const trendData = response.data.data;

      // Return null if we don't have enough data points for a trend
      if (!trendData.trend_points || trendData.trend_points.length === 0) {
        return null;
      }

      return trendData;
    } catch (error) {
      console.error(`Failed to fetch health trend for club ${clubId}:`, error);
      // Return null instead of throwing to handle gracefully
      return null;
    }
  }

  /**
   * Force recalculation of club health scores
   */
  async recalculateClubHealth(clubId: number, dateRange?: DateRange): Promise<ClubHealthScore> {
    return this.getClubHealth(clubId, dateRange, true);
  }

  /**
   * Get health status color
   */
  getHealthStatusColor(status: HealthStatus): string {
    switch (status) {
      case 'critical':
        return '#ef4444'; // red-500
      case 'poor':
        return '#a855f7'; // purple-500
      case 'needs_attention':
        return '#f59e0b'; // amber-500
      case 'good':
        return '#06b6d4'; // cyan-500
      case 'excellent':
        return '#10b981'; // emerald-500
      default:
        return '#6b7280'; // gray-500
    }
  }

  /**
   * Get health status label
   */
  getHealthStatusLabel(status: HealthStatus): string {
    switch (status) {
      case 'critical':
        return 'Critical';
      case 'poor':
        return 'Poor';
      case 'needs_attention':
        return 'Needs Attention';
      case 'good':
        return 'Good';
      case 'excellent':
        return 'Excellent';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get score color based on numeric value
   */
  getScoreColor(score: number): string {
    if (score >= 80) return '#10b981'; // excellent - emerald
    if (score >= 60) return '#06b6d4'; // good - cyan
    if (score >= 40) return '#f59e0b'; // needs attention - amber
    if (score >= 20) return '#a855f7'; // poor - purple
    return '#ef4444'; // critical - red
  }
}

export const clubHealthNewService = new ClubHealthNewService();