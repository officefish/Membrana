import { z } from 'zod';

const corsOrigins = z
  .string()
  .transform((s) =>
    s
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.string().min(1)));

const mimeList = z
  .string()
  .transform((s) =>
    s
      .split(',')
      .map((m) => m.trim().toLowerCase())
      .filter(Boolean),
  )
  .pipe(z.array(z.string().min(1)).min(1));

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3010),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  APP_VERSION: z.string().optional(),
  API_INTERNAL_TOKEN: z.string().min(1, 'API_INTERNAL_TOKEN is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  MEDIA_BLOB_DIR: z.string().min(1).default('./data/blobs'),
  MEDIA_QUOTA_BYTES_PER_DEVICE: z.coerce.number().int().positive().default(1_073_741_824),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(52_428_800),
  MEDIA_ALLOWED_MIME: mimeList.default(
    'audio/wav,audio/wave,audio/mpeg,audio/flac,audio/ogg',
  ),
  SWAGGER_ENABLED: z
    .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true' || v === '1')),
  /** Browser origins for apps/client paired mode (MP3 E2E). Empty = CORS disabled. */
  CLIENT_CORS_ORIGINS: corsOrigins.default('http://localhost:5173,http://localhost:4173'),
});

const envSchemaWithDefaults = envSchema.transform((data) => ({
  ...data,
  SWAGGER_ENABLED: data.SWAGGER_ENABLED ?? data.NODE_ENV !== 'production',
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
