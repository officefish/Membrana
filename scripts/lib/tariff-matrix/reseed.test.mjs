/**
 * Зубы чистого ядра пересева (спринт tariff-matrix-2331, b4).
 *
 * Предмет — проекция proj(R) на фикстуре мини-релиза (форма гранулы b1: паспорт +
 * значения по трём тарифам). Живой релиз в дереве ещё не собран (b3) — живой резонанс
 * с ним доказывает координатор; здесь доказывается, что проекция детерминирована,
 * полна и кусается на кривом входе.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { gridFindings, releaseCrossFindings } from '../tariff-grid-check.mjs';
import {
  granuleEntries,
  projectGrid,
  RESEED_RULES,
  ReseedError,
  serializeGrid,
  TARIFF_ROWS,
} from './reseed.mjs';

const quota = (MiB, ratifiedAt = '2026-09-08', note) => ({ MiB, ratifiedAt, ...(note ? { note } : {}) });
const count = (n, ratifiedAt = '2026-09-08', note) => ({ count: n, ratifiedAt, ...(note ? { note } : {}) });

function fixture() {
  const release = {
    releaseId: 'tariff-matrix',
    version: '0.1.0',
    templateId: 'tariff-matrix',
    templateVersion: '0.1.0',
    pins: {
      'tariff-buffer': '1.0.0',
      'tariff-nodes': '1.0.0',
      'tariff-datasets': '1.0.0',
      'tariff-system-datasets': '1.0.0',
      'tariff-instruments': '1.0.0',
    },
  };
  const passport = (owner = 'владелец') => ({
    version: '1.0.0',
    ratifiedAt: '2026-09-08',
    owner,
    source: 'storm-tariff-single-truth-2026-09-08',
    note: 'T1',
  });
  const granules = new Map([
    [
      'tariff-buffer',
      {
        schema: 'tariff-resource/1',
        id: 'tariff-buffer',
        resource: 'storage.buffer',
        title: 'Буфер записи',
        domain: 'storage',
        kind: 'quota',
        unit: 'MiB',
        reseedRule: 'exact-bytes',
        passport: passport(),
        registry: { titleKey: 'tariff.storage.buffer', description: 'Живой буфер записи' },
        values: { 'free-v1': quota(512), 'checkpoint-v1': quota(2048), 'observatory-v1': quota(4096) },
      },
    ],
    [
      'tariff-nodes',
      {
        schema: 'tariff-resource/1',
        id: 'tariff-nodes',
        resource: 'nodes.max',
        title: 'Устройства',
        domain: 'rights',
        kind: 'quota',
        unit: 'count',
        reseedRule: 'exact-count',
        passport: passport(),
        registry: { titleKey: 'tariff.nodes.max', description: 'Сколько устройств можно держать в мембране' },
        values: { 'free-v1': count(1), 'checkpoint-v1': count(4), 'observatory-v1': count(9) },
      },
    ],
    [
      'tariff-datasets',
      {
        schema: 'tariff-resource/1',
        id: 'tariff-datasets',
        resource: 'dataset.sounds',
        title: 'Наборы звуков',
        domain: 'catalog',
        kind: 'catalog',
        unit: null,
        reseedRule: 'catalog-id',
        passport: passport(),
        registry: { titleKey: 'tariff.dataset.sounds', description: 'Словарь звуков, доступный распознаванию' },
        values: {
          'free-v1': { catalogId: 'free-v1-catalog', ratifiedAt: '2026-09-08' },
          'checkpoint-v1': { catalogId: 'checkpoint-v1-catalog', ratifiedAt: '2026-09-08' },
          'observatory-v1': {
            catalogId: 'checkpoint-v1-catalog',
            ratifiedAt: null,
            stub: {
              since: '2026-09-08',
              reason: 'наблюдательный пункт пока на наборе блокпоста — свой набор словами не назван',
              resolvesBy: 'слово владельца о наборе наблюдательного пункта',
            },
          },
        },
      },
    ],
    [
      'tariff-system-datasets',
      {
        schema: 'tariff-resource/1',
        id: 'tariff-system-datasets',
        resource: 'dataset.system',
        title: 'Системные наборы',
        domain: 'catalog',
        kind: 'catalog',
        unit: null,
        reseedRule: 'matrix-only',
        passport: passport(),
        registry: { titleKey: 'tariff.dataset.system', description: 'Системные наборы вне квоты (T2/T10)' },
        values: {
          'free-v1': { catalogId: 'system', ratifiedAt: '2026-09-08' },
          'checkpoint-v1': { catalogId: 'system', ratifiedAt: '2026-09-08' },
          'observatory-v1': { catalogId: 'system', ratifiedAt: '2026-09-08' },
        },
      },
    ],
    [
      'tariff-instruments',
      {
        schema: 'tariff-resource/1',
        id: 'tariff-instruments',
        title: 'Инструменты и права',
        domain: 'instrument',
        passport: passport(),
        entries: [
          {
            id: 'mfcc',
            resource: 'instrument.mfcc',
            kind: 'instrument',
            reseedRule: 'enabled-flag',
            registry: { titleKey: 'tariff.instrument.mfcc', description: 'Тембральный портрет (MFCC)' },
            values: {
              'free-v1': { enabled: false, ratifiedAt: '2026-07-29' },
              'checkpoint-v1': { enabled: true, ratifiedAt: '2026-07-29' },
              'observatory-v1': { enabled: true, ratifiedAt: '2026-07-29' },
            },
          },
          {
            id: 'bearing',
            resource: 'bearing.position',
            kind: 'gated',
            reseedRule: 'gated-by-precondition',
            registry: { titleKey: 'tariff.bearing.position', description: 'Пеленг при построенной сети' },
            values: {
              'free-v1': { enabled: false, preconditionId: 'minimal_network_ready', ratifiedAt: '2026-07-29' },
              'checkpoint-v1': { enabled: true, preconditionId: 'minimal_network_ready', ratifiedAt: '2026-07-29' },
              'observatory-v1': { enabled: true, preconditionId: 'minimal_network_ready', ratifiedAt: '2026-07-29' },
            },
          },
          {
            id: 'produce',
            resource: 'produce.own',
            kind: 'produce',
            reseedRule: 'produce-scope',
            registry: { titleKey: 'tariff.produce.own', description: 'Право производить своё' },
            values: {
              'free-v1': { enabled: false, ratifiedAt: '2026-07-29' },
              'checkpoint-v1': { enabled: true, scope: ['dataset_index', 'own_detection'], ratifiedAt: '2026-07-29' },
              'observatory-v1': { enabled: true, scope: ['dataset_index', 'own_detection'], ratifiedAt: '2026-07-29' },
            },
          },
        ],
      },
    ],
  ]);
  return { release, granules };
}

// ─── проекция ───────────────────────────────────────────────────────────────────

test('проекция релиза — честная сетка S1: форма зелёная, три тарифа, реестр в порядке pins', () => {
  const grid = projectGrid(fixture());
  assert.deepEqual(gridFindings(grid), []);
  assert.equal(grid.version, 1);
  assert.deepEqual(
    grid.rows.map((r) => [r.sku, r.productName, r.rank]),
    TARIFF_ROWS.map((r) => [r.sku, r.productName, r.rank]),
  );
  assert.deepEqual(
    grid.registry.map((d) => d.id),
    ['storage.buffer', 'nodes.max', 'dataset.sounds', 'instrument.mfcc', 'bearing.position', 'produce.own'],
    'порядок реестра = порядок pins, записи гранулы — по порядку entries',
  );
  assert.deepEqual(Object.keys(grid), ['//', '//source', '//deny-by-default', 'version', 'registry', 'rows', '//provisional']);
});

test('правила пересева рождают ячейки своего рода: МиБ → байты, штуки, каталог, флаги, scope', () => {
  const grid = projectGrid(fixture());
  const cells = (sku) => grid.rows.find((r) => r.sku === sku).cells;
  assert.deepEqual(cells('free-v1')['storage.buffer'], { kind: 'quota', limit: 512 * 1024 * 1024, unit: 'bytes' });
  assert.deepEqual(cells('observatory-v1')['storage.buffer'], { kind: 'quota', limit: 4096 * 1024 * 1024, unit: 'bytes' });
  assert.deepEqual(cells('checkpoint-v1')['nodes.max'], { kind: 'quota', limit: 4, unit: 'count' });
  assert.deepEqual(cells('free-v1')['dataset.sounds'], { kind: 'catalog', catalogId: 'free-v1-catalog' });
  assert.deepEqual(cells('free-v1')['instrument.mfcc'], { kind: 'instrument', enabled: false });
  assert.deepEqual(cells('checkpoint-v1')['bearing.position'], {
    kind: 'gated',
    enabled: true,
    preconditionId: 'minimal_network_ready',
  });
  assert.deepEqual(cells('free-v1')['produce.own'], { kind: 'produce', enabled: false }, 'scope без права не выдумывается');
  assert.deepEqual(cells('checkpoint-v1')['produce.own'].scope, ['dataset_index', 'own_detection']);
  for (const row of grid.rows) {
    assert.deepEqual(Object.keys(row.cells), grid.registry.map((d) => d.id), `${row.sku}: ячейки в порядке реестра`);
  }
});

test('matrix-only не проецируется: системные наборы живут в матрице, в реестре сетки их нет', () => {
  const grid = projectGrid(fixture());
  assert.ok(!grid.registry.some((d) => d.id === 'dataset.system'));
  for (const row of grid.rows) assert.ok(!('dataset.system' in row.cells), row.sku);
  assert.ok(RESEED_RULES.includes('matrix-only'));
});

test('заём набора у наблюдательного пункта: catalogId едет как есть, //provisional несёт stub.reason', () => {
  const grid = projectGrid(fixture());
  assert.equal(grid.rows[2].cells['dataset.sounds'].catalogId, 'checkpoint-v1-catalog');
  assert.deepEqual(Object.keys(grid['//provisional']), ['//', 'observatory-v1.dataset.sounds']);
  assert.match(grid['//provisional']['observatory-v1.dataset.sounds'], /на наборе блокпоста/u);
});

test('ratifiedAt: null без stub — тоже предварительно, причина из note или по умолчанию', () => {
  const fx = fixture();
  fx.granules.get('tariff-buffer').values['checkpoint-v1'] = quota(2048, null, 'не решено заседанием');
  fx.granules.get('tariff-buffer').values['observatory-v1'] = quota(4096, null);
  const grid = projectGrid(fx);
  assert.equal(grid['//provisional']['checkpoint-v1.storage.buffer'], 'не решено заседанием');
  assert.match(grid['//provisional']['observatory-v1.storage.buffer'], /не закреплено/u);
});

test('шапка несёт релиз и pins, дат генерации в теле нет; //source — releaseId, templateVersion, pins', () => {
  const grid = projectGrid(fixture());
  assert.match(grid['//'], /^ПРОИЗВОДНАЯ матрицы тарифов: сгенерировано yarn tariff:reseed из релиза tariff-matrix@0\.1\.0/u);
  assert.match(grid['//'], /tariff-buffer@1\.0\.0/u);
  assert.match(grid['//'], /T16/u);
  assert.deepEqual(grid['//source'], {
    releaseId: 'tariff-matrix',
    templateVersion: '0.1.0',
    pins: fixture().release.pins,
  });
  assert.doesNotMatch(serializeGrid(grid), /generatedAt|\d{4}-\d{2}-\d{2}T\d{2}:/u, 'ни одной отметки времени');
});

test('детерминизм: один вход — одни байты; порядок pins меняет порядок реестра, а не «шум»', () => {
  const a = serializeGrid(projectGrid(fixture()));
  const b = serializeGrid(projectGrid(fixture()));
  assert.equal(a, b);
  assert.ok(a.endsWith('}\n'));
  assert.deepEqual(releaseCrossFindings(JSON.parse(a), projectGrid(fixture())), []);

  const fx = fixture();
  fx.release.pins = Object.fromEntries(Object.entries(fx.release.pins).reverse());
  const reversed = projectGrid(fx);
  assert.equal(reversed.registry[0].id, 'instrument.mfcc', 'первая запись первой по pins гранулы');
  assert.notEqual(serializeGrid(reversed), a);
});

test('порча: правка сетки руками ловится сверкой с проекцией по адресу; регенерация — зелёный', () => {
  const projection = projectGrid(fixture());
  const onDisk = JSON.parse(serializeGrid(projection));
  onDisk.rows[0].cells['storage.buffer'].limit = 1024 * 1024 * 1024;
  onDisk['//provisional']['free-v1.nodes.max'] = 'дописано руками';
  const f = releaseCrossFindings(onDisk, projection);
  assert.deepEqual(
    f.map((x) => x.where),
    ['rows.free-v1.cells.storage.buffer.limit', '//provisional.free-v1.nodes.max'],
  );
  assert.ok(f.every((x) => x.toothId === 'release_drift' && /tariff:reseed/u.test(x.reason)));
  assert.deepEqual(releaseCrossFindings(JSON.parse(serializeGrid(projection)), projection), []);
});

// ─── зуб кусается на кривом входе (инструментальная ошибка, не «находка») ───────

test('гранула из pins не подана → ReseedError с именем гранулы', () => {
  const fx = fixture();
  fx.granules.delete('tariff-nodes');
  assert.throws(() => projectGrid(fx), (e) => e instanceof ReseedError && /tariff-nodes/u.test(e.message));
});

test('правило вне закрытого списка → ReseedError', () => {
  const fx = fixture();
  fx.granules.get('tariff-nodes').reseedRule = 'approximately';
  assert.throws(() => projectGrid(fx), /вне закрытого списка/u);
});

test('нет значения для тарифа → ReseedError: полнота матрицы обязательна', () => {
  const fx = fixture();
  delete fx.granules.get('tariff-buffer').values['observatory-v1'];
  assert.throws(() => projectGrid(fx), /observatory-v1: нет значения/u);
});

test('число не того вида (exact-bytes без MiB; exact-count без count) → ReseedError', () => {
  const fx = fixture();
  fx.granules.get('tariff-buffer').values['free-v1'] = { count: 512, ratifiedAt: '2026-09-08' };
  assert.throws(() => projectGrid(fx), /ждёт число MiB/u);
  const fy = fixture();
  fy.granules.get('tariff-nodes').values['free-v1'] = { MiB: 1, ratifiedAt: '2026-09-08' };
  assert.throws(() => projectGrid(fy), /ждёт число count/u);
});

test('право дважды в двух гранулах → ReseedError: реестр закрыт', () => {
  const fx = fixture();
  fx.release.pins['tariff-buffer-copy'] = '1.0.0';
  fx.granules.set('tariff-buffer-copy', fx.granules.get('tariff-buffer'));
  assert.throws(() => projectGrid(fx), /дважды/u);
});

test('род паспорта не согласован с правилом; паспорт без titleKey → ReseedError', () => {
  const fx = fixture();
  fx.granules.get('tariff-buffer').kind = 'catalog';
  assert.throws(() => projectGrid(fx), /не согласован/u);
  const fy = fixture();
  fy.granules.get('tariff-buffer').registry = { description: 'без ключа' };
  assert.throws(() => projectGrid(fy), /titleKey/u);
});

test('релиз без pins / без releaseId → ReseedError', () => {
  assert.throws(() => projectGrid({ release: { releaseId: 'x', templateVersion: '1' }, granules: new Map() }), /pins/u);
  assert.throws(() => projectGrid({ release: { pins: {} }, granules: new Map() }), /releaseId/u);
});

test('granuleEntries: одиночная гранула — одна запись; entries[] — несколько, с granuleId', () => {
  const fx = fixture();
  assert.equal(granuleEntries('tariff-buffer', fx.granules.get('tariff-buffer')).length, 1);
  const many = granuleEntries('tariff-instruments', fx.granules.get('tariff-instruments'));
  assert.deepEqual(many.map((e) => [e.id, e.granuleId]), [
    ['mfcc', 'tariff-instruments'],
    ['bearing', 'tariff-instruments'],
    ['produce', 'tariff-instruments'],
  ]);
});
