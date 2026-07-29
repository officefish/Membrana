/**
 * Зубы тарифной сетки (S1 плана интеграции; заседание `tariff-grid`, 29.07).
 *
 * Проверяются ДВА уровня: правила на выдуманных случаях (что зуб кусается) и
 * ЖИВОЙ документ `docs/tariffs/tariff-grid.json` (что кусаться не на чем).
 * Второе важнее первого: зуб, зелёный только на фикстурах, — мёртвый провод.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { gridFindings, KINDS, mibToBytes, scalarsCrossFindings } from './lib/tariff-grid-check.mjs';

const GRID = JSON.parse(readFileSync(new URL('../docs/tariffs/tariff-grid.json', import.meta.url), 'utf8'));
const SCALARS = JSON.parse(readFileSync(new URL('../docs/tariffs/tariff-scalars.json', import.meta.url), 'utf8'));

// ─── живой документ ─────────────────────────────────────────────────────────────

test('живая сетка честна: полнота, реестр, роды, числа', () => {
  assert.deepEqual(gridFindings(GRID), []);
  assert.deepEqual(scalarsCrossFindings(GRID, SCALARS), []);
});

test('живая сетка несёт три тарифа владельца и все пять родов права', () => {
  assert.deepEqual(GRID.rows.map((r) => r.productName), ['Датчик', 'Блокпост', 'Наблюдательный пункт']);
  const kinds = new Set(GRID.registry.map((d) => d.kind));
  assert.deepEqual([...kinds].sort(), [...KINDS].sort());
});

test('решения владельца стоят в ячейках: устройства 1/4/9, MFCC только со старших', () => {
  const nodes = GRID.rows.map((r) => r.cells['nodes.max'].limit);
  assert.deepEqual(nodes, [1, 4, 9]);
  const mfcc = GRID.rows.map((r) => r.cells['instrument.mfcc'].enabled);
  assert.deepEqual(mfcc, [false, true, true], 'MFCC закрыт на «Датчике», открыт на старших');
});

test('пеленг у всех тарифов несёт условие — право без условия было бы обманом', () => {
  for (const row of GRID.rows) {
    assert.equal(row.cells['bearing.position'].preconditionId, 'minimal_network_ready', row.sku);
  }
  assert.equal(GRID.rows[0].cells['bearing.position'].enabled, false, '«Датчику» пеленг не положен');
});

test('право производить своё закрыто на «Датчике» и открыто со «Блокпоста»', () => {
  assert.equal(GRID.rows[0].cells['produce.own'].enabled, false);
  assert.equal(GRID.rows[1].cells['produce.own'].enabled, true);
  assert.ok(GRID.rows[1].cells['produce.own'].scope.includes('scenario_on_own'));
});

test('каждое предварительное значение названо адресом — молчаливых догадок нет', () => {
  const keys = Object.keys(GRID['//provisional'] ?? {}).filter((k) => k !== '//');
  assert.ok(keys.length > 0, 'то, что владелец не называл, обязано быть помечено');
  for (const key of keys) {
    assert.ok(String(GRID['//provisional'][key]).trim().length > 10, `${key}: причина не названа`);
  }
});

// ─── зуб кусается ───────────────────────────────────────────────────────────────

test('пропущенная ячейка ловится matrix_complete с адресом', () => {
  const broken = structuredClone(GRID);
  delete broken.rows[0].cells['instrument.mfcc'];
  const f = gridFindings(broken);
  assert.equal(f.length, 1);
  assert.equal(f[0].toothId, 'matrix_complete');
  assert.equal(f[0].where, 'free-v1.instrument.mfcc');
});

test('ячейка чужого рода ловится kind_mismatch и называет оба рода', () => {
  const broken = structuredClone(GRID);
  broken.rows[0].cells['nodes.max'] = { kind: 'instrument', enabled: true };
  const f = gridFindings(broken).filter((x) => x.toothId === 'kind_mismatch');
  assert.equal(f.length, 1);
  assert.match(f[0].reason, /instrument.*quota|quota.*instrument/u);
});

test('ячейка вне реестра ловится unknown_entitlement_id — заметки в клетках запрещены', () => {
  const broken = structuredClone(GRID);
  broken.rows[0].cells['storage.cold_note'] = 'пояснение не место в ячейке';
  const f = gridFindings(broken).filter((x) => x.toothId === 'unknown_entitlement_id');
  assert.equal(f.length, 1);
  assert.equal(f[0].where, 'free-v1.storage.cold_note');
});

test('возможность без preconditionId ловится: условие негде взять', () => {
  const broken = structuredClone(GRID);
  broken.rows[1].cells['bearing.position'] = { kind: 'gated', enabled: true };
  const f = gridFindings(broken).filter((x) => /preconditionId/u.test(x.reason));
  assert.equal(f.length, 1);
});

test('расхождение сетки с декларацией S0 ловится scalars_drift', () => {
  const broken = structuredClone(GRID);
  broken.rows[0].cells['storage.hot'] = { kind: 'quota', limit: 1024 * 1024 * 1024, unit: 'bytes' };
  const f = scalarsCrossFindings(broken, SCALARS);
  assert.equal(f.length, 1);
  assert.equal(f[0].toothId, 'scalars_drift');
  assert.match(f[0].reason, /разъехались/u);
});

test('предварительные значения из сверки исключены — их владелец не называл', () => {
  const broken = structuredClone(GRID);
  broken.rows[2].cells['storage.hot'] = { kind: 'quota', limit: 42, unit: 'bytes' };
  assert.deepEqual(scalarsCrossFindings(broken, SCALARS), [], 'observatory.storage.hot помечен provisional');
});

test('нечитаемый документ — одна находка, а не падение', () => {
  const f = gridFindings(null);
  assert.equal(f.length, 1);
  assert.equal(f[0].toothId, 'grid_shape');
});

test('перевод МиБ в байты честен, неизвестное остаётся null', () => {
  assert.equal(mibToBytes(512), 536870912);
  assert.equal(mibToBytes(null), null);
});
