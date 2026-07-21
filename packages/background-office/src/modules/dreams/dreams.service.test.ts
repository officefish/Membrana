import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../config/env.schema';
import { DreamsService } from './dreams.service';

function makeService(opts: {
  deepseekConfigured?: boolean;
  openrouterConfigured?: boolean;
  deepseekChat?: (prompt: string) => Promise<string>;
  openrouterChat?: (prompt: string, max?: number, model?: string) => Promise<string>;
}) {
  const deepseek = {
    isConfigured: () => opts.deepseekConfigured !== false,
    chat: opts.deepseekChat ?? (async () => 'сон deepseek'),
  };
  const openrouter = {
    isConfigured: () => opts.openrouterConfigured !== false,
    chat: opts.openrouterChat ?? (async () => 'сон openrouter'),
  };
  return new DreamsService(
    { DREAMS_ENABLED: true } as AppConfig,
    deepseek as never,
    openrouter as never,
  );
}

const routes = {
  routeDreamProvider: (provider: string) => {
    if (provider === 'deepseek') return { channel: 'deepseek' as const };
    if (provider === 'perplexity') return { channel: 'openrouter' as const, model: 'perplexity/sonar' };
    if (provider === 'grok') return { channel: 'openrouter' as const, model: 'x-ai/grok-4-fast' };
    if (provider === 'gemini') {
      return { channel: 'openrouter' as const, model: 'google/gemini-2.0-flash-001' };
    }
    return null;
  },
  providerUnavailableResult: (provider: string, detail: string) => ({
    ok: false as const,
    status: 503,
    bodyText: `provider ${provider} unavailable: ${detail}`,
    error: detail,
  }),
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DreamsService.synthesizeForProvider', () => {
  it('deepseek: ok при живом канале', async () => {
    const svc = makeService({});
    const r = await svc.synthesizeForProvider('deepseek', { pair: ['a', 'b'] }, routes);
    expect(r.ok).toBe(true);
    expect(r.text).toMatch(/deepseek/);
  });

  it('perplexity/grok/gemini: ходят в openrouter с model', async () => {
    const calls: Array<{ model?: string }> = [];
    const svc = makeService({
      openrouterChat: async (_p, _m, model) => {
        calls.push({ model });
        return `сон ${model}`;
      },
    });
    for (const p of ['perplexity', 'grok', 'gemini'] as const) {
      const r = await svc.synthesizeForProvider(p, { pair: ['t1', 't2'] }, routes);
      expect(r.ok).toBe(true);
    }
    expect(calls.map((c) => c.model)).toEqual([
      'perplexity/sonar',
      'x-ai/grok-4-fast',
      'google/gemini-2.0-flash-001',
    ]);
  });

  it('openrouter balance (402) → ok:false status 402 для failover', async () => {
    const svc = makeService({
      openrouterChat: async () => {
        throw new Error('OpenRouter HTTP 402: Insufficient Balance');
      },
    });
    const r = await svc.synthesizeForProvider('grok', { pair: ['x', 'y'] }, routes);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(402);
  });

  it('без OPENROUTER → 503 unavailable (не silent ok)', async () => {
    const svc = makeService({ openrouterConfigured: false });
    const r = await svc.synthesizeForProvider('gemini', { pair: ['x', 'y'] }, routes);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(503);
    expect(r.error).toMatch(/OPENROUTER/);
  });
});
