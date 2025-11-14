// @ts-nocheck
import { Redis } from '@upstash/redis';
import { RateLimitError } from '../../shared/types/errors';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (identifier: string) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
}

export class RateLimiter {
  private redis: Redis;
  private luaScript = `
    local key = KEYS[1]
    local window = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    
    -- Remove expired entries
    redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
    
    -- Count current requests
    local current = redis.call('ZCARD', key)
    
    if current < limit then
      -- Add current request
      redis.call('ZADD', key, now, now .. ':' .. math.random())
      redis.call('EXPIRE', key, math.ceil(window / 1000))
      return {1, limit - current - 1, now + window, current + 1}
    else
      return {0, 0, now + window, current}
    end
  `;

  constructor(redisUrl: string) {
    this.redis = new Redis({ url: redisUrl });
  }

  async checkLimit(
    identifier: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    const key = options.keyGenerator 
      ? options.keyGenerator(identifier)
      : `rate_limit:${identifier}`;
    
    const now = Date.now();
    
    const result = await this.redis.eval(
      this.luaScript,
      [key],
      [options.windowMs, options.maxRequests, now]
    ) as [number, number, number, number];

    return {
      allowed: result[0] === 1,
      remaining: result[1],
      resetTime: result[2],
      totalHits: result[3]
    };
  }

  async reset(identifier: string, keyGenerator?: (id: string) => string): Promise<void> {
    const key = keyGenerator ? keyGenerator(identifier) : `rate_limit:${identifier}`;
    await this.redis.del(key);
  }
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  AUTHENTICATED_USER: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyGenerator: (userId: string) => `rate_limit:user:${userId}`
  },
  
  UNAUTHENTICATED_IP: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: (ip: string) => `rate_limit:ip:${ip}`
  },
  
  ITEM_CREATION: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: (userId: string) => `rate_limit:items:${userId}`
  },
  
  PHONE_OTP: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    keyGenerator: (phone: string) => `rate_limit:otp:${phone}`
  },
  
  EMAIL_MAGIC_LINK: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    keyGenerator: (email: string) => `rate_limit:email:${email}`
  }
};

// Global rate limiter instance
export const rateLimiter = new RateLimiter(process.env.UPSTASH_REDIS_URL!);

// Helper function to get client IP
export function getClientIP(request: Request): string {
  // Check Cloudflare header first
  const cfConnectingIP = request.headers.get('CF-Connecting-IP');
  if (cfConnectingIP) return cfConnectingIP;
  
  // Fallback to other headers
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  
  const xRealIP = request.headers.get('X-Real-IP');
  if (xRealIP) return xRealIP;
  
  return 'unknown';
}

// Express/Next.js middleware
export function createRateLimitMiddleware(options: RateLimitOptions) {
  return async (request: Request, identifier?: string) => {
    const id = identifier || getClientIP(request);
    const result = await rateLimiter.checkLimit(id, options);
    
    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      
      throw new RateLimitError('Rate limit exceeded', {
        retryAfter,
        limit: options.maxRequests,
        remaining: result.remaining,
        resetTime: result.resetTime
      });
    }
    
    return {
      'X-RateLimit-Limit': options.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString()
    };
  };
}

// Specific middleware functions
export const authenticatedUserLimit = createRateLimitMiddleware(RATE_LIMITS.AUTHENTICATED_USER);
export const unauthenticatedIPLimit = createRateLimitMiddleware(RATE_LIMITS.UNAUTHENTICATED_IP);
export const itemCreationLimit = createRateLimitMiddleware(RATE_LIMITS.ITEM_CREATION);
export const phoneOTPLimit = createRateLimitMiddleware(RATE_LIMITS.PHONE_OTP);
export const emailMagicLinkLimit = createRateLimitMiddleware(RATE_LIMITS.EMAIL_MAGIC_LINK);