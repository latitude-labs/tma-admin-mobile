import env from './env';

export const API_CONFIG = {
  BASE_URL: env.apiUrl,
  TIMEOUT: 30000,
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000,
};

export const getApiUrl = () => API_CONFIG.BASE_URL;

export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    user: '/auth/user',
    '2fa': {
      status: '/auth/2fa/status',
      setup: '/auth/2fa/setup',
      verify: '/auth/2fa/verify',
      send: '/auth/2fa/send',
      disable: '/auth/2fa/disable',
      trustedDevices: '/auth/2fa/trusted-devices',
      biometric: {
        register: '/auth/2fa/biometric/register',
      },
    },
  },
  clubs: '/clubs',
  bookings: '/bookings',
  endOfDayReports: '/end-of-day-reports',
  users: '/users',
  facebookPages: '/facebook-pages',
  advertisingMetrics: '/advertising/metrics',
} as const;