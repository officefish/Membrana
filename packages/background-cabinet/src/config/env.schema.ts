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
  /** DSN картотеки Сентри (кусок E #2122): задан → чекан INC, нет/пуст → суррогат TMP. */
  SENTRY_DSN: z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional()),
  API_INTERNAL_TOKEN: z.string().min(1, 'API_INTERNAL_TOKEN is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(168),
  CABINET_CORS_ORIGINS: corsOrigins.default('http://localhost:5174'),
  /** Origins for apps/client pairing (MP3). Merged with CABINET_CORS_ORIGINS. */
  CLIENT_CORS_ORIGINS: corsOrigins.default('http://localhost:5173,http://localhost:5174'),
  /** background-media base URL for cabinet → media service calls (may be internal Docker host). */
  MEDIA_API_URL: z.string().url().default('http://localhost:3010'),
  /** Public media URL returned to apps/client after pairing (defaults to MEDIA_API_URL). */
  MEDIA_PUBLIC_API_URL: z.string().url().optional(),
  /** Token for cabinet → media service calls (usually same as media API_INTERNAL_TOKEN). */
  MEDIA_API_TOKEN: z.string().min(1).optional(),
  SWAGGER_ENABLED: boolFromEnv.optional(),
  ALLOW_REGISTRATION: boolFromEnv.optional(),
  /** MP7: WebSocket gateway at /v1/nodes/realtime (default enabled). */
  NODE_REALTIME_ENABLED: boolFromEnv.optional(),
  /**
   * Ключ ВХОДЯЩЕЙ служебной двери для office (#2588 b2, ADR-0031 п.3): `/v1/internal/office/*`.
   * Отдельный от API_INTERNAL_TOKEN (тот — исходящий к media): пустой/не задан → дверь отвечает
   * 503 с названной причиной (OfficeTokenGuard); совпадение с API_INTERNAL_TOKEN — отказ конфига.
   */
  CABINET_OFFICE_TOKEN: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().min(1).optional()),
});

/** Экспорт ради зубов конфига (`parseEnv` зовёт process.exit и в тесте непригоден). */
export const envSchemaWithDefaults = envSchema
  .transform((data) => ({
    ...data,
    MEDIA_API_TOKEN: data.MEDIA_API_TOKEN ?? data.API_INTERNAL_TOKEN,
    MEDIA_PUBLIC_API_URL: (data.MEDIA_PUBLIC_API_URL ?? data.MEDIA_API_URL).replace(/\/$/, ''),
    SWAGGER_ENABLED: data.SWAGGER_ENABLED ?? data.NODE_ENV !== 'production',
    ALLOW_REGISTRATION: data.ALLOW_REGISTRATION ?? data.NODE_ENV === 'development',
    NODE_REALTIME_ENABLED: data.NODE_REALTIME_ENABLED ?? true,
  }))
  .refine((data) => data.CABINET_OFFICE_TOKEN === undefined || data.CABINET_OFFICE_TOKEN !== data.API_INTERNAL_TOKEN, {
    path: ['CABINET_OFFICE_TOKEN'],
    message: 'CABINET_OFFICE_TOKEN must differ from API_INTERNAL_TOKEN (one key must not open two directions)',
  });

export type AppConfig = z.infer<typeof envSchemaWithDefaults>;

export function parseEnv(env: NodeJS.ProcessEnv): AppConfig {
  const parsed = envSchemaWithDefaults.safeParse(env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}
