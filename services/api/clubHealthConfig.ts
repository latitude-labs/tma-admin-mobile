/**
 * Configuration for club health data source
 * Set EXPO_PUBLIC_USE_MOCK_CLUB_DATA=true in .env to use mock data
 */

import { clubHealthService } from './clubHealth.service';
import { mockClubHealthService } from '../mockClubHealth.service';
import { clubsService } from './clubs.service';
import {
  ClubHealthData,
  ClubHealthSummary,
  DateRange
} from '@/types/clubHealth';
import { Club } from '@/types/api';

// Check if we should use mock data
const USE_MOCK_DATA = process.env.EXPO_PUBLIC_USE_MOCK_CLUB_DATA === 'true';

class ClubHealthDataService {
  private service = USE_MOCK_DATA ? null : clubHealthService;
  private mockService = mockClubHealthService;

  async getClubs(): Promise<Club[]> {
    if (USE_MOCK_DATA) {
      return this.mockService.getClubs();
    }
    return clubsService.getClubs(true);
  }

  async getClubHealthData(club: Club, dateRange: DateRange): Promise<ClubHealthData> {
    if (USE_MOCK_DATA) {
      return this.mockService.getClubHealthData(club.id, dateRange);
    }
    return this.service!.getClubHealthData(club, dateRange);
  }

  async getAllClubsHealth(clubs: Club[], dateRange: DateRange): Promise<ClubHealthData[]> {
    if (USE_MOCK_DATA) {
      return this.mockService.getAllClubsHealth(dateRange);
    }
    return this.service!.getAllClubsHealth(clubs, dateRange);
  }

  async getClubsSummary(dateRange: DateRange): Promise<ClubHealthSummary[]> {
    if (USE_MOCK_DATA) {
      return this.mockService.getClubsSummary();
    }
    return this.service!.getClubsSummary(dateRange);
  }
}

export const clubHealthDataService = new ClubHealthDataService();

// Export a helper to check if using mock data
export const isUsingMockData = () => USE_MOCK_DATA;

// Log the data source being used
if (__DEV__) {
  console.log(`📊 Club Health: Using ${USE_MOCK_DATA ? 'MOCK' : 'REAL'} data`);
}