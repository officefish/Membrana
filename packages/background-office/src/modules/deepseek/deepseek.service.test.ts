import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../config/env.schema';
import { DeepSeekService } from './deepseek.service';

function makeService(env: Partial<AppConfig> = {}) {
  return new DeepSeekService({ DEEPSEEK_API_KEY: 'sk-ds-test', ...env } as AppConfig);
}

function mockFetchOnce(status: number, body: unknown) {
  const fn = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DeepSeekService', () => {
  it('isConfigured: только при непустом DEEPSEEK_API_KEY', () => {
    expect(makeService().isConfigured()).toBe(true);
    expect(makeService({ DEEPSEEK_API_KEY: '  ' }).isConfigured()).toBe(false);
    expect(makeService({ DEEPSEEK_API_KEY: undefined }).isConfigured()).toBe(false);
  });

  it('defaultModel: deepseek-chat по умолчанию, DEEPSEEK_MODEL переопределяет', () => {
    expect(makeService().defaultModel()).toBe('deepseek-chat');
    expect(makeService({ DEEPSEEK_MODEL: 'deepseek-reasoner' }).defaultModel()).toBe('deepseek-reasoner');
  });

  it('chat: парсит OpenAI-совместимый ответ', async () => {
    const fetchFn = mockFetchOnce(200, {
      choices: [{ message: { content: '  нарратив от deepseek  ' } }],
    });
    const text = await makeService().chat('промпт');
    expect(text).toBe('нарратив от deepseek');
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.deepseek.com/chat/completions');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sk-ds-test');
    expect(JSON.parse(init.body as string).model).toBe('deepseek-chat');
  });

  it('chat: без ключа → throw до fetch', async () => {
    const fetchFn = mockFetchOnce(200, {});
    await expect(makeService({ DEEPSEEK_API_KEY: undefined }).chat('x')).rejects.toThrow(
      'DEEPSEEK_API_KEY is not configured',
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('chat: HTTP-ошибка → throw со статусом', async () => {
    mockFetchOnce(402, 'Insufficient Balance');
    await expect(makeService().chat('x')).rejects.toThrow('DeepSeek HTTP 402');
  });

  it('chat: пустой content → throw', async () => {
    mockFetchOnce(200, { choices: [{ message: { content: '' } }] });
    await expect(makeService().chat('x')).rejects.toThrow('DeepSeek returned empty content');
  });
});
