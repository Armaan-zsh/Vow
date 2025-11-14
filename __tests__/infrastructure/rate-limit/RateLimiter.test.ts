// @ts-nocheck
import { RateLimiter, RATE_LIMITS } from '../../../src/infrastructure/rate-limit/RateLimiter';

const mockRedis = {
  eval: jest.fn(),
  del: jest.fn()
};

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(() => mockRedis)
}));

describe.skip('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter('redis://localhost:6379');
    jest.clearAllMocks();
  });

  describe('checkLimit', () => {
    it('should allow requests within limit', async () => {
      mockRedis.eval.mockResolvedValue([1, 99, Date.now() + 60000, 1]);

      const result = await rateLimiter.checkLimit('user123', RATE_LIMITS.AUTHENTICATED_USER);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
      expect(result.totalHits).toBe(1);
    });

    it('should deny requests over limit', async () => {
      mockRedis.eval.mockResolvedValue([0, 0, Date.now() + 60000, 100]);

      const result = await rateLimiter.checkLimit('user123', RATE_LIMITS.AUTHENTICATED_USER);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.totalHits).toBe(100);
    });

    it('should use custom key generator', async () => {
      mockRedis.eval.mockResolvedValue([1, 9, Date.now() + 60000, 1]);

      const customOptions = {
        ...RATE_LIMITS.AUTHENTICATED_USER,
        keyGenerator: (id: string) => `custom:${id}`
      };

      await rateLimiter.checkLimit('user123', customOptions);

      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.any(String),
        ['custom:user123'],
        expect.any(Array)
      );
    });
  });

  describe('reset', () => {
    it('should reset rate limit for identifier', async () => {
      await rateLimiter.reset('user123');
      expect(mockRedis.del).toHaveBeenCalledWith('rate_limit:user123');
    });
  });

  describe('sliding window accuracy', () => {
    it('should handle burst traffic correctly', async () => {
      const now = Date.now();
      
      const responses = [
        [1, 99, now + 60000, 1],
        [1, 98, now + 60000, 2],
        [1, 97, now + 60000, 3],
        [0, 0, now + 60000, 100]
      ];

      responses.forEach(response => {
        mockRedis.eval.mockResolvedValueOnce(response);
      });

      for (let i = 0; i < 4; i++) {
        const result = await rateLimiter.checkLimit('user123', RATE_LIMITS.AUTHENTICATED_USER);
        
        if (i < 3) {
          expect(result.allowed).toBe(true);
        } else {
          expect(result.allowed).toBe(false);
        }
      }
    });

    it('should handle window expiration', async () => {
      const now = Date.now();
      const windowMs = 60000;
      
      mockRedis.eval.mockResolvedValueOnce([1, 99, now + windowMs, 1]);
      
      let result = await rateLimiter.checkLimit('user123', RATE_LIMITS.AUTHENTICATED_USER);
      expect(result.allowed).toBe(true);
      
      mockRedis.eval.mockResolvedValueOnce([1, 99, now + windowMs * 2, 1]);
      
      result = await rateLimiter.checkLimit('user123', RATE_LIMITS.AUTHENTICATED_USER);
      expect(result.allowed).toBe(true);
    });
  });

  describe('different rate limit strategies', () => {
    it('should handle authenticated user limits', async () => {
      mockRedis.eval.mockResolvedValue([1, 99, Date.now() + 60000, 1]);

      await rateLimiter.checkLimit('user123', RATE_LIMITS.AUTHENTICATED_USER);

      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.any(String),
        ['rate_limit:user:user123'],
        [60000, 100, expect.any(Number)]
      );
    });

    it('should handle IP-based limits', async () => {
      mockRedis.eval.mockResolvedValue([1, 9, Date.now() + 60000, 1]);

      await rateLimiter.checkLimit('192.168.1.1', RATE_LIMITS.UNAUTHENTICATED_IP);

      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.any(String),
        ['rate_limit:ip:192.168.1.1'],
        [60000, 10, expect.any(Number)]
      );
    });

    it('should handle action-specific limits', async () => {
      mockRedis.eval.mockResolvedValue([1, 9, Date.now() + 60000, 1]);

      await rateLimiter.checkLimit('user123', RATE_LIMITS.ITEM_CREATION);

      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.any(String),
        ['rate_limit:items:user123'],
        [60000, 10, expect.any(Number)]
      );
    });

    it('should handle phone OTP limits', async () => {
      mockRedis.eval.mockResolvedValue([1, 2, Date.now() + 3600000, 1]);

      await rateLimiter.checkLimit('+1234567890', RATE_LIMITS.PHONE_OTP);

      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.any(String),
        ['rate_limit:otp:+1234567890'],
        [3600000, 3, expect.any(Number)]
      );
    });
  });

  describe('Lua script behavior', () => {
    it('should use atomic operations', async () => {
      mockRedis.eval.mockResolvedValue([1, 99, Date.now() + 60000, 1]);

      await rateLimiter.checkLimit('user123', RATE_LIMITS.AUTHENTICATED_USER);

      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining('ZREMRANGEBYSCORE'),
        expect.any(Array),
        expect.any(Array)
      );
    });

    it('should handle concurrent requests safely', async () => {
      const promises = Array(10).fill(null).map(() => {
        mockRedis.eval.mockResolvedValueOnce([1, 90, Date.now() + 60000, 10]);
        return rateLimiter.checkLimit('user123', RATE_LIMITS.AUTHENTICATED_USER);
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(mockRedis.eval).toHaveBeenCalledTimes(10);
    });
  });
});