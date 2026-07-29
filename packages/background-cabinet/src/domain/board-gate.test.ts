/**
 * Зубы гейтов борда (S6 плана интеграции; заседание `tariff-grid`).
 *
 * Сторожат решение владельца: сценарий со старшими узлами не загружается И НЕ
 * КЛОНИРУЕТСЯ; показ при этом остаётся — прятать нечего. Проверка по ЖИВОЙ матрице.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { decideBoardAccess, denyHeadline, isVisibleInCatalog, type BoardAction } from './board-gate';
import type { TariffGridDocument } from './tariff-grid';
import { MINIMAL_NETWORK_READY } from './tariff-resolve';

const LIVE: TariffGridDocument = JSON.parse(
  readFileSync(new URL('../../../../docs/tariffs/tariff-grid.json', import.meta.url), 'utf8'),
);

const netReady = { facts: { [MINIMAL_NETWORK_READY]: true } };
const ALL_DOORS: BoardAction[] = ['load', 'clone', 'start'];

describe('сценарий со старшими узлами', () => {
  it.each(ALL_DOORS)('«%s» на «Датчике» отклоняется — все три двери закрыты', (action) => {
    const d = decideBoardAccess(LIVE, 'free-v1', { action, requiredEntitlements: ['instrument.mfcc'] });
    expect(d.allowed).toBe(false);
    expect(d.toothId).toBe('senior_node_on_load_clone');
  });

  it('клонирование закрыто наравне с загрузкой — иначе готовая дыра обхода', () => {
    const load = decideBoardAccess(LIVE, 'free-v1', { action: 'load', requiredEntitlements: ['instrument.mfcc'] });
    const clone = decideBoardAccess(LIVE, 'free-v1', { action: 'clone', requiredEntitlements: ['instrument.mfcc'] });
    expect(load.allowed).toBe(false);
    expect(clone.allowed).toBe(false);
    expect(clone.denied).toEqual(load.denied);
  });

  it('на «Блокпосте» тот же сценарий проходит', () => {
    const d = decideBoardAccess(LIVE, 'checkpoint-v1', { action: 'load', requiredEntitlements: ['instrument.mfcc'] });
    expect(d.allowed).toBe(true);
    expect(d.denied).toEqual([]);
  });

  it('отказ называет виновное право поимённо, а не «нельзя»', () => {
    const d = decideBoardAccess(LIVE, 'free-v1', {
      action: 'load',
      requiredEntitlements: ['instrument.fft_trends', 'instrument.mfcc', 'produce.own'],
    });
    expect(d.denied.map((x) => x.entitlementId)).toEqual(['instrument.mfcc', 'produce.own']);
    expect(d.denied.every((x) => x.kind === 'not_entitled')).toBe(true);
  });
});

describe('право есть, условие не выполнено', () => {
  it('пеленг без построенной сети НЕ пускает сценарий — иначе детекция невалидна', () => {
    const d = decideBoardAccess(LIVE, 'checkpoint-v1', {
      action: 'start',
      requiredEntitlements: ['bearing.position'],
    });
    expect(d.allowed).toBe(false);
    expect(d.denied[0].kind).toBe('precondition_unmet');
  });

  it('та же заявка при построенной сети проходит', () => {
    const d = decideBoardAccess(
      LIVE,
      'checkpoint-v1',
      { action: 'start', requiredEntitlements: ['bearing.position'] },
      netReady,
    );
    expect(d.allowed).toBe(true);
  });

  it('причины различаются: «нет права» и «нет сети» — разные тексты витрине', () => {
    const missing = decideBoardAccess(LIVE, 'free-v1', { action: 'load', requiredEntitlements: ['instrument.mfcc'] });
    const unmet = decideBoardAccess(LIVE, 'checkpoint-v1', {
      action: 'load',
      requiredEntitlements: ['bearing.position'],
    });
    expect(denyHeadline(missing)).toMatch(/старшего тарифа/);
    expect(denyHeadline(unmet)).toMatch(/сеть/);
    expect(denyHeadline(missing)).not.toEqual(denyHeadline(unmet));
  });

  it('смешанный случай называет обе беды сразу', () => {
    const d = decideBoardAccess(LIVE, 'checkpoint-v1', {
      action: 'load',
      requiredEntitlements: ['bearing.position', 'instrument.telepathy'],
    });
    expect(denyHeadline(d)).toMatch(/и часть из них ждёт/);
  });
});

describe('показ не равен разрешению', () => {
  it('сценарий, который не загрузится, остаётся видимым — прятать нечего', () => {
    expect(isVisibleInCatalog()).toBe(true);
  });

  it('разрешённая заявка заголовка отказа не имеет', () => {
    const d = decideBoardAccess(LIVE, 'checkpoint-v1', { action: 'load', requiredEntitlements: [] });
    expect(d.allowed).toBe(true);
    expect(denyHeadline(d)).toBeUndefined();
  });
});

describe('fail-closed', () => {
  it('неизвестное право закрывает дверь, а не открывает', () => {
    const d = decideBoardAccess(LIVE, 'checkpoint-v1', {
      action: 'load',
      requiredEntitlements: ['instrument.telepathy'],
    });
    expect(d.allowed).toBe(false);
    expect(d.denied[0].kind).toBe('not_entitled');
  });

  it('неизвестный тариф закрывает дверь', () => {
    const d = decideBoardAccess(LIVE, 'premium-v99', { action: 'load', requiredEntitlements: ['nodes.max'] });
    expect(d.allowed).toBe(false);
  });

  it('сценарий без требований проходит — гейт не выдумывает препятствий', () => {
    const d = decideBoardAccess(LIVE, 'free-v1', { action: 'load', requiredEntitlements: [] });
    expect(d.allowed).toBe(true);
  });
});
