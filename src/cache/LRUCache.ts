import { CacheEntry, CacheStats, CacheOptions } from "../types/cache";

export type LRUCache<T = any> = {
  getOrSet: (
    key: string,
    fetchFn: () => Promise<T>,
    customTtl?: number
  ) => Promise<T>;
  get: (key: string) => T | null;
  set: (key: string, data: T, customTtl?: number, size?: number) => void;
  delete: (key: string) => boolean;
  clear: () => void;
  getStats: () => CacheStats;
  getKeys: () => string[];
  has: (key: string) => boolean;
  stopCleanup: () => void;
  destroy: () => void;
};

export function createLRUCache<T = any>(
  options: Partial<CacheOptions> = {}
): LRUCache<T> {
  const defaultOptions: CacheOptions = {
    maxSize: 100,
    ttl: 60000,
    cleanupInterval: 10000,
  };

  const config = { ...defaultOptions, ...options };
  let cache = new Map<string, CacheEntry<T>>();
  let accessOrder: string[] = [];
  let pendingFetches = new Map<string, Promise<T>>();
  let cleanupInterval: NodeJS.Timeout | null | undefined = null;

  const stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    totalSizeBytes: 0,
    averageResponseTime: 0,
    evictions: 0,
    staleEntriesCleaned: 0,
  };

  startCleanup();
  function startCleanup(): void {
    cleanupInterval = setInterval(() => {
      cleanupStaleEntries();
    }, config.cleanupInterval);

  }

  function cleanupStaleEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of cache.entries()) {
      if (now > entry.expiresAt) {
        deleteEntry(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      stats.staleEntriesCleaned += cleanedCount;
    }
  }

  function updateAccessOrder(key: string): void {
    removeFromAccessOrder(key);
    accessOrder.unshift(key);
  }

  function removeFromAccessOrder(key: string): void {
    const index = accessOrder.indexOf(key);
    if (index > -1) {
      accessOrder.splice(index, 1);
    }
  }

  function evictLRU(): void {
    if (accessOrder.length === 0) return;

    const lruKey = accessOrder.pop()!;
    const entry = cache.get(lruKey);

    if (entry) {
      stats.totalSizeBytes -= entry.size;
      cache.delete(lruKey);
      stats.evictions++;
      stats.size = cache.size;
    }
  }

  function calculateSize(data: any): number {
    try {
      const jsonString = JSON.stringify(data);
      return Buffer.byteLength(jsonString, "utf8");
    } catch (error) {
      return 1024;
    }
  }

  let totalResponseTime = 0;
  let totalRequests = 0;

  function updateStats(responseTime: number) {
    totalResponseTime += responseTime;
    totalRequests++;
  }

  function deleteEntry(key: string): boolean {
    const entry = cache.get(key);
    if (entry) {
      stats.totalSizeBytes -= entry.size;
      removeFromAccessOrder(key);
      cache.delete(key);
      stats.size = cache.size;
      return true;
    }
    return false;
  }

  async function getOrSet(
    key: string,
    fetchFn: () => Promise<T>,
    customTtl?: number
  ): Promise<T> {
    const startTime = Date.now();

    if (pendingFetches.has(key)) {
      
      return pendingFetches.get(key)!;
    }

    const cachedData = get(key);
    if (cachedData !== null) {
      updateStats(Date.now() - startTime);
      return cachedData;
    }

    const fetchPromise = (async () => {
      try {
      

        const data = await fetchFn();
        const size = calculateSize(data);

        set(key, data, customTtl, size);

        return data;
      } finally {
        pendingFetches.delete(key);
      }
    })();

    pendingFetches.set(key, fetchPromise);

    const result = await fetchPromise;
    updateStats(Date.now() - startTime);
    return result;
  }

  function get(key: string): T | null {
   

    const entry = cache.get(key);

    if (!entry) {
      
      stats.misses++;
     
      return null;
    }

    if (Date.now() > entry.expiresAt) {
     
      deleteEntry(key);
      stats.misses++;
    
      return null;
    }

    updateAccessOrder(key);
    entry.lastAccessed = Date.now();

  
    stats.hits++;
    

    return entry.data;
  }

  function set(key: string, data: T, customTtl?: number, size?: number): void {
  

    const now = Date.now();
    const ttl = customTtl || config.ttl;
    const entrySize = size || calculateSize(data);

    const entry: CacheEntry<T> = {
      data,
      expiresAt: now + ttl,
      lastAccessed: now,
      size: entrySize,
    };

    if (cache.size >= config.maxSize && !cache.has(key)) {
      evictLRU();
    }

    const isUpdate = cache.has(key);

    cache.set(key, entry);
    updateAccessOrder(key);

    stats.size = cache.size;

    if (isUpdate) {
      const oldEntry = cache.get(key);
      if (oldEntry) {
        stats.totalSizeBytes -= oldEntry.size;
      }
      stats.totalSizeBytes += entrySize;
    } else {
      stats.totalSizeBytes += entrySize;
    }

   
  }

  function deleteFn(key: string): boolean {
   

    const result = deleteEntry(key);
   
    return result;
  }

  function clear(): void {
    

    cache.clear();
    accessOrder = [];
    pendingFetches.clear();

    stats.size = 0;
    stats.totalSizeBytes = 0;
    stats.hits = 0;
    stats.misses = 0;
    stats.averageResponseTime = 0;
    stats.evictions = 0;
    stats.staleEntriesCleaned = 0;

   
  }

  function getStats(): CacheStats {
   

    const totalRequests = stats.hits + stats.misses;
    const averageResponseTime =
      totalRequests > 0 ? stats.averageResponseTime / totalRequests : 0;

  
    return {
      hits: stats.hits,
      misses: stats.misses,
      size: stats.size,
      totalSizeBytes: stats.totalSizeBytes,
      averageResponseTime: averageResponseTime,
      evictions: stats.evictions,
      staleEntriesCleaned: stats.staleEntriesCleaned,
    };
  }

  function getKeys(): string[] {
    const keys = Array.from(cache.keys());
  
    return keys;
  }

  function has(key: string): boolean {
    const entry = cache.get(key);
    if (!entry) {
     
      return false;
    }

    if (Date.now() > entry.expiresAt) {
   
      deleteEntry(key);
      return false;
    }

   
    return true;
  }

  function stopCleanup(): void {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
      
    }
  }

  function destroy(): void {
    
    stopCleanup();
    clear();
    pendingFetches.clear();
  }

  return {
    getOrSet,
    get,
    set,
    delete: deleteFn,
    clear,
    getStats,
    getKeys,
    has,
    stopCleanup,
    destroy,
  };
}
