import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const STORAGE_KEYS = {
  CLUBS: '@tma_clubs',
  BOOKINGS: '@tma_bookings',
  CLASS_TIMES: '@tma_class_times',
  COACH_CLASSES: '@tma_coach_classes',
  LAST_SYNC: '@tma_last_sync',
} as const;

export class OfflineStorage {
  private static instance: OfflineStorage;

  static getInstance(): OfflineStorage {
    if (!this.instance) {
      this.instance = new OfflineStorage();
    }
    return this.instance;
  }

  async saveClubs(clubs: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CLUBS, JSON.stringify(clubs));
      await this.updateLastSync('clubs');
    } catch (error) {
      console.error('Failed to save clubs to offline storage:', error);
    }
  }

  async getClubs(): Promise<any[] | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CLUBS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get clubs from offline storage:', error);
      return null;
    }
  }

  async saveBookings(bookings: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      await this.updateLastSync('bookings');
    } catch (error) {
      console.error('Failed to save bookings to offline storage:', error);
    }
  }

  async getBookings(): Promise<any[] | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BOOKINGS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get bookings from offline storage:', error);
      return null;
    }
  }

  private async updateLastSync(type: 'clubs' | 'bookings' | 'classTimes' | 'coachClasses'): Promise<void> {
    try {
      const lastSync = await this.getLastSync();
      const updated = {
        ...lastSync,
        [type]: new Date().toISOString(),
      };
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to update last sync time:', error);
    }
  }

  async getLastSync(): Promise<{ clubs?: string; bookings?: string; classTimes?: string; coachClasses?: string }> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to get last sync time:', error);
      return {};
    }
  }

  async saveClassTimes(classTimes: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CLASS_TIMES, JSON.stringify(classTimes));
      await this.updateLastSync('classTimes');
    } catch (error) {
      console.error('Failed to save class times to offline storage:', error);
    }
  }

  async getClassTimes(): Promise<any[] | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CLASS_TIMES);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get class times from offline storage:', error);
      return null;
    }
  }

  async saveCoachClasses(dateString: string, classes: any[]): Promise<void> {
    try {
      const storedData = await AsyncStorage.getItem(STORAGE_KEYS.COACH_CLASSES);
      const coachClassesData = storedData ? JSON.parse(storedData) : {};

      coachClassesData[dateString] = {
        classes,
        savedAt: new Date().toISOString()
      };

      await AsyncStorage.setItem(STORAGE_KEYS.COACH_CLASSES, JSON.stringify(coachClassesData));
      await this.updateLastSync('coachClasses');
    } catch (error) {
      console.error('Failed to save coach classes to offline storage:', error);
    }
  }

  async getCoachClasses(dateString: string): Promise<any[] | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.COACH_CLASSES);
      if (!data) return null;

      const coachClassesData = JSON.parse(data);
      return coachClassesData[dateString]?.classes || null;
    } catch (error) {
      console.error('Failed to get coach classes from offline storage:', error);
      return null;
    }
  }

  async getAllCoachClasses(): Promise<{ [date: string]: { classes: any[], savedAt: string } } | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.COACH_CLASSES);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get all coach classes from offline storage:', error);
      return null;
    }
  }

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.CLUBS,
        STORAGE_KEYS.BOOKINGS,
        STORAGE_KEYS.CLASS_TIMES,
        STORAGE_KEYS.COACH_CLASSES,
        STORAGE_KEYS.LAST_SYNC,
      ]);
    } catch (error) {
      console.error('Failed to clear offline storage:', error);
    }
  }

  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected === true;
  }
}

export const offlineStorage = OfflineStorage.getInstance();