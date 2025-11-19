import { ENDPOINTS } from '@/config/api';
import { TimeSeriesResponse } from '@/types/facebook';
import apiClient from './client';

/**
 * Facebook advertising API service
 * Handles fetching advertising metrics and ad management
 */
class FacebookService {
  /**
   * Fetch time-series advertising metrics for a specific Facebook page
   * @param pageUuid - UUID of the Facebook page
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   * @returns Time-series metrics data
   */
  async fetchTimeSeriesMetrics(
    pageUuid: string,
    startDate: string,
    endDate: string
  ): Promise<TimeSeriesResponse> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      'facebook_page_uuids[]': pageUuid,
    });

    const response = await apiClient.get<TimeSeriesResponse>(
      `${ENDPOINTS.advertisingMetrics}/timeseries?${params.toString()}`
    );

    return response.data;
  }

  /**
   * Pause a Facebook ad
   * NOTE: This is a stub function for future backend implementation
   * @param adId - ID of the ad to pause
   * @returns Success status
   */
  async pauseAd(adId: string): Promise<{ success: boolean; message: string }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // TODO: Replace with actual API call when backend is ready
    // const response = await apiClient.post(`${ENDPOINTS.advertisingAds}/${adId}/pause`);
    // return response.data;

    return {
      success: true,
      message: 'Ad paused successfully',
    };
  }

  /**
   * Unpause (resume) a Facebook ad
   * NOTE: This is a stub function for future backend implementation
   * @param adId - ID of the ad to unpause
   * @returns Success status
   */
  async unpauseAd(adId: string): Promise<{ success: boolean; message: string }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // TODO: Replace with actual API call when backend is ready
    // const response = await apiClient.post(`${ENDPOINTS.advertisingAds}/${adId}/unpause`);
    // return response.data;

    return {
      success: true,
      message: 'Ad resumed successfully',
    };
  }
}

export const facebookService = new FacebookService();
