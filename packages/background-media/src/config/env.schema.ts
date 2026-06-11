import { z } from 'zod';

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
});

export type AppConfig = z.infer<typeof envSchema>;

export function parseEnv(env: NodeJS.ProcessEnv): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}
