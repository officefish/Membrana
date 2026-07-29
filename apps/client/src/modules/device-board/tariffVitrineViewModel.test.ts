/**
 * Зубы витрины тарифа (S7 плана интеграции; заседание `tariff-grid`).
 *
 * Сторожат решение владельца: недоступное ПРИТЕМНЯЕТСЯ, а не прячется; купленное
 * без условия зовёт достраивать сеть, а не покупать снова; клиент не выносит
 * решений о правах.
 */
import { describe, expect, it } from 'vitest';

import {
  assertClientIsNotSourceOfTruth,
  toVitrine,
  toVitrineItem,
  upsellCandidates,
  type WireEntitlement,
} from './tariffVitrineViewModel';

const available: WireEntitlement = {
  id: 'instrument.fft_trends',
  titleKey: 'tariff.instrument.fftTrends',
  kind: 'instrument',
  status: 'entitled',
  unmetPreconditions: [],
};

const locked: WireEntitlement = {
  id: 'instrument.mfcc',
  titleKey: 'tariff.instrument.mfcc',
  kind: 'instrument',
  status: 'not_entitled',
  unmetPreconditions: [],
  reason: 'disabled',
};

const awaiting: WireEntitlement = {
  id: 'bearing.position',
  titleKey: 'tariff.bearing.position',
  kind: 'gated',
  status: 'entitled',
  unmetPreconditions: [{ preconditionId: 'minimal_network_ready', code: 'unsatisfied' }],
};

const awaitingUnwired: WireEntitlement = {
  ...awaiting,
  unmetPreconditions: [{ preconditionId: 'minimal_network_ready', code: 'stub_unwired' }],
};

describe('прятать нечего', () => {
  it('недоступное притемняется, а не исчезает', () => {
    const item = toVitrineItem(locked);
    expect(item.tone).toBe('locked');
    expect(item.dimmed).toBe(true);
    expect(item.warning).toBeTruthy();
  });

  it('состояния «скрыто» не существует ни в одной ветке', () => {
    for (const e of [available, locked, awaiting, awaitingUnwired]) {
      const item = toVitrineItem(e);
      expect(['available', 'awaiting_condition', 'locked']).toContain(item.tone);
      expect(item).not.toHaveProperty('hidden');
    }
  });

  it('витрина сохраняет порядок сервера и не теряет строк', () => {
    const items = toVitrine([available, locked, awaiting]);
    expect(items.map((i) => i.id)).toEqual([available.id, locked.id, awaiting.id]);
  });
});

describe('три состояния показа', () => {
  it('доступное не притемняется и никуда не зовёт', () => {
    const item = toVitrineItem(available);
    expect(item.tone).toBe('available');
    expect(item.dimmed).toBe(false);
    expect(item.cta).toBe('none');
    expect(item.warning).toBeUndefined();
  });

  it('недоступное зовёт на старший тариф', () => {
    expect(toVitrineItem(locked).cta).toBe('upgrade_tariff');
  });

  it('купленное без сети зовёт СТРОИТЬ СЕТЬ, а не покупать снова', () => {
    const item = toVitrineItem(awaiting);
    expect(item.tone).toBe('awaiting_condition');
    expect(item.cta).toBe('build_network');
    expect(item.warning).toMatch(/сеть/);
    // «на вашем тарифе» — успокоение, а не призыв: покупать повторно не зовём.
    expect(item.warning).not.toMatch(/старшем тарифе/);
  });

  it('неподключённая проверка честна: не зовёт делать невозможное', () => {
    const item = toVitrineItem(awaitingUnwired);
    expect(item.tone).toBe('awaiting_condition');
    expect(item.cta).toBe('none');
    expect(item.warning).toMatch(/не подключена/);
  });
});

describe('доступность для чтения с экрана', () => {
  it('у каждого притемнённого есть причина словами', () => {
    for (const e of [locked, awaiting, awaitingUnwired]) {
      const item = toVitrineItem(e);
      expect(item.a11yReason).toBeTruthy();
      expect(item.a11yReason!.length).toBeGreaterThan(10);
    }
  });

  it('у доступного причины нет — объяснять нечего', () => {
    expect(toVitrineItem(available).a11yReason).toBeUndefined();
  });
});

describe('витрина как витрина', () => {
  it('показывает, что даёт старший тариф', () => {
    const items = toVitrine([available, locked, awaiting]);
    expect(upsellCandidates(items).map((i) => i.id)).toEqual([locked.id]);
  });

  it('пустой список означает «всё доступно», а не «нечего показать»', () => {
    expect(upsellCandidates(toVitrine([available]))).toEqual([]);
  });
});

describe('клиент не источник истины', () => {
  it('попытка вынести решение о праве падает громко', () => {
    expect(() => assertClientIsNotSourceOfTruth('palette.canUse')).toThrow(/client_not_source_of_truth/);
    expect(() => assertClientIsNotSourceOfTruth('x')).toThrow(/на сервере и на входе в борд/);
  });
});
