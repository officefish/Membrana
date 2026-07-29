/**
 * Зубы формы тарифной сетки (S1 плана интеграции, заседание `tariff-grid`).
 *
 * Сторожат вердикты M1 и M7: полнота матрицы, закрытость реестра, совпадение
 * рода, читаемость формы. Каждая находка обязана называть зуб — «плохо» без
 * имени зуба запрещено (молчаливый отказ так же вреден, как молчаливый зелёный).
 */
import { describe, expect, it } from 'vitest';

import {
  findRow,
  isTariffGridValid,
  validateTariffGrid,
  valueMatchesKind,
  type TariffGridDocument,
} from './tariff-grid';

const registry = [
  { id: 'nodes.max', kind: 'quota' as const, titleKey: 'tariff.nodes' },
  { id: 'dataset.sounds', kind: 'catalog' as const, titleKey: 'tariff.dataset' },
  { id: 'instrument.mfcc', kind: 'instrument' as const, titleKey: 'tariff.mfcc' },
  { id: 'bearing.position', kind: 'gated' as const, titleKey: 'tariff.bearing' },
  { id: 'produce.own', kind: 'produce' as const, titleKey: 'tariff.produce' },
];

const sensorCells = {
  'nodes.max': { kind: 'quota' as const, limit: 1, unit: 'count' as const },
  'dataset.sounds': { kind: 'catalog' as const, catalogId: 'free-v1-catalog' },
  'instrument.mfcc': { kind: 'instrument' as const, enabled: false },
  'bearing.position': { kind: 'gated' as const, enabled: false, preconditionId: 'minimal_network_ready' },
  'produce.own': { kind: 'produce' as const, enabled: false },
};

const checkpointCells = {
  ...sensorCells,
  'nodes.max': { kind: 'quota' as const, limit: 4, unit: 'count' as const },
  'instrument.mfcc': { kind: 'instrument' as const, enabled: true },
  'bearing.position': { kind: 'gated' as const, enabled: true, preconditionId: 'minimal_network_ready' },
  'produce.own': { kind: 'produce' as const, enabled: true, scope: ['dataset_index' as const, 'own_detection' as const] },
};

const validDoc: TariffGridDocument = {
  version: 1,
  registry,
  rows: [
    { sku: 'free-v1', productName: 'Датчик', rank: 0, cells: sensorCells },
    { sku: 'checkpoint-v1', productName: 'Блокпост', rank: 1, cells: checkpointCells },
  ],
};

describe('форма тарифной сетки', () => {
  it('полная честная матрица не даёт находок', () => {
    expect(validateTariffGrid(validDoc)).toEqual([]);
    expect(isTariffGridValid(validDoc)).toBe(true);
  });

  it('пять родов права уживаются в одной матрице', () => {
    const kinds = registry.map((d) => d.kind);
    expect(new Set(kinds).size).toBe(5);
    expect(validateTariffGrid(validDoc)).toEqual([]);
  });

  it('пропущенная ячейка ловится зубом matrix_complete с адресом', () => {
    const { 'instrument.mfcc': _dropped, ...withHole } = sensorCells;
    const doc = { ...validDoc, rows: [{ ...validDoc.rows[0], cells: withHole }] };
    const findings = validateTariffGrid(doc as TariffGridDocument);
    expect(findings).toHaveLength(1);
    expect(findings[0].toothId).toBe('matrix_complete');
    expect(findings[0].where).toBe('free-v1.instrument.mfcc');
    expect(findings[0].reason).toMatch(/ячейки нет/);
  });

  it('пустая клетка не считается «пока не решили» — дыра называется по каждому тарифу', () => {
    const doc: TariffGridDocument = { ...validDoc, rows: validDoc.rows.map((r) => ({ ...r, cells: {} })) };
    const findings = validateTariffGrid(doc);
    expect(findings).toHaveLength(registry.length * 2);
    expect(findings.every((f) => f.toothId === 'matrix_complete')).toBe(true);
  });

  it('ячейка чужого рода ловится зубом kind_mismatch и называет оба рода', () => {
    const doc: TariffGridDocument = {
      ...validDoc,
      rows: [
        {
          ...validDoc.rows[0],
          cells: { ...sensorCells, 'nodes.max': { kind: 'instrument', enabled: true } },
        },
      ],
    };
    const findings = validateTariffGrid(doc);
    expect(findings).toHaveLength(1);
    expect(findings[0].toothId).toBe('kind_mismatch');
    expect(findings[0].reason).toContain('instrument');
    expect(findings[0].reason).toContain('quota');
  });

  it('ячейка вне реестра ловится зубом unknown_entitlement_id', () => {
    const doc: TariffGridDocument = {
      ...validDoc,
      rows: [{ ...validDoc.rows[0], cells: { ...sensorCells, 'instrument.telepathy': { kind: 'instrument', enabled: true } } }],
    };
    const findings = validateTariffGrid(doc);
    expect(findings).toHaveLength(1);
    expect(findings[0].toothId).toBe('unknown_entitlement_id');
    expect(findings[0].where).toBe('free-v1.instrument.telepathy');
  });

  it('дубликаты в реестре и в матрице ловятся зубом grid_shape', () => {
    const dupRegistry: TariffGridDocument = {
      ...validDoc,
      registry: [...registry, registry[0]],
      rows: [validDoc.rows[0]],
    };
    expect(validateTariffGrid(dupRegistry).some((f) => f.toothId === 'grid_shape')).toBe(true);

    const dupRow: TariffGridDocument = { ...validDoc, rows: [validDoc.rows[0], validDoc.rows[0]] };
    expect(validateTariffGrid(dupRow).some((f) => f.toothId === 'grid_shape')).toBe(true);
  });

  it('нечитаемый документ отвергается одной находкой, а не падением', () => {
    const findings = validateTariffGrid(undefined as unknown as TariffGridDocument);
    expect(findings).toHaveLength(1);
    expect(findings[0].toothId).toBe('grid_shape');
  });

  it('каждая находка называет зуб — безымянных нет (норма M7)', () => {
    const broken: TariffGridDocument = { ...validDoc, rows: [{ ...validDoc.rows[0], cells: {} }] };
    const findings = validateTariffGrid(broken);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f) => Boolean(f.toothId) && Boolean(f.where) && Boolean(f.reason))).toBe(true);
  });

  it('род ячейки сверяется точно, без «похоже подходит»', () => {
    expect(valueMatchesKind({ kind: 'quota', limit: 1, unit: 'count' }, 'quota')).toBe(true);
    expect(valueMatchesKind({ kind: 'quota', limit: 1, unit: 'count' }, 'instrument')).toBe(false);
    expect(valueMatchesKind(undefined, 'quota')).toBe(false);
  });

  it('строка тарифа ищется по SKU; неизвестный — undefined, решение за вызывающим', () => {
    expect(findRow(validDoc, 'checkpoint-v1')?.productName).toBe('Блокпост');
    expect(findRow(validDoc, 'observatory-v1')).toBeUndefined();
  });
});
