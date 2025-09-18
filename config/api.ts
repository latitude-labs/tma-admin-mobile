import env from './env';

export const API_CONFIG = {
  BASE_URL: env.apiUrl,
  TIMEOUT: 30000,
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000,
};

export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    user: '/auth/user',
  },
  clubs: '/clubs',
  bookings: '/bookings',
  endOfDayReports: '/end-of-day-reports',
  users: '/users',
  facebookPages: '/facebook-pages',
  advertisingMetrics: '/advertising/metrics',
} as const;