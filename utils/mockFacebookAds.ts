import { RunningAd } from '@/types/facebook';

/**
 * Mock data for currently running Facebook ads
 * This will be replaced with real API data when the backend is implemented
 */
export const mockRunningAds: RunningAd[] = [
  {
    id: 'ad_001',
    name: 'September Trial Classes - Special Offer',
    copy: 'Get your first trial class FREE! Join our martial arts family and discover the benefits of training. Limited spots available. Perfect for kids and adults. Book now!',
    image_url: null, // Placeholder - will show grey box with "Ad Preview" text
    status: 'active',
    daily_budget: 25.00,
    impressions: 12450,
    reach: 8932,
    clicks: 234,
  },
  {
    id: 'ad_002',
    name: 'New Member Promotion - 50% Off',
    copy: 'Special offer for new members! Get 50% off your first month when you sign up this week. Professional instructors, modern facilities, flexible schedules.',
    image_url: null,
    status: 'active',
    daily_budget: 35.00,
    impressions: 18720,
    reach: 11245,
    clicks: 387,
  },
  {
    id: 'ad_003',
    name: 'Kids Martial Arts - After School Programme',
    copy: 'Keep your kids active and engaged after school! Our martial arts programme builds confidence, discipline, and fitness. Ages 5-12. First class free!',
    image_url: null,
    status: 'active',
    daily_budget: 30.00,
    impressions: 15380,
    reach: 9876,
    clicks: 298,
  },
  {
    id: 'ad_004',
    name: 'Adult Fitness Classes - Transform Your Body',
    copy: 'Get fit, build confidence, learn self-defense. Our adult martial arts classes are perfect for all fitness levels. Burn calories while learning valuable skills!',
    image_url: null,
    status: 'paused',
    daily_budget: 20.00,
    impressions: 8934,
    reach: 5421,
    clicks: 156,
  },
];

/**
 * Get mock running ads for a specific Facebook page
 * @param pageUuid - UUID of the Facebook page
 * @returns Array of running ads
 */
export function getMockAdsForPage(pageUuid: string): RunningAd[] {
  // In the future, this could filter ads by page
  // For now, return all mock ads
  return mockRunningAds;
}
