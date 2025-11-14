import { validateEnv, EnvValidationError } from '../../../src/shared/config/env';

describe('Environment Validation', () => {
  const originalEnv = process.env;
  
  const validEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    NEXTAUTH_SECRET: 'a'.repeat(32),
    GOOGLE_CLIENT_ID: 'google-client-id',
    GOOGLE_CLIENT_SECRET: 'google-client-secret',
    APPLE_CLIENT_ID: 'apple-client-id',
    APPLE_PRIVATE_KEY: 'apple-private-key',
    TWILIO_ACCOUNT_SID: 'AC1234567890123456789012345678901234',
    TWILIO_AUTH_TOKEN: 'twilio-auth-token',
    TWILIO_PHONE_NUMBER: '+1234567890',
    UPSTASH_REDIS_URL: 'https://redis.upstash.io',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'supabase-service-key',
    SENTRY_DSN: 'https://key@sentry.io/project',
    POSTHOG_KEY: 'posthog-key',
    NODE_ENV: 'test' as const
  };

  beforeEach(() => {
    jest.resetModules();
    process.env = { NODE_ENV: 'test' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Valid Configuration', () => {
    it('should validate correct environment variables', () => {
      process.env = validEnv;
      
      expect(() => validateEnv()).not.toThrow();
      const env = validateEnv();
      expect(env.DATABASE_URL).toBe(validEnv.DATABASE_URL);
      expect(env.NEXTAUTH_SECRET).toBe(validEnv.NEXTAUTH_SECRET);
    });
  });

  describe('Invalid Configuration', () => {
    it('should throw EnvValidationError for missing required variables', () => {
      process.env = { NODE_ENV: 'test' };
      
      expect(() => validateEnv()).toThrow(EnvValidationError);
      
      try {
        validateEnv();
      } catch (error) {
        expect(error).toBeInstanceOf(EnvValidationError);
        expect((error as EnvValidationError).missingKeys).toContain('DATABASE_URL');
        expect((error as EnvValidationError).missingKeys).toContain('NEXTAUTH_SECRET');
      }
    });

    it('should reject invalid DATABASE_URL format', () => {
      process.env = { ...validEnv, DATABASE_URL: 'invalid-url', NODE_ENV: 'test' };
      
      expect(() => validateEnv()).toThrow('DATABASE_URL must be a valid URL');
    });

    it('should reject short NEXTAUTH_SECRET', () => {
      process.env = { ...validEnv, NEXTAUTH_SECRET: 'short', NODE_ENV: 'test' };
      
      expect(() => validateEnv()).toThrow('NEXTAUTH_SECRET must be at least 32 characters');
    });

    it('should reject invalid TWILIO_ACCOUNT_SID format', () => {
      process.env = { ...validEnv, TWILIO_ACCOUNT_SID: 'invalid-sid', NODE_ENV: 'test' };
      
      expect(() => validateEnv()).toThrow('TWILIO_ACCOUNT_SID must start with AC');
    });

    it('should reject invalid TWILIO_PHONE_NUMBER format', () => {
      process.env = { ...validEnv, TWILIO_PHONE_NUMBER: '123-456-7890', NODE_ENV: 'test' };
      
      expect(() => validateEnv()).toThrow('TWILIO_PHONE_NUMBER must be in E.164 format');
    });

    it('should reject invalid UPSTASH_REDIS_URL format', () => {
      process.env = { ...validEnv, UPSTASH_REDIS_URL: 'not-a-url', NODE_ENV: 'test' };
      
      expect(() => validateEnv()).toThrow('UPSTASH_REDIS_URL must be a valid URL');
    });

    it('should reject invalid SUPABASE_URL format', () => {
      process.env = { ...validEnv, SUPABASE_URL: 'not-a-url', NODE_ENV: 'test' };
      
      expect(() => validateEnv()).toThrow('SUPABASE_URL must be a valid URL');
    });

    it('should reject invalid SENTRY_DSN format', () => {
      process.env = { ...validEnv, SENTRY_DSN: 'not-a-url', NODE_ENV: 'test' };
      
      expect(() => validateEnv()).toThrow('SENTRY_DSN must be a valid URL');
    });
  });

  describe('Secret Masking', () => {
    it('should mask sensitive values in error messages', () => {
      process.env = { 
        ...validEnv, 
        NEXTAUTH_SECRET: 'short-secret',
        GOOGLE_CLIENT_SECRET: 'invalid-secret',
        NODE_ENV: 'test'
      };
      
      try {
        validateEnv();
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('sho...ret');
        expect(message).toContain('inv...ret');
        expect(message).not.toContain('short-secret');
        expect(message).not.toContain('invalid-secret');
      }
    });

    it('should mask very short secrets', () => {
      process.env = { ...validEnv, NEXTAUTH_SECRET: 'abc', NODE_ENV: 'test' };
      
      try {
        validateEnv();
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('***');
        expect(message).not.toContain('abc');
      }
    });
  });
});