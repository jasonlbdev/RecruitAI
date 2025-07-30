interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 100;

  set(key: string, data: any, ttl: number = 300000): void { // 5 minutes default
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const cache = new SimpleCache();

// Cache keys
export const CACHE_KEYS = {
  DASHBOARD_METRICS: 'dashboard_metrics',
  CANDIDATES_LIST: 'candidates_list',
  JOBS_LIST: 'jobs_list',
  APPLICATIONS_LIST: 'applications_list',
  ANALYTICS_DATA: 'analytics_data',
  SEARCH_RESULTS: 'search_results'
} as const;

// Cache TTLs (in milliseconds)
export const CACHE_TTL = {
  SHORT: 60000, // 1 minute
  MEDIUM: 300000, // 5 minutes
  LONG: 900000, // 15 minutes
  VERY_LONG: 3600000 // 1 hour
} as const;

// Utility functions
export function getCachedData<T>(key: string): T | null {
  return cache.get(key);
}

export function setCachedData(key: string, data: any, ttl: number = CACHE_TTL.MEDIUM): void {
  cache.set(key, data, ttl);
}

export function invalidateCache(pattern: string): void {
  // Simple pattern matching for cache invalidation
  if (pattern === 'all') {
    cache.clear();
  } else if (pattern.includes('candidates')) {
    cache.delete(CACHE_KEYS.CANDIDATES_LIST);
  } else if (pattern.includes('jobs')) {
    cache.delete(CACHE_KEYS.JOBS_LIST);
  } else if (pattern.includes('applications')) {
    cache.delete(CACHE_KEYS.APPLICATIONS_LIST);
  } else if (pattern.includes('dashboard')) {
    cache.delete(CACHE_KEYS.DASHBOARD_METRICS);
  } else if (pattern.includes('analytics')) {
    cache.delete(CACHE_KEYS.ANALYTICS_DATA);
  }
} 