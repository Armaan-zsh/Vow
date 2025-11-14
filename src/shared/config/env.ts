import { z } from 'zod';

export class EnvValidationError extends Error {
  constructor(message: string, public missingKeys: string[]) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

/**
 * Masks sensitive values for logging, showing only first 3 and last 4 characters
 */
function maskSecret(value: string): string {
  if (value.length <= 7) return '***';
  return `${value.slice(0, 3)}...${value.slice(-4)}`;
}

const envSchema = z.object({
  /** PostgreSQL database connection string */
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  
  /** NextAuth.js secret for JWT signing and encryption */
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  
  /** Google OAuth client ID for authentication */
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  
  /** Google OAuth client secret for authentication */
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  
  /** Apple OAuth client ID for Sign in with Apple */
  APPLE_CLIENT_ID: z.string().min(1, 'APPLE_CLIENT_ID is required'),
  
  /** Apple private key for Sign in with Apple JWT signing */
  APPLE_PRIVATE_KEY: z.string().min(1, 'APPLE_PRIVATE_KEY is required'),
  
  /** Twilio account SID for SMS/phone verification */
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC', 'TWILIO_ACCOUNT_SID must start with AC'),
  
  /** Twilio auth token for API authentication */
  TWILIO_AUTH_TOKEN: z.string().min(1, 'TWILIO_AUTH_TOKEN is required'),
  
  /** Twilio phone number for sending SMS */
  TWILIO_PHONE_NUMBER: z.string().regex(/^\+\d{10,15}$/, 'TWILIO_PHONE_NUMBER must be in E.164 format'),
  
  /** Upstash Redis URL for caching and rate limiting */
  UPSTASH_REDIS_URL: z.string().url('UPSTASH_REDIS_URL must be a valid URL'),
  
  /** Supabase project URL */
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  
  /** Supabase service role key for admin operations */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  
  /** Sentry DSN for error tracking */
  SENTRY_DSN: z.string().url('SENTRY_DSN must be a valid URL'),
  
  /** PostHog API key for analytics */
  POSTHOG_KEY: z.string().min(1, 'POSTHOG_KEY is required'),
}).strict();

export type Env = z.infer<typeof envSchema>;

/**
 * Validates and parses environment variables
 * @throws {EnvValidationError} When validation fails
 */
export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingKeys = error.errors.map(err => err.path.join('.'));
      const maskedErrors = error.errors.map(err => {
        const key = err.path.join('.');
        const value = process.env[key];
        
        // Mask sensitive values in error messages
        if (value && ['SECRET', 'KEY', 'TOKEN', 'DSN'].some(sensitive => key.includes(sensitive))) {
          return `${key}: ${err.message} (current: ${maskSecret(value)})`;
        }
        
        return `${key}: ${err.message}`;
      });
      
      throw new EnvValidationError(
        `Environment validation failed:\n${maskedErrors.join('\n')}`,
        missingKeys
      );
    }
    throw error;
  }
}

// Export validated environment variables (skip during tests)
export const env = process.env.NODE_ENV === 'test' ? undefined as any : validateEnv();