import AsyncStorage from '@react-native-async-storage/async-storage';

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

interface CacheEntry {
  data: any;
  etag?: string;
  timestamp: number;
  expiresAt: number;
}

class RequestManager {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private etagCache: Map<string, string> = new Map();

  // Default cache duration: 5 minutes
  private defaultCacheDuration = 5 * 60 * 1000;

  // Request deduplication window: 2 seconds
  private deduplicationWindow = 2000;

  /**
   * Get a unique key for a request
   */
  private getRequestKey(url: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${url}:${paramString}`;
  }

  /**
   * Execute a request with deduplication and caching
   */
  async execute<T>(
    url: string,
    requestFn: () => Promise<T>,
    options: {
      params?: any;
      cacheDuration?: number;
      forceRefresh?: boolean;
      useEtag?: boolean;
    } = {}
  ): Promise<T> {
    const key = this.getRequestKey(url, options.params);
    const now = Date.now();

    // Check if we should force refresh
    if (!options.forceRefresh) {
      // Check for pending request (deduplication)
      const pending = this.pendingRequests.get(key);
      if (pending && (now - pending.timestamp) < this.deduplicationWindow) {
        console.log(`[RequestManager] Deduplicating request: ${url}`);
        return pending.promise;
      }

      // Check cache
      const cached = this.cache.get(key);
      if (cached && cached.expiresAt > now) {
        console.log(`[RequestManager] Cache hit: ${url}`);
        return cached.data;
      }
    }

    // Create new request
    console.log(`[RequestManager] New request: ${url}`);
    const promise = requestFn()
      .then(data => {
        // Cache the successful response
        const cacheDuration = options.cacheDuration ?? this.defaultCacheDuration;
        this.cache.set(key, {
          data,
          timestamp: now,
          expiresAt: now + cacheDuration,
        });

        // Clean up pending request
        this.pendingRequests.delete(key);

        return data;
      })
      .catch(error => {
        // Clean up pending request on error
        this.pendingRequests.delete(key);
        throw error;
      });

    // Store as pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: now,
    });

    return promise;
  }

  /**
   * Execute request with ETag support
   */
  async executeWithEtag<T>(
    url: string,
    requestFn: (etag?: string) => Promise<{ data: T; etag?: string; notModified?: boolean }>,
    options: {
      params?: any;
      cacheDuration?: number;
      forceRefresh?: boolean;
    } = {}
  ): Promise<T> {
    const key = this.getRequestKey(url, options.params);
    const now = Date.now();

    // Check cache first (unless forced refresh)
    if (!options.forceRefresh) {
      const cached = this.cache.get(key);
      if (cached && cached.expiresAt > now) {
        console.log(`[RequestManager] ETag cache hit: ${url}`);
        return cached.data;
      }
    }

    // Get stored ETag
    const storedEtag = this.etagCache.get(key);

    try {
      const response = await requestFn(storedEtag);

      if (response.notModified && storedEtag) {
        // 304 Not Modified - use cached data
        console.log(`[RequestManager] 304 Not Modified: ${url}`);
        const cached = this.cache.get(key);
        if (cached) {
          // Extend cache expiry
          cached.expiresAt = now + (options.cacheDuration ?? this.defaultCacheDuration);
          return cached.data;
        }
      }

      // New or updated data
      if (response.etag) {
        this.etagCache.set(key, response.etag);
      }

      // Cache the response
      const cacheDuration = options.cacheDuration ?? this.defaultCacheDuration;
      this.cache.set(key, {
        data: response.data,
        etag: response.etag,
        timestamp: now,
        expiresAt: now + cacheDuration,
      });

      return response.data;
    } catch (error) {
      // On error, try to return cached data if available
      const cached = this.cache.get(key);
      if (cached) {
        console.log(`[RequestManager] Using stale cache on error: ${url}`);
        return cached.data;
      }
      throw error;
    }
  }

  /**
   * Clear cache for a specific key or all cache
   */
  clearCache(url?: string, params?: any): void {
    if (url) {
      const key = this.getRequestKey(url, params);
      this.cache.delete(key);
      this.etagCache.delete(key);
      this.pendingRequests.delete(key);
    } else {
      this.cache.clear();
      this.etagCache.clear();
      this.pendingRequests.clear();
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): {
    cacheSize: number;
    pendingRequests: number;
    etagCount: number;
  } {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      etagCount: this.etagCache.size,
    };
  }

  /**
   * Persist ETags to AsyncStorage
   */
  async persistEtags(): Promise<void> {
    try {
      const etags = Object.fromEntries(this.etagCache);
      await AsyncStorage.setItem('request_etags', JSON.stringify(etags));
    } catch (error) {
      console.error('Failed to persist ETags:', error);
    }
  }

  /**
   * Load ETags from AsyncStorage
   */
  async loadEtags(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('request_etags');
      if (stored) {
        const etags = JSON.parse(stored);
        this.etagCache = new Map(Object.entries(etags));
      }
    } catch (error) {
      console.error('Failed to load ETags:', error);
    }
  }
}

export const requestManager = new RequestManager();