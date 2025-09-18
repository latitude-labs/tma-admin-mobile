import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../config/api';
import { router } from 'expo-router';
import { useApiHealthStore } from '../../store/apiHealthStore';

const TOKEN_KEY = '@tma_admin:token';

let logoutCallback: (() => Promise<void>) | null = null;
let serverErrorCallback: (() => void) | null = null;
let isHandlingUnauthorized = false;

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

        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Clear error count on successful response
        const apiHealth = useApiHealthStore.getState();
        if (apiHealth.errorCount > 0) {
          apiHealth.clearServerError();
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
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }

  public async removeAuthToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }

  public async getAuthToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  }

  private async handleUnauthorized() {
    // Prevent recursive handling of 401 errors
    if (isHandlingUnauthorized) {
      return;
    }

    isHandlingUnauthorized = true;

    try {
      // Clear token immediately
      await AsyncStorage.removeItem(TOKEN_KEY);

      // Call force logout callback if registered (won't call API)
      if (logoutCallback) {
        await logoutCallback();
      }
    } finally {
      // Reset the flag after a delay to allow for navigation
      setTimeout(() => {
        isHandlingUnauthorized = false;
      }, 1000);
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