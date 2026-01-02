export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  lastAccessed: number; 
  size: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number; 
  totalSizeBytes: number; 
  averageResponseTime: number;
  evictions: number; 
  staleEntriesCleaned: number;
}

export interface CacheOptions {
  maxSize: number; 
  ttl: number; 
  cleanupInterval: number;
}