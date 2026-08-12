import { describe, expect, it } from 'vitest';

import type { AppConfig } from '../../config/env.schema';
import { OpenRouterService } from './openrouter.service';

/**
 * Зубы решения карточки `openrouter-default-model-unverified`: пустой OPENROUTER_MODEL —
 * явный отказ конфигурации, не тихая подстановка захардкоженного id (третий носитель
 * моделей вне реестров, класс инцидента 07.08 «мёртвый id нашёл прод, а не проверка»).
 */
function makeService(env: Partial<AppConfig> = {}) {
  return new OpenRouterService({ OPENROUTER_API_KEY: 'sk-or-test', ...env } as AppConfig);
}

describe('OpenRouterService', () => {
  it('isConfigured: только при непустом OPENROUTER_API_KEY', () => {
    expect(makeService().isConfigured()).toBe(true);
    expect(makeService({ OPENROUTER_API_KEY: '  ' }).isConfigured()).toBe(false);
    expect(makeService({ OPENROUTER_API_KEY: undefined }).isConfigured()).toBe(false);
  });

  it('defaultModel: OPENROUTER_MODEL из конфига возвращается как есть', () => {
    const configured = 'vendor-x/model-y'; // dreams-model-ids:allow тест-фикстура явного конфига, id заведомо вымышленный
    expect(makeService({ OPENROUTER_MODEL: configured }).defaultModel()).toBe(configured);
  });

  it('defaultModel: пустой OPENROUTER_MODEL — явный отказ конфигурации, не тихий дефолт', () => {
    expect(() => makeService().defaultModel()).toThrow('OPENROUTER_MODEL is not configured');
    expect(() => makeService({ OPENROUTER_MODEL: '   ' }).defaultModel()).toThrow(
      'OPENROUTER_MODEL is not configured',
    );
  });

  it('chat: без модели (аргумент и конфиг пусты) — отказ ДО сети', async () => {
    await expect(makeService().chat('промпт')).rejects.toThrow('OPENROUTER_MODEL is not configured');
  });

  it('chat: без ключа — отказ ДО сети, независимо от модели', async () => {
    await expect(
      makeService({ OPENROUTER_API_KEY: undefined, OPENROUTER_MODEL: 'x/y' }).chat('промпт'),
    ).rejects.toThrow('OPENROUTER_API_KEY is not configured');
  });
});
