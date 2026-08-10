/**
 * Зуб офисного писателя снов.
 *
 * ЗУБ ЧИТАЕТ НАСТОЯЩИЙ РЕЕСТР, А НЕ СВОЮ КОПИЮ (блок b1 спринта `dreams-models-liveness`,
 * долг `#office-dreams-test-stubs-own-models`). До 10.08 здесь стоял рукописный объект
 * `routes` с двумя id: grok-4-fast от x-ai и gemini-2.0-flash-001 от google (написаны
 * без кавычек нарочно — гард `scripts/dreams-model-ids.test.mjs` ловит именно литерал,
 * и цитата в комментарии считалась бы второй копией). Реестр
 * `scripts/lib/dreams-providers.mjs` сменил оба id 07.08 (`e3c0fb59`) — прежние ответили
 * с прода HTTP 404 «Grok 4 Fast is deprecated» и «No endpoints found». Зуб этого не
 * заметил, потому что реестр не читал: три дня и 91 зелёный прогон на main он числился
 * пройденным, утверждая маршруты на двух мёртвых моделях.
 *
 * Реестр грузится ТЕМ ЖЕ способом, что и прод (`dreams.service.ts` → `lib()`): динамический
 * `import()` по file-URL. Одинаковый способ выбран нарочно — если загрузка разойдётся,
 * разойдётся и предмет проверки, и мы вернёмся к двум носителям правды под другим соусом.
 *
 * Живость самих id этот зуб НЕ проверяет и проверять не может: он о маршрутизации.
 * Мёртвый id в реестре ловит `yarn dreams:probe-models` (ночью) — отдельный предикат,
 * отдельный дом.
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../config/env.schema';
import { DreamsService } from './dreams.service';

/** Корень монорепо от этого файла: dreams → modules → src → background-office → packages. */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');

type Routes = {
  routeDreamProvider: (provider: string) => { channel: 'deepseek' | 'openrouter'; model?: string } | null;
  providerUnavailableResult: (
    provider: string,
    detail: string,
  ) => { ok: false; status: number; bodyText: string; error: string };
  DREAM_PROVIDER_ROUTES: Readonly<Record<string, { channel: 'deepseek' | 'openrouter'; model?: string }>>;
};

const routes: Routes = (await import(
  pathToFileURL(join(repoRoot, 'scripts/lib/dreams-providers.mjs')).href
)) as Routes;

/** Модель живого реестра для провайдера — ожидание берётся оттуда же, откуда и код. */
const modelOf = (provider: string) => routes.routeDreamProvider(provider)?.model;

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

afterEach(() => {
  vi.restoreAllMocks();
});

describe('реестр маршрутов — единственный носитель', () => {
  it('загружен настоящий scripts/lib/dreams-providers.mjs, а не копия', () => {
    expect(typeof routes.routeDreamProvider).toBe('function');
    expect(typeof routes.providerUnavailableResult).toBe('function');
    expect(routes.DREAM_PROVIDER_ROUTES).toBeTruthy();
  });

  it('deepseek — прямой канал без model; остальные — openrouter С model', () => {
    expect(routes.routeDreamProvider('deepseek')).toEqual({ channel: 'deepseek' });
    for (const p of ['perplexity', 'grok', 'gemini'] as const) {
      const route = routes.routeDreamProvider(p);
      expect(route?.channel).toBe('openrouter');
      // Пустой model у openrouter-канала означал бы вызов без модели — прод ушёл бы
      // в дефолт провайдера молча, и подмена не была бы видна ни в логе, ни здесь.
      expect(route?.model, `у ${p} в реестре нет model`).toBeTruthy();
    }
  });

  it('неизвестный провайдер — null, а не догадка', () => {
    expect(routes.routeDreamProvider('нет-такого')).toBeNull();
  });
});

describe('DreamsService.synthesizeForProvider', () => {
  it('deepseek: ok при живом канале', async () => {
    const svc = makeService({});
    const r = await svc.synthesizeForProvider('deepseek', { pair: ['a', 'b'] }, routes);
    expect(r.ok).toBe(true);
    expect(r.text).toMatch(/deepseek/);
  });

  it('perplexity/grok/gemini: ходят в openrouter с model ИЗ РЕЕСТРА', async () => {
    const calls: Array<{ model?: string }> = [];
    const svc = makeService({
      openrouterChat: async (_p, _m, model) => {
        calls.push({ model });
        return `сон ${model}`;
      },
    });
    const providers = ['perplexity', 'grok', 'gemini'] as const;
    for (const p of providers) {
      const r = await svc.synthesizeForProvider(p, { pair: ['t1', 't2'] }, routes);
      expect(r.ok).toBe(true);
    }
    // Ожидание СЧИТАНО из реестра, а не выписано литералами: захардкоженный список
    // ровно этим и был — второй копией, пережившей смену первой.
    expect(calls.map((c) => c.model)).toEqual(providers.map(modelOf));
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
