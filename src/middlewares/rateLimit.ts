import { Request, Response, NextFunction } from "express";
import { RateLimitConfig, RateLimitData, RateLimitResult } from "rateLimit";

function createBurstRateLimiter(config: RateLimitConfig) {
  const requests = new Map<string, RateLimitData>();

  const cleanup = () => {
    const now = Date.now();

    for (const [ip, data] of requests.entries()) {
      data.timestamps = data.timestamps.filter(
        (ts) => now - ts < config.timeWindow
      );

      data.burstTimestamps = data.burstTimestamps.filter(
        (ts) => now - ts < config.burstWindow
      );

      if (data.timestamps.length === 0 && data.burstTimestamps.length === 0) {
        requests.delete(ip);
      }
    }
  };

  setInterval(cleanup, 60_000);

  const isAllowed = (ip: string): RateLimitResult => {
    const now = Date.now();
    const userData = requests.get(ip) ?? {
      timestamps: [],
      burstTimestamps: [],
    };

    userData.timestamps = userData.timestamps.filter(
      (ts) => now - ts < config.timeWindow
    );

    userData.burstTimestamps = userData.burstTimestamps.filter(
      (ts) => now - ts < config.burstWindow
    );
    if (userData.burstTimestamps.length >= config.burstCapacity) {
      const oldest = Math.min(...userData.burstTimestamps);
      const retryAfter = Math.ceil((oldest + config.burstWindow - now) / 1000);

      return {
        allowed: false,
        retryAfter,
        limit: config.maxRequests,
        remaining: 0,
        reset: now + retryAfter * 1000,
      };
    }

    if (userData.timestamps.length >= config.maxRequests) {
      const oldest = Math.min(...userData.timestamps);
      const retryAfter = Math.ceil((oldest + config.timeWindow - now) / 1000);

      return {
        allowed: false,
        retryAfter,
        limit: config.maxRequests,
        remaining: 0,
        reset: now + retryAfter * 1000,
      };
    }

    userData.timestamps.push(now);
    userData.burstTimestamps.push(now);
    requests.set(ip, userData);

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - userData.timestamps.length),
      reset: now + config.timeWindow,
      retryAfter: 0,
    };
  };

  return { isAllowed };
}

const rateLimiter = createBurstRateLimiter({
  maxRequests: 10,
  timeWindow: 60_000,
  burstCapacity: 5,
  burstWindow: 10_000,
});

export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown";

  const result = rateLimiter.isAllowed(ip);

  res.setHeader("X-RateLimit-Limit", result.limit.toString());
  res.setHeader("X-RateLimit-Remaining", result.remaining.toString());
  res.setHeader("X-RateLimit-Reset", result.reset.toString());

  if (!result.allowed) {
    res.setHeader("Retry-After", result.retryAfter?.toString() || "60");

    return res.status(429).json({
      success: false,
      error: "Rate limit exceeded",
      message: `Too many requests. Try again in ${result.retryAfter} seconds.`,
      retryAfter: result.retryAfter,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    });
  }

  next();
}
