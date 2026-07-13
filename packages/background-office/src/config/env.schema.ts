import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  APP_VERSION: z.string().optional(),
  API_INTERNAL_TOKEN: z.string().min(1, 'API_INTERNAL_TOKEN is required'),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  ANTHROPIC_MODEL: z.string().optional(),
  LINEAR_API_KEY: z.string().min(1, 'LINEAR_API_KEY is required'),
  LINEAR_WEBHOOK_SECRET: z.string().min(1, 'LINEAR_WEBHOOK_SECRET is required'),
  GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required'),
  GITHUB_OWNER: z.string().min(1, 'GITHUB_OWNER is required'),
  GITHUB_REPO: z.string().min(1, 'GITHUB_REPO is required'),
  HTTPS_PROXY: z.string().optional(),
  HTTP_PROXY: z.string().optional(),
  RAG_REPO_ROOT: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  /** Night Hunt: optional scheduled proxy jobs → GitHub PR */
  NIGHT_HUNT_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  NIGHT_HUNT_BASE_BRANCH: z.string().optional(),
  /** Telegram ally reports (#428): дайджесты ритуалов в приватную группу союзников */
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_ALLY_CHAT_ID: z.string().optional(),
  /** Night Triage: детерминированный триаж реестра → draft PR (#380) */
  NIGHT_TRIAGE_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  NIGHT_TRIAGE_BASE_BRANCH: z.string().optional(),
  NIGHT_TRIAGE_STALE_DAYS: z.string().optional(),
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
