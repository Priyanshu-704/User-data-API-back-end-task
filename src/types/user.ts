export interface User {
  id: number;
  name: string;
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CachedUser extends User {
  cached?: boolean;
}

export interface CreateUserDTO {
  name: string;
  email: string;
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