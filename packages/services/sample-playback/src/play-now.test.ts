/**
 * Зубы глагола «играть сейчас» (#2177). Дефект приёмки 26.08: кнопка ▶ звала только выбор,
 * и звука не было — значит зуб обязан проверять ОБЕ половины, а не факт вызова.
 */
import { describe, expect, it } from 'vitest';

import { playSampleNow } from './play-now';

const target = { id: 'a', title: 'A', collectionId: 'c1' } as const;

describe('playSampleNow', () => {
  it('делает обе половины: синхронизирует виджет И включает звук', async () => {
    const calls: string[] = [];
    const played = await playSampleNow(target, {
      select: (async (t) => { calls.push(`select:${(t as typeof target).id}`); }) as never,
      toggle: (async () => { calls.push('toggle'); }) as never,
      statusOf: () => 'paused',
    });
    expect(played).toBe(true);
    // Порядок несущий: включать до выбора значило бы играть прошлую пробу.
    expect(calls).toEqual(['select:a', 'toggle']);
  });

  it('проба не загрузилась — звук не включается и отказ виден вызывающему', async () => {
    const calls: string[] = [];
    const played = await playSampleNow(target, {
      select: (async () => { calls.push('select'); }) as never,
      toggle: (async () => { calls.push('toggle'); }) as never,
      statusOf: () => 'error',
    });
    expect(played).toBe(false);
    expect(calls).toEqual(['select'], 'жать «играть» поверх ошибки — прятать причину за бездействием');
  });
});
