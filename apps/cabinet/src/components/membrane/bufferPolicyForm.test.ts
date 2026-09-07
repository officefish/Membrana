/**
 * Зубы чистой логики витрины (#2308, блок B). Предмет — `bufferPolicyForm.ts` и словарь
 * причин `@/api/membrane`. Порчи: smart выбираем при пустом S → красный; форма собирает
 * smart без S → красный; причина сервера без текста → красный; текст «auto-cleanup» → красный.
 */
import { describe, expect, it } from 'vitest';

import { BUFFER_POLICY_DENY_REASONS, BUFFER_POLICY_MODES } from '@/api/membrane';
import {
  EMPTY_DRAFT,
  MODE_LABEL,
  bufferPolicyDenyText,
  completeParams,
  contextSyncText,
  describePolicy,
  draftFromParams,
  smartCleanupDisabledReason,
  toPolicyInput,
} from './bufferPolicyForm';

const FULL = { thresholdPercent: '90', selection: 'oldest_first' as const, protectLabeled: true };

describe('гейт полноты на витрине — один предикат на показ и на действие', () => {
  it('пустой черновик: smart недоступен, причина называет все три слота; форма не собирает smart', () => {
    expect(smartCleanupDisabledReason(EMPTY_DRAFT)).toBe(
      'Недоступно, пока не заданы: порог, критерий отбора, защита вещдоков',
    );
    expect(toPolicyInput('smart_cleanup', EMPTY_DRAFT)).toBeNull();
  });

  it('полный черновик: доступен, собирается', () => {
    expect(smartCleanupDisabledReason(FULL)).toBeNull();
    expect(toPolicyInput('smart_cleanup', FULL)).toEqual({
      mode: 'smart_cleanup',
      params: { thresholdPercent: 90, selection: 'oldest_first', protectLabeled: true },
    });
  });

  it('защита вещдоков false — это ЯВНЫЙ ответ, набор полон', () => {
    expect(completeParams({ ...FULL, protectLabeled: false })).toEqual({
      thresholdPercent: 90,
      selection: 'oldest_first',
      protectLabeled: false,
    });
  });

  it('порог вне 1..100 или не целый — причина про порог, не «не задан»', () => {
    expect(smartCleanupDisabledReason({ ...FULL, thresholdPercent: '0' })).toBe('Порог должен быть целым числом от 1 до 100');
    expect(smartCleanupDisabledReason({ ...FULL, thresholdPercent: '101' })).toMatch(/от 1 до 100/);
    expect(smartCleanupDisabledReason({ ...FULL, thresholdPercent: '9.5' })).toMatch(/целым/);
    expect(completeParams({ ...FULL, thresholdPercent: '101' })).toBeNull();
  });

  it('stop собирается всегда, параметры не уезжают', () => {
    expect(toPolicyInput('stop', EMPTY_DRAFT)).toEqual({ mode: 'stop' });
    expect(toPolicyInput('stop', FULL)).toEqual({ mode: 'stop' });
  });

  it('черновик из сохранённого и обратно — без потерь', () => {
    const params = { thresholdPercent: 75, selection: 'largest_first' as const, protectLabeled: false };
    expect(completeParams(draftFromParams(params))).toEqual(params);
    expect(draftFromParams(null)).toEqual(EMPTY_DRAFT);
  });
});

describe('словари витрины', () => {
  it('каждая причина сервера имеет текст, тексты попарно различимы, неизвестная называется кодом', () => {
    const texts = BUFFER_POLICY_DENY_REASONS.map(bufferPolicyDenyText);
    for (const t of texts) expect(t).not.toMatch(/Неизвестная причина/);
    expect(new Set(texts).size).toBe(BUFFER_POLICY_DENY_REASONS.length);
    expect(bufferPolicyDenyText('brand_new_reason')).toBe('Неизвестная причина отказа: brand_new_reason');
  });

  it('оба режима подписаны; «локальная автоочистка» как управляющий пункт отсутствует', () => {
    expect(Object.keys(MODE_LABEL).sort()).toEqual([...BUFFER_POLICY_MODES].sort());
    expect(JSON.stringify(MODE_LABEL).toLowerCase()).not.toContain('auto');
  });

  it('подпись политики в строке узла', () => {
    expect(describePolicy({ mode: 'stop', params: null })).toBe('стоп');
    expect(
      describePolicy({ mode: 'smart_cleanup', params: { thresholdPercent: 80, selection: 'oldest_first', protectLabeled: true } }),
    ).toBe('умная очистка · 80% · Сначала самые старые · вещдоки защищены');
  });

  it('счёт разноски: недоехавшие названы, а не спрятаны', () => {
    expect(contextSyncText({ updated: 2, failed: 0 })).toBe('Приборов обновлено: 2');
    expect(contextSyncText({ updated: 1, failed: 1 })).toMatch(/не удалось: 1/);
  });
});
