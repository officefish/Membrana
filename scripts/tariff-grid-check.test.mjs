/**
 * Зубы тарифной сетки (S1 плана интеграции; заседание `tariff-grid`, 29.07).
 *
 * Проверяются ДВА уровня: правила на выдуманных случаях (что зуб кусается) и
 * ЖИВОЙ документ `docs/tariffs/tariff-grid.json` (что кусаться не на чем).
 * Второе важнее первого: зуб, зелёный только на фикстурах, — мёртвый провод.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  gridFindings,
  KINDS,
  mibToBytes,
  releaseCrossFindings,
  SCALARS_SUPERSEDED_BY,
  scalarsHeaderFindings,
  seedEpochDriftReport,
} from './lib/tariff-grid-check.mjs';
import { projectGrid, serializeGrid } from './lib/tariff-matrix/reseed.mjs';

const GRID = JSON.parse(readFileSync(new URL('../docs/tariffs/tariff-grid.json', import.meta.url), 'utf8'));
const SCALARS = JSON.parse(readFileSync(new URL('../docs/tariffs/tariff-scalars.json', import.meta.url), 'utf8'));

// ─── живой документ ─────────────────────────────────────────────────────────────

test('живая сетка честна: полнота, реестр, роды, числа', () => {
  assert.deepEqual(gridFindings(GRID), []);
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

test('нечитаемый документ — одна находка, а не падение', () => {
  const f = gridFindings(null);
  assert.equal(f.length, 1);
  assert.equal(f[0].toothId, 'grid_shape');
});

test('перевод МиБ в байты честен, неизвестное остаётся null', () => {
  assert.equal(mibToBytes(512), 536870912);
  assert.equal(mibToBytes(null), null);
});

// ─── сверка с релизом матрицы (спринт tariff-matrix-2331, b4) ──────────────────

const RELEASE_FIXTURE = () => ({
  release: { releaseId: 'tariff-matrix', templateVersion: '0.1.0', pins: { 'tariff-buffer': '1.0.0', 'tariff-nodes': '1.0.0' } },
  granules: new Map([
    [
      'tariff-buffer',
      {
        resource: 'storage.buffer',
        kind: 'quota',
        reseedRule: 'exact-bytes',
        registry: { titleKey: 'tariff.storage.buffer', description: 'буфер' },
        values: {
          'free-v1': { MiB: 512, ratifiedAt: '2026-09-08' },
          'checkpoint-v1': { MiB: 2048, ratifiedAt: '2026-09-08' },
          'observatory-v1': { MiB: 4096, ratifiedAt: null, note: 'не решено заседанием' },
        },
      },
    ],
    [
      'tariff-nodes',
      {
        resource: 'nodes.max',
        kind: 'quota',
        reseedRule: 'exact-count',
        registry: { titleKey: 'tariff.nodes.max', description: 'устройства' },
        values: {
          'free-v1': { count: 1, ratifiedAt: '2026-07-29' },
          'checkpoint-v1': { count: 4, ratifiedAt: '2026-07-29' },
          'observatory-v1': { count: 9, ratifiedAt: '2026-07-29' },
        },
      },
    ],
  ]),
});

test('G↔R: регенерация → зелёный; правка сетки руками → красный release_drift с путём', () => {
  const projection = projectGrid(RELEASE_FIXTURE());
  const regenerated = JSON.parse(serializeGrid(projection));
  assert.deepEqual(releaseCrossFindings(regenerated, projection), []);

  const byHand = structuredClone(regenerated);
  byHand.rows[0].cells['storage.buffer'].limit = 1024 * 1024 * 1024;
  const f = releaseCrossFindings(byHand, projection);
  assert.equal(f.length, 1);
  assert.equal(f[0].toothId, 'release_drift');
  assert.equal(f[0].where, 'rows.free-v1.cells.storage.buffer.limit');
  assert.match(f[0].reason, /1073741824.*536870912/u);
});

test('G↔R: дописанное руками право, чужая шапка и переставленные строки — всё названо адресом', () => {
  const projection = projectGrid(RELEASE_FIXTURE());
  const byHand = JSON.parse(serializeGrid(projection));
  byHand.registry.push({ id: 'instrument.mfcc', kind: 'instrument', titleKey: 'x', description: 'x' });
  byHand['//'] = 'рукописный канон';
  byHand.rows.reverse();
  const where = releaseCrossFindings(byHand, projection).map((x) => x.where);
  assert.ok(where.includes('registry.instrument.mfcc'));
  assert.ok(where.includes('//'));
  assert.ok(where.includes('rows'), 'порядок строк — часть формы производной');
});

test('живая сетка сегодня НЕ равна проекции фикстуры — зуб отличает рукописный канон от производной', () => {
  const f = releaseCrossFindings(GRID, projectGrid(RELEASE_FIXTURE()));
  assert.ok(f.length > 0);
  assert.ok(f.every((x) => x.toothId === 'release_drift'));
});

test('шапка scalars: живой файл объявляет supersede; без ключа — красный scalars_epoch', () => {
  assert.deepEqual(scalarsHeaderFindings(SCALARS), []);
  assert.equal(SCALARS['//supersededBy'], SCALARS_SUPERSEDED_BY);
  assert.match(SCALARS['//'], /эпоха сида|seed-epoch/iu);
  assert.match(SCALARS['//'], /НЕ источник правды/u);

  const broken = structuredClone(SCALARS);
  delete broken['//supersededBy'];
  const f = scalarsHeaderFindings(broken);
  assert.equal(f.length, 1);
  assert.equal(f[0].toothId, 'scalars_epoch');
  const wrong = structuredClone(SCALARS);
  wrong['//supersededBy'] = 'docs/tariffs/tariff-scalars.json';
  assert.equal(scalarsHeaderFindings(wrong).length, 1, 'ссылка на себя — не supersede');
});

test('S↔R: расхождение сида с релизом — список {path,S,R}, не находка; буфер, каталог и null старших в нём', () => {
  const projection = projectGrid(RELEASE_FIXTURE());
  const drift = seedEpochDriftReport(projection, SCALARS);
  const byPath = new Map(drift.map((d) => [d.path, d]));
  assert.deepEqual(byPath.get('free-v1.storage.buffer'), { path: 'free-v1.storage.buffer', S: 1024, R: 512, unit: 'MiB' });
  assert.deepEqual(byPath.get('observatory-v1.storage.buffer'), { path: 'observatory-v1.storage.buffer', S: null, R: 4096, unit: 'MiB' });
  assert.ok(!byPath.has('free-v1.nodes.max'), 'совпавшее не печатается');
  const live = new Map(seedEpochDriftReport(GRID, SCALARS).map((d) => [d.path, d]));
  assert.deepEqual(live.get('checkpoint-v1.dataset.sounds'), {
    path: 'checkpoint-v1.dataset.sounds',
    S: null,
    R: 'checkpoint-v1-catalog',
    unit: 'catalogId',
  });
  for (const d of drift) assert.ok(!('toothId' in d), 'это отчёт, не находка — красить нечем');
});

test('S↔R: живая сетка против живого S0 — список полный и детерминированный', () => {
  const a = seedEpochDriftReport(GRID, SCALARS);
  const b = seedEpochDriftReport(GRID, SCALARS);
  assert.deepEqual(a, b);
  // Предмет живой: после пересева (T1) буфер блокпоста в релизе 2048 МиБ, у сида — null; буфер датчика 1024→512.
  assert.ok(a.some((d) => d.path === 'checkpoint-v1.storage.buffer' && d.S === null && d.R === 2048));
  assert.ok(a.some((d) => d.path === 'free-v1.storage.buffer' && d.S === 1024 && d.R === 512));
});

test('S↔R: тариф сетки, не объявленный в S0, — строка списка, не падение', () => {
  const grid = { rows: [{ sku: 'ghost-v1', productName: 'Призрак', cells: {} }] };
  assert.deepEqual(seedEpochDriftReport(grid, SCALARS), [{ path: 'ghost-v1', S: null, R: 'Призрак', unit: 'tariff' }]);
});


// ─── сам зуб yarn tariff:grid: три кода возврата на фикстуре ────────────────────

const TOOTH = fileURLToPath(new URL('./tariff-grid-validate.mjs', import.meta.url));
const RESEED = fileURLToPath(new URL('./tariff-reseed.mjs', import.meta.url));
const SCALARS_PATH = fileURLToPath(new URL('../docs/tariffs/tariff-scalars.json', import.meta.url));
const spawn = (script, args) => {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
};

function toothFixture(root) {
  const granules = join(root, 'granules');
  const put = (id, resource) => {
    mkdirSync(join(granules, id), { recursive: true });
    writeFileSync(join(granules, id, 'granule.json'), JSON.stringify({ id, version: '1.0.0', kind: 'function' }));
    writeFileSync(join(granules, id, 'resource.json'), JSON.stringify(resource));
  };
  const fx = RELEASE_FIXTURE();
  for (const [id, res] of fx.granules) put(id, res);
  const releasePath = join(root, 'release.json');
  writeFileSync(releasePath, JSON.stringify(fx.release));
  const gridPath = join(root, 'tariff-grid.json');
  return {
    common: ['--release', releasePath, '--granules', granules, '--grid', gridPath, '--scalars', SCALARS_PATH],
    gridPath,
    root,
  };
}

test('yarn tariff:grid на фикстуре: пересев → 0 (S↔R напечатан, не красит); правка руками → 1; релиза нет → 2', () => {
  const root = mkdtempSync(join(tmpdir(), 'tariff-grid-tooth-'));
  try {
    const fx = toothFixture(root);
    assert.equal(spawn(RESEED, fx.common.slice(0, 6)).code, 0);

    const green = spawn(TOOTH, fx.common);
    assert.equal(green.code, 0, green.err);
    assert.match(green.out, /seed-epoch drift \(не красный, пересев — задание В\)/u, 'S↔R — обязательный блок stdout');
    assert.match(green.out, /free-v1\.storage\.buffer: сид S=1024, релиз R=512 \[MiB\]/u, 'буфер 1024→512 в списке');
    assert.match(green.out, /observatory-v1\.storage\.buffer: сид S=null, релиз R=4096/u, 'null старших в списке');
    assert.match(green.out, /сетка совпадает с релизом tariff-matrix@0\.1\.0/u);

    const grid = JSON.parse(readFileSync(fx.gridPath, 'utf8'));
    grid.rows[0].cells['nodes.max'].limit = 2;
    writeFileSync(fx.gridPath, JSON.stringify(grid, null, 2));
    const red = spawn(TOOTH, fx.common);
    assert.equal(red.code, 1, 'правка сетки руками → красный');
    assert.match(red.err, /\[release_drift\] rows\.free-v1\.cells\.nodes\.max\.limit/u);
    assert.match(red.out, /seed-epoch drift/u, 'печать S↔R не зависит от вердикта');

    assert.equal(spawn(RESEED, fx.common.slice(0, 6)).code, 0);
    assert.equal(spawn(TOOTH, fx.common).code, 0, 'регенерация → зелёный');

    const gone = spawn(TOOTH, ['--release', join(root, 'нет.json'), ...fx.common.slice(2)]);
    assert.equal(gone.code, 2, 'релиза нет — не зелёный и не «находка», а инструментальная ошибка');
    assert.match(gone.err, /релиза матрицы нет — пересев не состоялся/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('yarn tariff:grid: шапка scalars без supersede → красный scalars_epoch даже при совпавшей сетке', () => {
  const root = mkdtempSync(join(tmpdir(), 'tariff-grid-tooth-'));
  try {
    const fx = toothFixture(root);
    assert.equal(spawn(RESEED, fx.common.slice(0, 6)).code, 0);
    const stale = structuredClone(SCALARS);
    delete stale['//supersededBy'];
    const stalePath = join(root, 'scalars-s0.json');
    writeFileSync(stalePath, JSON.stringify(stale));
    const r = spawn(TOOTH, [...fx.common.slice(0, 6), '--scalars', stalePath]);
    assert.equal(r.code, 1);
    assert.match(r.err, /\[scalars_epoch\] \/\/supersededBy/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
