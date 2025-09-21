import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SecureStorageItem {
  key: string;
  value: string;
  expiresAt?: number;
}

class SecureStorage {
  private static instance: SecureStorage;

  private constructor() {}

  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  async setItem(key: string, value: string, expiresInSeconds?: number): Promise<void> {
    try {
      const item: SecureStorageItem = {
        key,
        value,
        expiresAt: expiresInSeconds ? Date.now() + expiresInSeconds * 1000 : undefined,
      };

      await SecureStore.setItemAsync(key, JSON.stringify(item));
    } catch (error) {
      console.error(`Error setting secure item ${key}:`, error);
      throw error;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const itemString = await SecureStore.getItemAsync(key);
      if (!itemString) return null;

      const item: SecureStorageItem = JSON.parse(itemString);

      // Check if item has expired
      if (item.expiresAt && Date.now() > item.expiresAt) {
        await this.removeItem(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error(`Error getting secure item ${key}:`, error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Error removing secure item ${key}:`, error);
    }
  }

  async hasItem(key: string): Promise<boolean> {
    try {
      const item = await this.getItem(key);
      return item !== null;
    } catch (error) {
      return false;
    }
  }

  async migrateFromAsyncStorage(
    keys: string[],
    options?: { deleteAfterMigration?: boolean }
  ): Promise<{ migrated: string[]; failed: string[] }> {
    const migrated: string[] = [];
    const failed: string[] = [];

    for (const key of keys) {
      try {
        // Check if already migrated
        const existingSecure = await this.getItem(key);
        if (existingSecure) {
          migrated.push(key);
          continue;
        }

        // Get from AsyncStorage
        const value = await AsyncStorage.getItem(key);
        if (value) {
          // Store in SecureStore
          await this.setItem(key, value);
          migrated.push(key);

          // Remove from AsyncStorage if requested
          if (options?.deleteAfterMigration) {
            await AsyncStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.error(`Error migrating key ${key}:`, error);
        failed.push(key);
      }
    }

    return { migrated, failed };
  }

  async clearAll(keys: string[]): Promise<void> {
    for (const key of keys) {
      try {
        await this.removeItem(key);
      } catch (error) {
        console.error(`Error clearing key ${key}:`, error);
      }
    }
  }

  async getSecureObject<T>(key: string): Promise<T | null> {
    try {
      const value = await this.getItem(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Error parsing secure object ${key}:`, error);
      return null;
    }
  }

  async setSecureObject<T>(key: string, object: T, expiresInSeconds?: number): Promise<void> {
    try {
      const value = JSON.stringify(object);
      await this.setItem(key, value, expiresInSeconds);
    } catch (error) {
      console.error(`Error storing secure object ${key}:`, error);
      throw error;
    }
  }

  async isExpired(key: string): Promise<boolean> {
    try {
      const itemString = await SecureStore.getItemAsync(key);
      if (!itemString) return true;

      const item: SecureStorageItem = JSON.parse(itemString);
      if (!item.expiresAt) return false;

      return Date.now() > item.expiresAt;
    } catch (error) {
      return true;
    }
  }

  async getTimeToExpiry(key: string): Promise<number | null> {
    try {
      const itemString = await SecureStore.getItemAsync(key);
      if (!itemString) return null;

      const item: SecureStorageItem = JSON.parse(itemString);
      if (!item.expiresAt) return null;

      const timeLeft = item.expiresAt - Date.now();
      return timeLeft > 0 ? timeLeft : 0;
    } catch (error) {
      return null;
    }
  }
}

export const secureStorage = SecureStorage.getInstance();

// Storage keys for the app
export const STORAGE_KEYS = {
  // Auth related
  AUTH_TOKEN: 'tma_auth_token',
  REFRESH_TOKEN: 'tma_refresh_token',
  USER_DATA: 'tma_user_data',

  // 2FA related
  BIOMETRIC_TOKEN: 'tma_biometric_token',
  DEVICE_ID: 'tma_device_id',
  TRUST_TOKEN: 'tma_trust_token',
  PENDING_AUTH: 'tma_pending_auth',
  PREFERRED_2FA_METHOD: 'tma_2fa_preferred_method',
  BIOMETRIC_ENROLLED: 'tma_biometric_enrolled',

  // Settings
  APP_SETTINGS: 'tma_app_settings',
  THEME_PREFERENCE: 'tma_theme_preference',

  // Session
  SESSION_DATA: 'tma_session_data',
  LAST_ACTIVITY: 'tma_last_activity',
} as const;

// Helper function to clear all sensitive data
export async function clearAllSecureData(): Promise<void> {
  const sensitiveKeys = [
    STORAGE_KEYS.AUTH_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER_DATA,
    STORAGE_KEYS.BIOMETRIC_TOKEN,
    STORAGE_KEYS.DEVICE_ID,
    STORAGE_KEYS.TRUST_TOKEN,
    STORAGE_KEYS.PENDING_AUTH,
    STORAGE_KEYS.SESSION_DATA,
  ];

  await secureStorage.clearAll(sensitiveKeys);
}

// Helper function to migrate auth data from AsyncStorage to SecureStore
export async function migrateAuthDataToSecureStorage(): Promise<void> {
  const authKeys = [
    '@tma_admin:token',
    'auth-storage',
    STORAGE_KEYS.AUTH_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
  ];

  const result = await secureStorage.migrateFromAsyncStorage(authKeys, {
    deleteAfterMigration: true,
  });

  console.log('Auth data migration result:', result);
}