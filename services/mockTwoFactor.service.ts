// Mock 2FA service for non-production builds
// Accepts ANY 6-digit code and doesn't make backend calls

class MockTwoFactorService {
  private otpSent = false;

  async sendOTP(email?: string): Promise<{ sent: boolean; message: string }> {
    console.log('🔧 MOCK MODE: Simulating OTP send to', email);
    this.otpSent = true;

    // Simulate network delay for realistic UX
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      sent: true,
      message: `[DEV MODE] Enter any 6-digit code to continue`
    };
  }

  async verifyOTP(code: string, trustDevice: boolean = false): Promise<any> {
    console.log('🔧 MOCK MODE: Verifying OTP', code);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Accept any 6-digit code in development
    if (/^\d{6}$/.test(code)) {
      try {
        const SecureStore = await import('expo-secure-store');

        // Get the REAL token and user data stored during login
        const realToken = await SecureStore.getItemAsync('tma_mock_token');
        const realUserData = await SecureStore.getItemAsync('tma_mock_user');
        const realExpires = await SecureStore.getItemAsync('tma_mock_expires');

        if (realToken && realUserData) {
          const user = JSON.parse(realUserData);
          console.log('🔧 MOCK MODE: Returning real auth data for user:', user.email, 'is_admin:', user.is_admin);
          console.log('🔧 MOCK MODE: Token details:', {
            hasToken: !!realToken,
            tokenLength: realToken.length,
            tokenPrefix: realToken.substring(0, 20) + '...',
            expiresAt: realExpires
          });

          // Clean up mock storage
          await SecureStore.deleteItemAsync('tma_mock_token');
          await SecureStore.deleteItemAsync('tma_mock_user');
          await SecureStore.deleteItemAsync('tma_mock_expires');

          return {
            success: true,
            token: realToken, // Use the REAL token from backend
            expires_at: realExpires || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            user: user, // Use the REAL user data
            trust_token: trustDevice ? 'mock-trust-token' : undefined
          };
        }
      } catch (e) {
        console.error('🔧 MOCK MODE: Error getting real auth data:', e);
      }

      // Fallback if something goes wrong
      const storedUser = await this.getMockUserData();
      return {
        success: true,
        token: 'mock-auth-token-' + Date.now(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        user: storedUser,
        trust_token: trustDevice ? 'mock-trust-token' : undefined
      };
    } else {
      throw new Error('Please enter a 6-digit code');
    }
  }

  private async getMockUserData() {
    // Try to get actual user data from login response
    try {
      const SecureStore = await import('expo-secure-store');

      // First try to get the mock user data (set during login)
      const mockUserData = await SecureStore.getItemAsync('tma_mock_user');
      if (mockUserData) {
        const user = JSON.parse(mockUserData);
        console.log('🔧 MOCK MODE: Using actual user data:', user.email, 'is_admin:', user.is_admin);
        return user;
      }

      // Fallback to get user data from storage
      const userData = await SecureStore.getItemAsync('tma_user_data');
      if (userData) {
        const user = JSON.parse(userData);
        console.log('🔧 MOCK MODE: Using stored user data:', user.email, 'is_admin:', user.is_admin);
        return user;
      }
    } catch (e) {
      console.error('🔧 MOCK MODE: Error getting user data:', e);
    }

    // This should never happen in real usage
    console.warn('🔧 MOCK MODE: Using fallback user data');
    return {
      id: 1,
      email: 'dev@example.com',
      name: 'Development User',
      is_admin: false, // Default to non-admin for safety
    };
  }

  async verifyBiometric(): Promise<any> {
    console.log('🔧 MOCK MODE: Verifying biometric');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const SecureStore = await import('expo-secure-store');

      // Get the REAL token and user data stored during login
      const realToken = await SecureStore.getItemAsync('tma_mock_token');
      const realUserData = await SecureStore.getItemAsync('tma_mock_user');
      const realExpires = await SecureStore.getItemAsync('tma_mock_expires');

      if (realToken && realUserData) {
        const user = JSON.parse(realUserData);
        console.log('🔧 MOCK MODE: Biometric - Returning real auth data for user:', user.email, 'is_admin:', user.is_admin);

        // Clean up mock storage
        await SecureStore.deleteItemAsync('tma_mock_token');
        await SecureStore.deleteItemAsync('tma_mock_user');
        await SecureStore.deleteItemAsync('tma_mock_expires');

        return {
          success: true,
          token: realToken, // Use the REAL token from backend
          expires_at: realExpires || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          user: user // Use the REAL user data
        };
      }
    } catch (e) {
      console.error('🔧 MOCK MODE: Error getting real auth data for biometric:', e);
    }

    // Fallback if something goes wrong
    const storedUser = await this.getMockUserData();
    return {
      success: true,
      token: 'mock-auth-token-biometric-' + Date.now(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      user: storedUser
    };
  }

  async getStatus(): Promise<any> {
    return {
      enabled: true,
      methods: ['otp', 'biometric'],
      biometricEnrolled: false,
      trustedDevices: [
        {
          id: '1',
          name: 'iPhone 15 Pro',
          lastUsed: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          isCurrent: true
        }
      ]
    };
  }
}

export const mockTwoFactorService = new MockTwoFactorService();