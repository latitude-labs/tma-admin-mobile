import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  method?: 'faceId' | 'touchId' | 'fingerprint' | 'iris' | 'fallback';
}

export interface BiometricCapabilities {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedAuthTypes: LocalAuthentication.AuthenticationType[];
  biometricType: 'none' | 'touchId' | 'faceId' | 'fingerprint' | 'iris' | 'unknown';
}

class BiometricService {
  private static instance: BiometricService;

  private readonly BIOMETRIC_TOKEN_KEY = 'tma_biometric_token';
  private readonly DEVICE_ID_KEY = 'tma_device_id';
  private readonly BIOMETRIC_ENROLLED_KEY = 'tma_biometric_enrolled';

  private constructor() {}

  static getInstance(): BiometricService {
    if (!BiometricService.instance) {
      BiometricService.instance = new BiometricService();
    }
    return BiometricService.instance;
  }

  async checkBiometricCapabilities(): Promise<BiometricCapabilities> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedAuthTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      let biometricType: BiometricCapabilities['biometricType'] = 'none';

      if (hasHardware && isEnrolled && supportedAuthTypes.length > 0) {
        if (supportedAuthTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          biometricType = 'faceId';
        } else if (supportedAuthTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          biometricType = 'fingerprint';
        } else if (supportedAuthTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          biometricType = 'iris';
        } else {
          biometricType = 'unknown';
        }
      }

      return {
        hasHardware,
        isEnrolled,
        supportedAuthTypes,
        biometricType,
      };
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      return {
        hasHardware: false,
        isEnrolled: false,
        supportedAuthTypes: [],
        biometricType: 'none',
      };
    }
  }

  async authenticate(
    promptMessage?: string,
    fallbackLabel?: string
  ): Promise<BiometricAuthResult> {
    try {
      const capabilities = await this.checkBiometricCapabilities();

      if (!capabilities.hasHardware) {
        return {
          success: false,
          error: 'No biometric hardware available on this device',
        };
      }

      if (!capabilities.isEnrolled) {
        return {
          success: false,
          error: 'No biometric authentication methods are enrolled',
        };
      }

      // Provide haptic feedback before showing biometric prompt
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'Authenticate to access your TMA Admin account',
        fallbackLabel: fallbackLabel || 'Use PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Success haptic feedback
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        let method: BiometricAuthResult['method'] = 'fallback';
        if (capabilities.biometricType === 'faceId') {
          method = 'faceId';
        } else if (capabilities.biometricType === 'fingerprint') {
          method = 'fingerprint';
        } else if (capabilities.biometricType === 'touchId') {
          method = 'touchId';
        } else if (capabilities.biometricType === 'iris') {
          method = 'iris';
        }

        return {
          success: true,
          method,
        };
      } else {
        // Error haptic feedback
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        let errorMessage = 'Authentication failed';
        switch (result.error) {
          case 'SystemCancel':
            errorMessage = 'Authentication was cancelled by the system';
            break;
          case 'UserCancel':
            errorMessage = 'Authentication was cancelled';
            break;
          case 'UserFallback':
            errorMessage = 'User chose to use fallback authentication';
            break;
          case 'Lockout':
            errorMessage = 'Too many failed attempts. Please try again later';
            break;
          default:
            errorMessage = result.error || 'Authentication failed';
        }

        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred during authentication',
      };
    }
  }

  async enrollBiometric(userId: string, token: string): Promise<boolean> {
    try {
      const capabilities = await this.checkBiometricCapabilities();

      if (!capabilities.hasHardware || !capabilities.isEnrolled) {
        return false;
      }

      // First authenticate to ensure it's the device owner
      const authResult = await this.authenticate(
        'Authenticate to enable biometric login',
        'Use PIN'
      );

      if (!authResult.success) {
        return false;
      }

      // Generate a unique device ID if not exists
      let deviceId = await SecureStore.getItemAsync(this.DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = `${userId}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        await SecureStore.setItemAsync(this.DEVICE_ID_KEY, deviceId);
      }

      // Store the biometric token securely
      await SecureStore.setItemAsync(this.BIOMETRIC_TOKEN_KEY, token);
      await SecureStore.setItemAsync(this.BIOMETRIC_ENROLLED_KEY, 'true');

      return true;
    } catch (error) {
      console.error('Error enrolling biometric:', error);
      return false;
    }
  }

  async getBiometricToken(): Promise<string | null> {
    try {
      const isEnrolled = await SecureStore.getItemAsync(this.BIOMETRIC_ENROLLED_KEY);
      if (isEnrolled !== 'true') {
        return null;
      }

      return await SecureStore.getItemAsync(this.BIOMETRIC_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting biometric token:', error);
      return null;
    }
  }

  async getDeviceId(): Promise<string | null> {
    try {
      let deviceId = await SecureStore.getItemAsync(this.DEVICE_ID_KEY);

      // Generate device ID if it doesn't exist
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        await SecureStore.setItemAsync(this.DEVICE_ID_KEY, deviceId);
      }

      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return null;
    }
  }

  async removeBiometricEnrollment(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.BIOMETRIC_TOKEN_KEY);
      await SecureStore.deleteItemAsync(this.BIOMETRIC_ENROLLED_KEY);
    } catch (error) {
      console.error('Error removing biometric enrollment:', error);
    }
  }

  async isBiometricEnrolled(): Promise<boolean> {
    try {
      const enrolled = await SecureStore.getItemAsync(this.BIOMETRIC_ENROLLED_KEY);
      return enrolled === 'true';
    } catch (error) {
      console.error('Error checking biometric enrollment:', error);
      return false;
    }
  }

  getBiometricTypeString(type: BiometricCapabilities['biometricType']): string {
    switch (type) {
      case 'faceId':
        return 'Face ID';
      case 'touchId':
        return 'Touch ID';
      case 'fingerprint':
        return 'Fingerprint';
      case 'iris':
        return 'Iris Recognition';
      default:
        return 'Biometric Authentication';
    }
  }

  getBiometricIcon(type: BiometricCapabilities['biometricType']): string {
    switch (type) {
      case 'faceId':
        return 'face-recognition';
      case 'touchId':
      case 'fingerprint':
        return 'fingerprint';
      case 'iris':
        return 'visibility';
      default:
        return 'lock';
    }
  }
}

export const biometricService = BiometricService.getInstance();