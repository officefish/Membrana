import { z } from 'zod';

/**
 * Local DTOs for LLM procedure channels (EPIC llm-procedure-channels).
 * Structurally aligned with scripts/lib/llm-procedure-schema.json — no @membrana/* imports.
 */

export const procedureIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, 'procedureId must be kebab-case');

export const providerIdSchema = z.enum(['anthropic', 'openrouter', 'ollama']);

export const chainStepSchema = z.object({
  provider: providerIdSchema,
  model: z.string().min(1),
});

export const chainConfigSchema = z.object({
  chain: z.array(chainStepSchema).min(1),
});

export const overlayPutSchema = chainConfigSchema;

export const usageEventSchema = z
  .object({
    eventId: z.string().min(1),
    ts: z.string().min(1),
    procedureId: procedureIdSchema,
    provider: providerIdSchema,
    model: z.string().min(1),
    source: z.enum(['overlay', 'default']),
    tokensIn: z.number().int().nonnegative().nullable().optional(),
    tokensOut: z.number().int().nonnegative().nullable().optional(),
    latencyMs: z.number().int().nonnegative(),
    ok: z.boolean(),
    errorClass: z.enum(['auth', 'rate_limit', 'timeout', 'protocol', 'unknown']).optional(),
    entryMjs: z.string().optional(),
    gitSha: z.string().optional(),
  })
  .strict();

export type ChainConfigDto = z.infer<typeof chainConfigSchema>;
export type UsageEventDto = z.infer<typeof usageEventSchema>;

export const FORBIDDEN_USAGE_KEYS = ['prompt', 'apiKey', 'rawResponse', 'messages', 'content'] as const;

export function usageEventHasForbiddenKeys(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  for (const k of FORBIDDEN_USAGE_KEYS) {
    if (k in (raw as Record<string, unknown>)) return k;
  }
  return null;
}
