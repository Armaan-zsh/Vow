import { z } from 'zod';

const requiredInProduction = {
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(10),
  GOOGLE_CLIENT_SECRET: z.string().min(10),
  APPLE_CLIENT_ID: z.string().min(1),
  APPLE_PRIVATE_KEY: z.string().min(1),
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC'),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_PHONE_NUMBER: z.string().regex(/^\+\d{10,15}$/),
  UPSTASH_REDIS_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SENTRY_DSN: z.string().url(),
  POSTHOG_KEY: z.string().min(1),
};

const optionalInTest = {
  NODE_ENV: z.enum(['test', 'development', 'production']).default('test'),
};

const envSchema = z
  .object({
    ...requiredInProduction,
    ...optionalInTest,
  })
  .strict();

export type EnvConfig = z.infer<typeof envSchema>;

export class EnvValidationError extends Error {
  constructor(
    message: string,
    public missingKeys: string[],
    public invalidKeys: string[]
  ) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

export function validateEnv(): EnvConfig {
  const rawEnv = Object.keys(requiredInProduction)
    .concat(Object.keys(optionalInTest))
    .reduce(
      (acc, key) => {
        if (process.env[key] !== undefined) {
          acc[key] = process.env[key];
        }
        return acc;
      },
      {} as Record<string, string>
    );

  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const missingKeys: string[] = [];
    const invalidKeys: string[] = [];

    result.error.errors.forEach((err) => {
      const key = err.path[0] as string;
      if (err.code === 'invalid_type') {
        missingKeys.push(key);
      } else {
        invalidKeys.push(key);
      }
    });

    const messages = result.error.errors.map((err) => {
      const key = err.path[0] as string;
      const value = rawEnv[key];
      const displayValue = value ? `${value.substring(0, 3)}...${value.slice(-3)}` : 'undefined';
      return `${key}: ${err.message} (current: ${displayValue})`;
    });

    throw new EnvValidationError(
      `Environment validation failed:\n${messages.join('\n')}`,
      missingKeys,
      invalidKeys
    );
  }

  return result.data;
}

export const _envSchemaForTests = envSchema;

export const env = process.env.NODE_ENV === 'test' ? (undefined as any) : validateEnv();
