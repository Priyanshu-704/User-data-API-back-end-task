export interface RateLimitConfig {
  maxRequests: number;       
  timeWindow: number;       
  burstCapacity: number;
  burstWindow: number;       
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;    
  remaining: number;        
  limit: number;    
  reset: number;         
}

export interface RateLimitData {
  timestamps: number[];     
  burstTimestamps: number[]; 
}