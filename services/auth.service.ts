import apiClient from './api/client';
import { apiClient as api } from './api/client';
import { ENDPOINTS } from '../config/api';
import { LoginRequest, LoginResponse, User } from '../types/auth';

class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>(
        ENDPOINTS.auth.login,
        credentials
      );

      // Store the token for future requests
      await api.setAuthToken(response.data.token);

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
    const token = await api.getAuthToken();
    if (!token) return false;

    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      await api.removeAuthToken();
      return false;
    }
  }
}

export const authService = new AuthService();