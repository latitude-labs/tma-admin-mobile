import { Club } from '@/types/api';
import {
  ClubHealthData,
  ClubHealthSummary,
  ClubMetrics,
  DateRange,
  FacebookAdsMetrics,
} from '@/types/clubHealth';
import apiClient from './client';

interface FacebookAdsResponse {
  success: boolean;
  data: FacebookAdsMetrics;
}

interface ClubsSummaryResponse {
  success: boolean;
  data: ClubHealthSummary[];
}

export class ClubHealthService {
  /**
   * Get performance metrics for a specific club
   */
  async getClubMetrics(clubId: number, dateRange: DateRange): Promise<ClubMetrics> {
    try {
      const response = await apiClient.get<ClubMetrics>(`/clubs/${clubId}/metrics`, {
        params: { date_range: dateRange },
      });

      if (!response.data) {
        throw new Error('Failed to fetch club metrics');
      }

      return response.data;
    } catch (error) {
      console.error('Failed to fetch club metrics:', error);
      throw error;
    }
  }

  /**
   * Get Facebook advertising metrics for a specific club
   */
  async getClubFacebookAds(clubId: number, dateRange: DateRange): Promise<FacebookAdsMetrics | null> {
    try {
      const response = await apiClient.get<FacebookAdsResponse>(`/clubs/${clubId}/facebook-ads`, {
        params: { date_range: dateRange },
      });

      if (!response.data.success) {
        // Facebook ads might not be available for all clubs
        return null;
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch Facebook ads data:', error);
      // Don't throw - Facebook ads are optional
      return null;
    }
  }

  /**
   * Get a summary of all clubs with key health indicators
   */
  async getClubsSummary(dateRange: DateRange = 'last_30_days'): Promise<ClubHealthSummary[]> {
    try {
      const response = await apiClient.get<ClubsSummaryResponse>('/clubs/summary', {
        params: { date_range: dateRange },
      });

      if (!response.data.success) {
        throw new Error('Failed to fetch clubs summary');
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch clubs summary:', error);
      throw error;
    }
  }

  /**
   * Get complete health data for a specific club (metrics + Facebook ads)
   */
  async getClubHealthData(club: Club, dateRange: DateRange): Promise<ClubHealthData> {
    try {
      // Fetch metrics and Facebook ads in parallel
      const [metrics, facebookAds] = await Promise.all([
        this.getClubMetrics(club.id, dateRange),
        this.getClubFacebookAds(club.id, dateRange),
      ]);

      return {
        club: {
          id: club.id,
          name: club.name,
          address: club.address || '',
          postcode: club.postcode || '',
        },
        metrics,
        facebook_ads: facebookAds || undefined,
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Failed to fetch health data for club ${club.id}:`, error);
      throw error;
    }
  }

  /**
   * Get health data for all clubs
   */
  async getAllClubsHealth(clubs: Club[], dateRange: DateRange): Promise<ClubHealthData[]> {
    try {
      // Fetch all clubs' data in parallel
      const healthDataPromises = clubs.map(club =>
        this.getClubHealthData(club, dateRange)
      );

      const results = await Promise.allSettled(healthDataPromises);

      // Filter out any failed requests but log them
      const successfulData: ClubHealthData[] = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulData.push(result.value);
        } else {
          console.error(`Failed to fetch data for club ${clubs[index].name}:`, result.reason);
        }
      });

      return successfulData;
    } catch (error) {
      console.error('Failed to fetch all clubs health data:', error);
      throw error;
    }
  }
}

export const clubHealthService = new ClubHealthService();