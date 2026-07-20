import { describe, expect, it, vi } from 'vitest';

import {
  postChatCompletion,
  providerSpec,
  synthesizeDreamProvider,
} from './dreams-providers';

describe('dreams-providers', () => {
  it('providerSpec wires all four dream providers', () => {
    const keys = {
      PERPLEXITY_API_KEY: 'pplx',
      DEEPSEEK_API_KEY: 'ds',
      OPENROUTER_API_KEY: 'or',
    };
    for (const id of ['perplexity', 'deepseek', 'grok', 'gemini'] as const) {
      const spec = providerSpec(id, keys);
      expect(spec).not.toBeNull();
      expect(spec!.key).toBeTruthy();
      expect(spec!.url.startsWith('https://')).toBe(true);
    }
  });

  it('missing key → ok:false with status 401 (failover-friendly)', async () => {
    const r = await synthesizeDreamProvider('perplexity', 'hi', {});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(401);
      expect(r.error).toBe('provider-not-configured');
    }
  });

  it('postChatCompletion maps HTTP 402 balance for classifyOutcome', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: false,
      status: 402,
      text: async () => 'Insufficient Balance',
    }));
    const r = await postChatCompletion({
      url: 'https://example.test/chat',
      apiKey: 'k',
      model: 'm',
      prompt: 'p',
      fetchFn,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(402);
      expect(r.bodyText).toMatch(/Balance/i);
    }
  });

  it('synthesizeDreamProvider: first balance then ok via mock fetch', async () => {
    let calls = 0;
    const fetchFn = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return { ok: false, status: 402, text: async () => 'Insufficient Balance' };
      }
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ choices: [{ message: { content: 'сон про пару' } }] }),
      };
    });
    const keys = { OPENROUTER_API_KEY: 'or-key' };
    const a = await synthesizeDreamProvider('grok', 'prompt', keys, { fetchFn });
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.status).toBe(402);
    const b = await synthesizeDreamProvider('gemini', 'prompt', keys, { fetchFn });
    expect(b.ok).toBe(true);
    if (b.ok) expect(b.text).toContain('сон');
    expect(calls).toBe(2);
  });

  it('all four providers can fail independently (attempts=4 shape)', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: false,
      status: 429,
      text: async () => 'slow down',
    }));
    const keys = {
      PERPLEXITY_API_KEY: 'a',
      DEEPSEEK_API_KEY: 'b',
      OPENROUTER_API_KEY: 'c',
    };
    const results = [];
    for (const id of ['perplexity', 'deepseek', 'grok', 'gemini']) {
      results.push(await synthesizeDreamProvider(id, 'p', keys, { fetchFn }));
    }
    expect(results).toHaveLength(4);
    expect(results.every((r) => r.ok === false && !r.ok && r.status === 429)).toBe(true);
  });
});
