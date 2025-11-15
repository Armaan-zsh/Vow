// @ts-nocheck
import { TRPCError } from '@trpc/server';
import { rateLimiter, RATE_LIMITS, getClientIP } from './RateLimiter';
import { RateLimitError } from '../../shared/types/errors';

interface RateLimitContext {
  req: Request;
  user?: { id: string };
}

export function createRateLimitMiddleware(rateLimitConfig: typeof RATE_LIMITS.AUTHENTICATED_USER) {
  return async function rateLimitMiddleware(opts: {
    ctx: RateLimitContext;
    next: () => Promise<any>;
  }) {
    const { ctx } = opts;

    // Determine identifier based on authentication
    const identifier = ctx.user?.id || getClientIP(ctx.req);

    try {
      const result = await rateLimiter.checkLimit(identifier, rateLimitConfig);

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Rate limit exceeded',
          cause: new RateLimitError('Rate limit exceeded', {
            retryAfter,
            limit: rateLimitConfig.maxRequests,
            remaining: result.remaining,
            resetTime: result.resetTime,
          }),
        });
      }

      // Add rate limit headers to context for response
      ctx.rateLimitHeaders = {
        'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
      };

      return opts.next();
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: error.message,
          cause: error,
        });
      }
      throw error;
    }
  };
}

// Pre-configured middleware for different scenarios
export const authenticatedRateLimit = createRateLimitMiddleware(RATE_LIMITS.AUTHENTICATED_USER);
export const unauthenticatedRateLimit = createRateLimitMiddleware(RATE_LIMITS.UNAUTHENTICATED_IP);
export const itemCreationRateLimit = createRateLimitMiddleware(RATE_LIMITS.ITEM_CREATION);
export const phoneOTPRateLimit = createRateLimitMiddleware(RATE_LIMITS.PHONE_OTP);

// Helper to create rate-limited procedures
export function createRateLimitedProcedure(
  baseProcedure: any,
  rateLimitConfig: typeof RATE_LIMITS.AUTHENTICATED_USER
) {
  return baseProcedure.use(createRateLimitMiddleware(rateLimitConfig));
}

// Usage examples for tRPC router:
/*
// In your tRPC router file:
import { createRateLimitedProcedure, RATE_LIMITS } from './rate-limit/tRPCMiddleware';

const rateLimitedProcedure = createRateLimitedProcedure(
  publicProcedure,
  RATE_LIMITS.AUTHENTICATED_USER
);

export const appRouter = router({
  addItem: rateLimitedProcedure
    .input(addItemSchema)
    .mutation(async ({ input, ctx }) => {
      // Your mutation logic here
    }),
    
  sendOTP: createRateLimitedProcedure(publicProcedure, RATE_LIMITS.PHONE_OTP)
    .input(phoneSchema)
    .mutation(async ({ input, ctx }) => {
      // OTP sending logic
    })
});
*/
