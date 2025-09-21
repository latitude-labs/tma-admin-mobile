import apiClient from './api/client';
import { apiClient as api } from './api/client';
import { ENDPOINTS } from '../config/api';
import { LoginRequest, LoginResponse, User } from '../types/auth';
import { secureStorage, STORAGE_KEYS } from '../utils/secureStorage';
import { biometricService } from './biometric.service';
import * as SecureStore from 'expo-secure-store';

class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // Get device ID and trust token if available
      const deviceId = await biometricService.getDeviceId();
      const trustToken = await SecureStore.getItemAsync('tma_trust_token');

      const loginData: any = {
        ...credentials,
        device_id: deviceId || undefined,
        trust_token: trustToken || undefined,
      };

      const response = await apiClient.post<LoginResponse>(
        ENDPOINTS.auth.login,
        loginData
      );

      // Check if 2FA is required
      if (response.data.requires_2fa) {
        // Don't store the token yet if 2FA is required
        return response.data;
      }

      // Store the token for future requests (no 2FA required or trust token worked)
      if (response.data.token) {
        console.log('🔐 AUTH SERVICE: Setting token after login');
        await api.setAuthToken(response.data.token);
        // Also store in secure storage
        await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
        console.log('✅ AUTH SERVICE: Token stored successfully');
      }

      return response.data;
    } catch (error: any) {
      throw {
        message: error.message || 'Invalid credentials',
        errors: error.data?.errors,
        status: error.status,
      };
    }
  }

  async logout(): Promise<void> {
    try {
      // Check if we have a token before attempting logout
      const token = await api.getAuthToken();
      if (token) {
        await apiClient.post(ENDPOINTS.auth.logout);
      }
    } catch (error: any) {
      // Only log if it's not a 401 (which is expected when token is invalid)
      if (error.status !== 401) {
        console.error('Logout error:', error);
      }
    } finally {
      await api.removeAuthToken();
      // Clear secure storage tokens
      await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      await secureStorage.removeItem(STORAGE_KEYS.USER_DATA);
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<User>(ENDPOINTS.auth.user);
      return response.data;
    } catch (error: any) {
      throw {
        message: error.message || 'Failed to fetch user',
        status: error.status,
      };
    }
  }

  async checkAuthStatus(): Promise<boolean> {
    // First check secure storage
    let token = await secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

    // Fallback to AsyncStorage if not in secure storage
    if (!token) {
      token = await api.getAuthToken();
    }

    if (!token) return false;

    try {
      // Ensure token is set in API client
      await api.setAuthToken(token);
      await this.getCurrentUser();
      return true;
    } catch (error) {
      await api.removeAuthToken();
      await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      return false;
    }
  }
}

export const authService = new AuthService();