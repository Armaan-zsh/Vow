// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter, RATE_LIMITS, getClientIP } from './RateLimiter';
import { RateLimitError } from '../../shared/types/errors';

interface RateLimitMiddlewareOptions {
  rateLimitConfig: typeof RATE_LIMITS.AUTHENTICATED_USER;
  getUserId?: (request: NextRequest) => Promise<string | null>;
  skipPaths?: string[];
}

export function createNextJSRateLimitMiddleware(options: RateLimitMiddlewareOptions) {
  return async function rateLimitMiddleware(request: NextRequest) {
    // Skip rate limiting for certain paths
    if (options.skipPaths?.some(path => request.nextUrl.pathname.startsWith(path))) {
      return NextResponse.next();
    }
    
    try {
      // Determine identifier
      let identifier: string;
      
      if (options.getUserId) {
        const userId = await options.getUserId(request);
        identifier = userId || getClientIP(request);
      } else {
        identifier = getClientIP(request);
      }
      
      const result = await rateLimiter.checkLimit(identifier, options.rateLimitConfig);
      
      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
        
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            retryAfter,
            limit: options.rateLimitConfig.maxRequests,
            remaining: result.remaining
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': options.rateLimitConfig.maxRequests.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
              'Retry-After': retryAfter.toString()
            }
          }
        );
      }
      
      // Continue with request and add rate limit headers
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', options.rateLimitConfig.maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
      
      return response;
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // Continue on error to avoid breaking the app
      return NextResponse.next();
    }
  };
}

// API route wrapper
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  rateLimitConfig: typeof RATE_LIMITS.AUTHENTICATED_USER,
  getUserId?: (req: NextRequest) => Promise<string | null>
) {
  return async function rateLimitedHandler(request: NextRequest) {
    try {
      // Determine identifier
      let identifier: string;
      
      if (getUserId) {
        const userId = await getUserId(request);
        identifier = userId || getClientIP(request);
      } else {
        identifier = getClientIP(request);
      }
      
      const result = await rateLimiter.checkLimit(identifier, rateLimitConfig);
      
      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
        
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            retryAfter,
            limit: rateLimitConfig.maxRequests,
            remaining: result.remaining
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
              'Retry-After': retryAfter.toString()
            }
          }
        );
      }
      
      // Execute the handler
      const response = await handler(request);
      
      // Add rate limit headers to response
      response.headers.set('X-RateLimit-Limit', rateLimitConfig.maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
      
      return response;
    } catch (error) {
      if (error instanceof RateLimitError) {
        return NextResponse.json(
          { error: error.message },
          {
            status: 429,
            headers: {
              'Retry-After': error.context?.retryAfter?.toString() || '60'
            }
          }
        );
      }
      
      // Re-throw other errors
      throw error;
    }
  };
}

// Usage example:
/*
// In your API route file (app/api/items/route.ts):
import { withRateLimit, RATE_LIMITS } from '../../../src/infrastructure/rate-limit/NextJSMiddleware';
import { getServerSession } from 'next-auth';

async function getUserId(request: NextRequest): Promise<string | null> {
  const session = await getServerSession();
  return session?.user?.id || null;
}

async function itemsHandler(request: NextRequest) {
  // Your API logic here
  return NextResponse.json({ success: true });
}

export const POST = withRateLimit(
  itemsHandler,
  RATE_LIMITS.ITEM_CREATION,
  getUserId
);
*/