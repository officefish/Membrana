import { z } from 'zod';

const corsOrigins = z
  .string()
  .transform((s) =>
    s
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.string().min(1)).min(1));

const boolFromEnv = z
  .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
  .transform((v) => v === 'true' || v === '1');

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3020),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  APP_VERSION: z.string().optional(),
  API_INTERNAL_TOKEN: z.string().min(1, 'API_INTERNAL_TOKEN is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(168),
  CABINET_CORS_ORIGINS: corsOrigins.default('http://localhost:5174'),
  /** Origins for apps/client pairing (MP3). Merged with CABINET_CORS_ORIGINS. */
  CLIENT_CORS_ORIGINS: corsOrigins.default('http://localhost:5173'),
  /** background-media base URL for cabinet → media service calls (may be internal Docker host). */
  MEDIA_API_URL: z.string().url().default('http://localhost:3010'),
  /** Public media URL returned to apps/client after pairing (defaults to MEDIA_API_URL). */
  MEDIA_PUBLIC_API_URL: z.string().url().optional(),
  /** Token for cabinet → media service calls (usually same as media API_INTERNAL_TOKEN). */
  MEDIA_API_TOKEN: z.string().min(1).optional(),
  ALLOW_REGISTRATION: boolFromEnv.optional(),
});

const envSchemaWithDefaults = envSchema.transform((data) => ({
  ...data,
  MEDIA_API_TOKEN: data.MEDIA_API_TOKEN ?? data.API_INTERNAL_TOKEN,
  MEDIA_PUBLIC_API_URL: (data.MEDIA_PUBLIC_API_URL ?? data.MEDIA_API_URL).replace(/\/$/, ''),
  ALLOW_REGISTRATION: data.ALLOW_REGISTRATION ?? data.NODE_ENV === 'development',
}));

export type AppConfig = z.infer<typeof envSchemaWithDefaults>;

export function parseEnv(env: NodeJS.ProcessEnv): AppConfig {
  const parsed = envSchemaWithDefaults.safeParse(env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}
