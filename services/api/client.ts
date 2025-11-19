import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../config/api';
import { router } from 'expo-router';
import { useApiHealthStore } from '../../store/apiHealthStore';
import { secureStorage, STORAGE_KEYS } from '../../utils/secureStorage';

const TOKEN_KEY = '@tma_admin:token'; // Legacy key for migration
const SECURE_TOKEN_KEY = STORAGE_KEYS.AUTH_TOKEN; // New secure storage key

let logoutCallback: (() => Promise<void>) | null = null;
let serverErrorCallback: (() => void) | null = null;
let isHandlingUnauthorized = false;
let lastTokenSetTime = 0;

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token and check API health
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Check if API is suspended
        const apiHealth = useApiHealthStore.getState();
        if (!apiHealth.canMakeApiCall()) {
          return Promise.reject({
            message: 'API is temporarily suspended due to server errors',
            status: 503,
            isApiSuspended: true,
          });
        }

        // Skip token for auth endpoints
        const isAuthEndpoint = config.url?.includes('/auth/login') ||
                              config.url?.includes('/auth/register') ||
                              config.url?.includes('/auth/forgot-password');

        if (isAuthEndpoint) {
          if (__DEV__) {
            console.log('🔓 Skipping token for auth endpoint:', config.url);
          }
          return config;
        }

        // Try secure storage first, then fallback to AsyncStorage for migration
        let token = await secureStorage.getItem(SECURE_TOKEN_KEY);

        if (!token) {
          // Check legacy AsyncStorage location
          token = await AsyncStorage.getItem(TOKEN_KEY);
          if (token) {
            // Migrate to secure storage
            await secureStorage.setItem(SECURE_TOKEN_KEY, token);
            await AsyncStorage.removeItem(TOKEN_KEY);
          }
        }

        if (token) {
          // Make sure token is a string and not wrapped in quotes
          if (typeof token === 'string') {
            // Remove any extra quotes that might have been added
            token = token.replace(/^["']|["']$/g, '');
          }

          config.headers.Authorization = `Bearer ${token}`;

          // Add If-None-Match header if ETag is provided
          if (config.headers && config.headers['If-None-Match']) {
            // ETag header is already set by the caller
          }

          // Debug logging in development
          if (__DEV__) {
            console.log('🔑 API Request with token:', {
              url: config.url,
              method: config.method,
              hasToken: !!token,
              tokenLength: token.length,
              tokenPrefix: token.substring(0, 20) + '...',
              authHeader: config.headers.Authorization?.substring(0, 30) + '...'
            });
          }
        } else if (__DEV__) {
          console.log('⚠️ API Request without token:', config.url);
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
    );

    // Response interceptor to handle errors and ETags
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Clear error count on successful response
        const apiHealth = useApiHealthStore.getState();
        if (apiHealth.errorCount > 0) {
          apiHealth.clearServerError();
        }

        // Handle ETag responses
        if (response.status === 304) {
          // 304 Not Modified - data hasn't changed
          return {
            ...response,
            data: { notModified: true },
          };
        }

        // Include ETag in response if present
        if (response.headers.etag) {
          response.data = {
            ...response.data,
            __etag: response.headers.etag,
          };
        }

        return response;
      },
      async (error: AxiosError) => {
        const status = error.response?.status;
        const requestUrl = error.config?.url;

        // Don't handle 401 for logout endpoint (it's expected when token is invalid)
        const isLogoutEndpoint = requestUrl?.includes('/auth/logout');

        // Handle 5XX server errors
        if (status && status >= 500 && status < 600) {
          this.handleServerError();
        }
        // Handle 401 unauthorized (except for logout endpoint)
        else if (status === 401 && !isLogoutEndpoint) {
          await this.handleUnauthorized();
        }

        // Format error message for better handling
        const message =
          (error.response?.data as any)?.message ||
          error.message ||
          'Something went wrong';

        return Promise.reject({
          ...error,
          message,
          status: error.response?.status,
          data: error.response?.data,
        });
      }
    );
  }

  public getClient(): AxiosInstance {
    return this.client;
  }

  public async setAuthToken(token: string): Promise<void> {
    console.log('🔑 API CLIENT: Setting auth token', {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20) + '...'
    });

    // Record when token was set
    lastTokenSetTime = Date.now();

    // Store in secure storage
    await secureStorage.setItem(SECURE_TOKEN_KEY, token);
    // Remove from legacy location if exists
    await AsyncStorage.removeItem(TOKEN_KEY);

    // Verify it was stored correctly
    const retrieved = await secureStorage.getItem(SECURE_TOKEN_KEY);
    console.log('✅ API CLIENT: Token set and verified', {
      originalLength: token.length,
      retrievedLength: retrieved?.length,
      matches: token === retrieved
    });
  }

  public async removeAuthToken(): Promise<void> {
    // Remove from both locations to ensure clean state
    await secureStorage.removeItem(SECURE_TOKEN_KEY);
    await AsyncStorage.removeItem(TOKEN_KEY);
  }

  public async getAuthToken(): Promise<string | null> {
    // Try secure storage first
    const token = await secureStorage.getItem(SECURE_TOKEN_KEY);
    if (token) return token;

    // Fallback to legacy location
    return AsyncStorage.getItem(TOKEN_KEY);
  }

  private async handleUnauthorized() {
    // Prevent recursive handling of 401 errors
    if (isHandlingUnauthorized) {
      console.log('⚠️ Already handling unauthorized, skipping');
      return;
    }

    // Don't handle 401 if we just set a token (within 10 seconds)
    const timeSinceTokenSet = Date.now() - lastTokenSetTime;
    if (timeSinceTokenSet < 10000) {
      console.log('⏳ Ignoring 401 - token was just set', {
        timeSinceTokenSet,
        lastTokenSetTime
      });
      return;
    }

    isHandlingUnauthorized = true;

    try {
      console.log('🚨 Handling 401 Unauthorized error');

      // Get the current token to see if it exists
      const currentToken = await secureStorage.getItem(SECURE_TOKEN_KEY);
      console.log('🔍 Current token status:', {
        hasToken: !!currentToken,
        tokenLength: currentToken?.length
      });

      // Clear token immediately from both locations
      await secureStorage.removeItem(SECURE_TOKEN_KEY);
      await AsyncStorage.removeItem(TOKEN_KEY);

      // Call force logout callback if registered (won't call API)
      if (logoutCallback) {
        console.log('🔄 Calling logout callback');
        await logoutCallback();
      }
    } finally {
      // Reset the flag after a delay to allow for navigation
      setTimeout(() => {
        isHandlingUnauthorized = false;
      }, 2000); // Increased delay
    }
  }

  public setLogoutCallback(callback: () => Promise<void>) {
    logoutCallback = callback;
  }

  private handleServerError() {
    const apiHealth = useApiHealthStore.getState();
    apiHealth.recordServerError();

    // Call server error callback if registered
    if (serverErrorCallback) {
      serverErrorCallback();
    }
  }

  public setServerErrorCallback(callback: () => void) {
    serverErrorCallback = callback;
  }
}

export const apiClient = new ApiClient();
export default apiClient.getClient();