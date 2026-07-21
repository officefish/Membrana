import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  APP_VERSION: z.string().optional(),
  API_INTERNAL_TOKEN: z.string().min(1, 'API_INTERNAL_TOKEN is required'),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  ANTHROPIC_MODEL: z.string().optional(),
  /**
   * Deprecated on office: GraphQL to api.linear.app is disabled (K1).
   * Optional so deploys without the key still boot; value is ignored if present.
   */
  LINEAR_API_KEY: z.string().min(1).optional(),
  /** Webhook signature secret (inbound). Not used for office→Linear GraphQL. */
  LINEAR_WEBHOOK_SECRET: z.string().min(1).optional(),
  /** Base URL of media (NL) for snapshot trigger, e.g. https://media… or http://localhost:3010 */
  MEDIA_API_URL: z.string().url().optional(),
  /** Optional override; defaults to API_INTERNAL_TOKEN (same X-Membrana-Token class). */
  MEDIA_API_TOKEN: z.string().min(1).optional(),
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
  /** DeepSeek direct: fallback-канал нарратива ночных агентов (ADR 0005) */
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_MODEL: z.string().optional(),
  /** Panel auth (OP2, эпик #438): stateless-авторизация панели panel.mmbrn.tech */
  PANEL_SESSION_SECRET: z.string().optional(),
  PANEL_INVITE_SECRET: z.string().optional(),
  PANEL_GITHUB_CLIENT_ID: z.string().optional(),
  PANEL_GITHUB_CLIENT_SECRET: z.string().optional(),
  PANEL_GITHUB_ALLOWLIST: z.string().optional(),
  PANEL_PUBLIC_URL: z.string().optional(),
  PANEL_RATE_LIMIT_PER_MIN: z.string().optional(),
  /** PU1 (#463, ADR 0005): путь JSON-store реестра партнёров (docker volume) */
  PANEL_USERS_STORE_PATH: z.string().optional(),
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
  /** Сны v2 (M5): почасовой cron + append-only volume */
  DREAMS_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  /** Корень volume: `<root>/dreams/<day>.jsonl` */
  DREAMS_VOLUME_PATH: z.string().optional(),
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
