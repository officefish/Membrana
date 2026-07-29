/**
 * Зубы чтения тарифной сетки (S2 плана интеграции; заседание `tariff-grid`).
 *
 * Сторожат вердикт M3: три состояния при двух статусах, deny-by-default дважды
 * (нет ячейки → нет права; нет факта → условие невыполнено), честный
 * `stub_unwired` вместо молчаливого «выполнено», payload переживает невыполненное
 * условие. Проверяется в том числе ЖИВАЯ матрица, а не только фикстуры.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { TariffGridDocument } from './tariff-grid';
import {
  buildTariffWireView,
  isEntitledUnmet,
  isFullyGranted,
  isNotEntitled,
  MINIMAL_NETWORK_READY,
  quotaLimit,
  resolveEntitlement,
} from './tariff-resolve';

const LIVE: TariffGridDocument = JSON.parse(
  readFileSync(new URL('../../../../docs/tariffs/tariff-grid.json', import.meta.url), 'utf8'),
);

const netReady = { facts: { [MINIMAL_NETWORK_READY]: true } };
const netNotReady = { facts: { [MINIMAL_NETWORK_READY]: false } };

describe('резолв прав по живой матрице', () => {
  it('«Датчик» не получает MFCC — причина названа, а не проглочена', () => {
    const d = resolveEntitlement(LIVE, 'free-v1', 'instrument.mfcc');
    expect(isNotEntitled(d)).toBe(true);
    expect(d.reason).toBe('disabled');
    expect(d.unmetPreconditions).toEqual([]);
  });

  it('«Блокпост» получает MFCC полностью — делать можно прямо сейчас', () => {
    const d = resolveEntitlement(LIVE, 'checkpoint-v1', 'instrument.mfcc');
    expect(isFullyGranted(d)).toBe(true);
    expect(d.value).toEqual({ kind: 'instrument', enabled: true });
  });

  it('потолок устройств читается числом: 1 / 4 / 9', () => {
    const limits = ['free-v1', 'checkpoint-v1', 'observatory-v1'].map((sku) =>
      quotaLimit(resolveEntitlement(LIVE, sku, 'nodes.max')),
    );
    expect(limits).toEqual([1, 4, 9]);
  });
});

describe('третье состояние: право есть, условие не выполнено', () => {
  it('пеленг «Блокпоста» без фактов — entitled, но с невыполненным условием', () => {
    const d = resolveEntitlement(LIVE, 'checkpoint-v1', 'bearing.position');
    expect(d.status).toBe('entitled');
    expect(isEntitledUnmet(d)).toBe(true);
    expect(isFullyGranted(d)).toBe(false);
    expect(d.unmetPreconditions).toEqual([{ preconditionId: MINIMAL_NETWORK_READY, code: 'stub_unwired' }]);
  });

  it('нет контура фактов — честный stub_unwired, а не молчаливое «выполнено»', () => {
    const d = resolveEntitlement(LIVE, 'checkpoint-v1', 'bearing.position', { facts: {}, unwired: true });
    expect(d.unmetPreconditions[0].code).toBe('stub_unwired');
  });

  it('контур есть, условие честно не выполнено — код unsatisfied, не stub', () => {
    const d = resolveEntitlement(LIVE, 'checkpoint-v1', 'bearing.position', netNotReady);
    expect(d.unmetPreconditions[0].code).toBe('unsatisfied');
  });

  it('сеть построена — право применимо полностью', () => {
    const d = resolveEntitlement(LIVE, 'checkpoint-v1', 'bearing.position', netReady);
    expect(isFullyGranted(d)).toBe(true);
    expect(d.unmetPreconditions).toEqual([]);
  });

  it('payload переживает невыполненное условие — витрине есть что показать', () => {
    const d = resolveEntitlement(LIVE, 'checkpoint-v1', 'bearing.position', netNotReady);
    expect(d.value).toEqual({ kind: 'gated', enabled: true, preconditionId: MINIMAL_NETWORK_READY });
  });

  it('нет права — условий не ждём: у «Датчика» пеленг просто закрыт', () => {
    const d = resolveEntitlement(LIVE, 'free-v1', 'bearing.position', netReady);
    expect(isNotEntitled(d)).toBe(true);
    expect(d.unmetPreconditions).toEqual([]);
  });

  it('три состояния взаимоисключающи — ровно один предикат истинен', () => {
    const cases = [
      resolveEntitlement(LIVE, 'free-v1', 'instrument.mfcc'),
      resolveEntitlement(LIVE, 'checkpoint-v1', 'bearing.position'),
      resolveEntitlement(LIVE, 'checkpoint-v1', 'instrument.mfcc'),
    ];
    for (const d of cases) {
      const flags = [isFullyGranted(d), isEntitledUnmet(d), isNotEntitled(d)];
      expect(flags.filter(Boolean)).toHaveLength(1);
    }
  });
});

describe('deny-by-default', () => {
  it('неизвестный тариф — отказ с причиной no_tariff', () => {
    const d = resolveEntitlement(LIVE, 'premium-v99', 'nodes.max');
    expect(d.reason).toBe('no_tariff');
  });

  it('неизвестное право — отказ с причиной unknown_entitlement_id', () => {
    const d = resolveEntitlement(LIVE, 'free-v1', 'instrument.telepathy');
    expect(d.reason).toBe('unknown_entitlement_id');
  });

  it('ячейка чужого рода — отказ, а не попытка понять', () => {
    const broken = structuredClone(LIVE) as TariffGridDocument & {
      rows: { cells: Record<string, unknown> }[];
    };
    broken.rows[0].cells['nodes.max'] = { kind: 'instrument', enabled: true };
    const d = resolveEntitlement(broken as TariffGridDocument, 'free-v1', 'nodes.max');
    expect(d.reason).toBe('kind_mismatch');
  });

  it('пропавшая ячейка — отказ no_cell, а не «наверное можно»', () => {
    const broken = structuredClone(LIVE);
    delete (broken.rows[0].cells as Record<string, unknown>)['instrument.yamnet'];
    const d = resolveEntitlement(broken, 'free-v1', 'instrument.yamnet');
    expect(d.reason).toBe('no_cell');
  });
});

describe('проекция для клиента', () => {
  it('несёт ВСЕ права реестра, включая закрытые — прятать нечего', () => {
    const view = buildTariffWireView(LIVE, 'free-v1')!;
    expect(view.entitlements).toHaveLength(LIVE.registry.length);
    const mfcc = view.entitlements.find((e) => e.id === 'instrument.mfcc')!;
    expect(mfcc.status).toBe('not_entitled');
    expect(mfcc.titleKey).toBeTruthy();
  });

  it('несёт версию формы — клиент, не понявший версию, обязан отказать, а не гадать', () => {
    const view = buildTariffWireView(LIVE, 'checkpoint-v1')!;
    expect(view.gridVersion).toBe(LIVE.version);
    expect(view.productName).toBe('Блокпост');
  });

  it('передаёт третье состояние наружу без третьего статуса', () => {
    const view = buildTariffWireView(LIVE, 'checkpoint-v1', netNotReady)!;
    const bearing = view.entitlements.find((e) => e.id === 'bearing.position')!;
    expect(bearing.status).toBe('entitled');
    expect(bearing.unmetPreconditions).toHaveLength(1);
  });

  it('неизвестный тариф проекции не даёт — молчаливой пустой витрины не будет', () => {
    expect(buildTariffWireView(LIVE, 'premium-v99')).toBeUndefined();
  });
});
