import apiClient from './api/client';
import { biometricService } from './biometric.service';
import * as SecureStore from 'expo-secure-store';
import { ENDPOINTS } from '../config/api';

// Use mock service in development builds (automatically detected)
// This ensures OTP works without backend configuration in dev
const USE_MOCK = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK_2FA !== 'false';

export type TwoFactorMethod = 'otp' | 'biometric';

export interface TwoFactorStatus {
  enabled: boolean;
  methods: TwoFactorMethod[];
  biometricEnrolled: boolean;
  trustedDevices: TrustedDevice[];
}

export interface TrustedDevice {
  id: string;
  name: string;
  lastUsed: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface TwoFactorVerifyRequest {
  method: 'otp' | 'biometric' | 'recovery';
  code?: string;
  biometric_token?: string;
  device_id: string;
  trust_device?: boolean;
  temp_token: string;
}

export interface TwoFactorVerifyResponse {
  success: boolean;
  token: string;
  expires_at: string;
  user: any;
  trust_token?: string;
}

export interface TwoFactorSetupResponse {
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
}

class TwoFactorService {
  private static instance: TwoFactorService;

  private readonly TRUST_TOKEN_KEY = 'tma_trust_token';
  private readonly PENDING_AUTH_KEY = 'tma_pending_auth';
  private readonly PREFERRED_METHOD_KEY = 'tma_2fa_preferred_method';

  private constructor() {}

  static getInstance(): TwoFactorService {
    if (!TwoFactorService.instance) {
      TwoFactorService.instance = new TwoFactorService();
    }
    return TwoFactorService.instance;
  }

  async getStatus(): Promise<TwoFactorStatus> {
    // Use mock service if enabled
    if (USE_MOCK) {
      const { mockTwoFactorService } = await import('./mockTwoFactor.service');
      return mockTwoFactorService.getStatus();
    }

    try {
      const response = await apiClient.get<TwoFactorStatus>(
        ENDPOINTS.auth['2fa'].status
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching 2FA status:', error);
      throw error;
    }
  }

  async setup2FA(method: TwoFactorMethod): Promise<TwoFactorSetupResponse> {
    try {
      const response = await apiClient.post<TwoFactorSetupResponse>(
        ENDPOINTS.auth['2fa'].setup,
        { method }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error setting up 2FA:', error);
      throw error;
    }
  }

  async sendOTP(email?: string, phone?: string): Promise<{ sent: boolean; message: string }> {
    // Use mock service if enabled
    if (USE_MOCK) {
      const { mockTwoFactorService } = await import('./mockTwoFactor.service');
      return mockTwoFactorService.sendOTP(email || 'test@example.com');
    }

    try {
      // Try with email first, as it's more commonly available
      const payload: any = {};

      if (email) {
        payload.email = email;
      }

      if (phone) {
        payload.phone_number = phone;
      }

      // If neither email nor phone provided, get from pending auth
      if (!email && !phone) {
        const pendingAuth = await this.getPendingAuth();
        if (pendingAuth?.email) {
          payload.email = pendingAuth.email;
        }
      }

      const response = await apiClient.post<{ sent: boolean; message: string }>(
        ENDPOINTS.auth['2fa'].send,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('Error sending OTP:', error);

      // Provide more helpful error messages
      if (error.response?.data?.message) {
        if (error.response.data.message.includes('phone number')) {
          throw new Error('Please update your profile with a phone number to receive OTP codes.');
        }
        throw new Error(error.response.data.message);
      }

      throw error;
    }
  }

  async verifyOTP(code: string, trustDevice: boolean = false): Promise<TwoFactorVerifyResponse> {
    // Use mock service if enabled
    if (USE_MOCK) {
      const { mockTwoFactorService } = await import('./mockTwoFactor.service');
      const result = await mockTwoFactorService.verifyOTP(code, trustDevice);
      // Clear temp token after successful verification
      await SecureStore.deleteItemAsync('tma_temp_token');
      return result;
    }

    try {
      const deviceId = await biometricService.getDeviceId();
      const pendingAuth = await this.getPendingAuth();
      const tempToken = await SecureStore.getItemAsync('tma_temp_token');

      if (!deviceId || !tempToken) {
        throw new Error('Missing required authentication data');
      }

      const request: TwoFactorVerifyRequest = {
        method: 'otp',
        code,
        device_id: deviceId,
        trust_device: trustDevice,
        temp_token: tempToken,
      };

      const response = await apiClient.post<TwoFactorVerifyResponse>(
        ENDPOINTS.auth['2fa'].verify,
        request
      );

      if (response.data.trust_token && trustDevice) {
        await SecureStore.setItemAsync(this.TRUST_TOKEN_KEY, response.data.trust_token);
      }

      // Clear temp token after successful verification
      await SecureStore.deleteItemAsync('tma_temp_token');

      return response.data;
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  }

  async verifyBiometric(): Promise<TwoFactorVerifyResponse> {
    // Use mock service if enabled
    if (USE_MOCK) {
      // Still perform biometric auth for UX testing
      const authResult = await biometricService.authenticate(
        'Verify your identity to continue',
        'Use OTP instead'
      );

      if (!authResult.success) {
        throw new Error(authResult.error || 'Biometric authentication failed');
      }

      const { mockTwoFactorService } = await import('./mockTwoFactor.service');
      const result = await mockTwoFactorService.verifyBiometric();
      // Clear temp token after successful verification
      await SecureStore.deleteItemAsync('tma_temp_token');
      return result;
    }

    try {
      // First authenticate with biometrics
      const authResult = await biometricService.authenticate(
        'Verify your identity to continue',
        'Use OTP instead'
      );

      if (!authResult.success) {
        throw new Error(authResult.error || 'Biometric authentication failed');
      }

      // Get stored biometric token
      const biometricToken = await biometricService.getBiometricToken();
      const deviceId = await biometricService.getDeviceId();
      const tempToken = await SecureStore.getItemAsync('tma_temp_token');

      if (!biometricToken) {
        throw new Error('No biometric token found. Please set up biometric authentication first.');
      }

      if (!deviceId || !tempToken) {
        throw new Error('Missing required authentication data');
      }

      const request: TwoFactorVerifyRequest = {
        method: 'biometric',
        biometric_token: biometricToken,
        device_id: deviceId,
        temp_token: tempToken,
      };

      const response = await apiClient.post<TwoFactorVerifyResponse>(
        ENDPOINTS.auth['2fa'].verify,
        request
      );

      // Clear temp token after successful verification
      await SecureStore.deleteItemAsync('tma_temp_token');

      return response.data;
    } catch (error: any) {
      console.error('Error verifying biometric:', error);
      throw error;
    }
  }

  async enrollBiometric(userId: number, deviceName?: string): Promise<{ enrolled: boolean; token?: string }> {
    try {
      const deviceId = await biometricService.getDeviceId();
      if (!deviceId) {
        throw new Error('Unable to generate device ID');
      }

      // First get a biometric enrollment token from the server
      const response = await apiClient.post<{ token: string }>(
        ENDPOINTS.auth['2fa'].biometric.register,
        {
          user_id: userId,
          device_id: deviceId,
          device_name: deviceName || 'Mobile Device'
        }
      );

      // Enroll the biometric on the device
      const enrolled = await biometricService.enrollBiometric(String(userId), response.data.token);

      if (enrolled) {
        return { enrolled: true, token: response.data.token };
      } else {
        return { enrolled: false };
      }
    } catch (error: any) {
      console.error('Error enrolling biometric:', error);
      throw error;
    }
  }

  async disable2FA(verificationCode: string): Promise<{ disabled: boolean }> {
    try {
      const response = await apiClient.delete<{ disabled: boolean }>(
        ENDPOINTS.auth['2fa'].disable,
        {
          data: { verification_code: verificationCode },
        }
      );

      if (response.data.disabled) {
        // Clean up local biometric enrollment
        await biometricService.removeBiometricEnrollment();
        await this.clearTrustToken();
      }

      return response.data;
    } catch (error: any) {
      console.error('Error disabling 2FA:', error);
      throw error;
    }
  }

  async getTrustedDevices(): Promise<TrustedDevice[]> {
    try {
      const status = await this.getStatus();
      return status.trustedDevices || [];
    } catch (error) {
      console.error('Error fetching trusted devices:', error);
      return [];
    }
  }

  async removeTrustedDevice(deviceId: string): Promise<{ removed: boolean }> {
    try {
      const response = await apiClient.delete<{ removed: boolean }>(
        `${ENDPOINTS.auth['2fa'].trustedDevices}/${deviceId}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error removing trusted device:', error);
      throw error;
    }
  }

  async getTrustToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(this.TRUST_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting trust token:', error);
      return null;
    }
  }

  async clearTrustToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.TRUST_TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing trust token:', error);
    }
  }

  async storePendingAuth(email: string, password: string): Promise<void> {
    try {
      const pendingAuth = JSON.stringify({ email, password, timestamp: Date.now() });
      await SecureStore.setItemAsync(this.PENDING_AUTH_KEY, pendingAuth);
    } catch (error) {
      console.error('Error storing pending auth:', error);
    }
  }

  async getPendingAuth(): Promise<{ email: string; password: string } | null> {
    try {
      const pendingAuth = await SecureStore.getItemAsync(this.PENDING_AUTH_KEY);
      if (!pendingAuth) return null;

      const parsed = JSON.parse(pendingAuth);

      // Check if pending auth is older than 5 minutes
      if (Date.now() - parsed.timestamp > 5 * 60 * 1000) {
        await this.clearPendingAuth();
        return null;
      }

      return { email: parsed.email, password: parsed.password };
    } catch (error) {
      console.error('Error getting pending auth:', error);
      return null;
    }
  }

  async clearPendingAuth(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.PENDING_AUTH_KEY);
    } catch (error) {
      console.error('Error clearing pending auth:', error);
    }
  }

  async getPreferredMethod(): Promise<TwoFactorMethod> {
    try {
      const method = await SecureStore.getItemAsync(this.PREFERRED_METHOD_KEY);
      return (method as TwoFactorMethod) || 'biometric';
    } catch (error) {
      console.error('Error getting preferred method:', error);
      return 'biometric';
    }
  }

  async setPreferredMethod(method: TwoFactorMethod): Promise<void> {
    try {
      await SecureStore.setItemAsync(this.PREFERRED_METHOD_KEY, method);
    } catch (error) {
      console.error('Error setting preferred method:', error);
    }
  }

  async checkBiometricAvailability(): Promise<{
    available: boolean;
    enrolled: boolean;
    type: string;
  }> {
    const capabilities = await biometricService.checkBiometricCapabilities();
    const enrolled = await biometricService.isBiometricEnrolled();

    return {
      available: capabilities.hasHardware && capabilities.isEnrolled,
      enrolled,
      type: biometricService.getBiometricTypeString(capabilities.biometricType),
    };
  }

  formatOTPForDisplay(otp: string): string {
    // Format OTP as XXX XXX for better readability
    if (otp.length === 6) {
      return `${otp.slice(0, 3)} ${otp.slice(3)}`;
    }
    return otp;
  }

  validateOTPFormat(otp: string): boolean {
    // Remove any spaces and check if it's 6 digits
    const cleaned = otp.replace(/\s/g, '');
    return /^\d{6}$/.test(cleaned);
  }
}

export const twoFactorService = TwoFactorService.getInstance();