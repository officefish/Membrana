/**
 * Зуб паспорта гранулы ресурса (спринт tariff-matrix-2331, b1).
 *
 * Два уровня: порчи на фикстурах (что каждый предикат кусается — с адресом и красным) и
 * ЖИВЫЕ файлы `docs/containers/strategic-docs/granules/tariff-*\/resource.json` (что кусаться
 * не на чем). Второе — предмет: число взятых файлов печатается, ноль файлов — красный.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import {
  DOMAINS,
  KINDS,
  KIND_RULES,
  RESEED_RULES,
  SKU_IDS,
  SKUS,
  formatValue,
  mibToBytes,
  parseResource,
  pluralRu,
  renderHeader,
  renderRow,
} from './passport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const GRANULES = path.join(ROOT, 'docs/containers/strategic-docs/granules');
const GRID_PATH = path.join(ROOT, 'docs/tariffs/tariff-grid.json');

const clone = (o) => JSON.parse(JSON.stringify(o));

/** Опорная одиночная форма — буфер по T1. */
const BUFFER = {
  schema: 'tariff-resource/1',
  id: 'buffer',
  resource: 'storage.buffer',
  title: 'Буфер записи',
  domain: 'storage',
  kind: 'quota',
  unit: 'MiB',
  reseedRule: 'exact-bytes',
  passport: { version: '1.0.0', ratifiedAt: '2026-09-08', owner: 'owner', source: 'storm-tariff-single-truth-2026-09-08 T1' },
  registry: { titleKey: 'tariff.storage.buffer', description: 'Живой буфер записи' },
  values: {
    'free-v1': { MiB: 512, ratifiedAt: '2026-09-08' },
    'checkpoint-v1': { MiB: 2048, ratifiedAt: '2026-09-08' },
    'observatory-v1': { MiB: 4096, ratifiedAt: '2026-09-08' },
  },
};

/** Опорная составная форма — две записи инструментов. */
const COMPOSITE = {
  schema: 'tariff-resource/1',
  id: 'instruments',
  title: 'Инструменты',
  domain: 'instrument',
  passport: { version: '1.0.0', ratifiedAt: '2026-07-29', owner: 'owner', source: 'tariff-grid 2026-07-29' },
  entries: [
    {
      id: 'mfcc', resource: 'instrument.mfcc', title: 'Тембральный портрет (MFCC)', kind: 'instrument', reseedRule: 'enabled-flag',
      registry: { titleKey: 'tariff.instrument.mfcc', description: 'MFCC' },
      values: {
        'free-v1': { enabled: false, ratifiedAt: '2026-07-29' },
        'checkpoint-v1': { enabled: true, ratifiedAt: '2026-07-29' },
        'observatory-v1': { enabled: true, ratifiedAt: '2026-07-29' },
      },
    },
    {
      id: 'bearing', resource: 'bearing.position', title: 'Пеленг', kind: 'gated', reseedRule: 'gated-by-precondition',
      registry: { titleKey: 'tariff.bearing.position', description: 'Пеленг' },
      values: {
        'free-v1': { enabled: false, preconditionId: 'minimal_network_ready', ratifiedAt: '2026-07-29' },
        'checkpoint-v1': { enabled: true, preconditionId: 'minimal_network_ready', ratifiedAt: '2026-07-29', label: 'при готовой сети' },
        'observatory-v1': { enabled: true, preconditionId: 'minimal_network_ready', ratifiedAt: '2026-07-29', label: 'при готовой сети' },
      },
    },
  ],
};

const findingsOf = (raw) => {
  const r = parseResource(raw);
  assert.equal(r.ok, false, 'порча обязана краснеть');
  return r.findings;
};
const hasTooth = (findings, toothId, whereFragment) =>
  findings.some((f) => f.toothId === toothId && f.where.includes(whereFragment));

// ─── закрытые списки ────────────────────────────────────────────────────────────

test('закрытые списки: три тарифа по rank, четыре домена, пять родов, семь правил пересева', () => {
  assert.deepEqual(SKU_IDS, ['free-v1', 'checkpoint-v1', 'observatory-v1']);
  assert.deepEqual(SKUS.map((s) => s.rank), [0, 1, 2]);
  assert.deepEqual([...DOMAINS], ['storage', 'rights', 'catalog', 'instrument']);
  assert.deepEqual([...KINDS], ['quota', 'catalog', 'instrument', 'gated', 'produce']);
  assert.deepEqual([...RESEED_RULES], ['exact-bytes', 'exact-count', 'catalog-id', 'enabled-flag', 'gated-by-precondition', 'produce-scope', 'matrix-only']);
  for (const kind of KINDS) {
    assert.ok(KIND_RULES[kind].length > 0, `у рода ${kind} нет правила пересева`);
    for (const rule of KIND_RULES[kind]) assert.ok(RESEED_RULES.includes(rule), `${kind}: правило ${rule} вне списка`);
  }
  assert.equal(mibToBytes(512), 536870912);
  assert.equal(mibToBytes(null), null);
});

test('опорные формы проходят: одиночная и составная', () => {
  const single = parseResource(BUFFER);
  assert.equal(single.ok, true, JSON.stringify(single.findings ?? null));
  assert.equal(single.resource.entries.length, 1);
  assert.equal(single.resource.entries[0].resource, 'storage.buffer');

  const composite = parseResource(COMPOSITE);
  assert.equal(composite.ok, true, JSON.stringify(composite.findings ?? null));
  assert.equal(composite.resource.entries.length, 2);
});

// ─── порчи: каждый предикат кусается ─────────────────────────────────────────

test('порча: чужая схема → красный schema', () => {
  const bad = clone(BUFFER);
  bad.schema = 'tariff-resource/2';
  assert.ok(hasTooth(findingsOf(bad), 'schema', 'schema'));
});

test('порча: лишнее правило пересева → красный closed_list (домен правила закрыт)', () => {
  const bad = clone(BUFFER);
  bad.reseedRule = 'approximately';
  assert.ok(hasTooth(findingsOf(bad), 'closed_list', 'reseedRule'));
});

test('порча: род вне списка → красный closed_list', () => {
  const bad = clone(BUFFER);
  bad.kind = 'wish';
  assert.ok(hasTooth(findingsOf(bad), 'closed_list', 'kind'));
});

test('порча: домен вне списка → красный closed_list', () => {
  const bad = clone(BUFFER);
  bad.domain = 'billing';
  assert.ok(hasTooth(findingsOf(bad), 'closed_list', 'domain'));
});

test('порча: правило из списка, но не того рода (quota × catalog-id) → красный kind_rule', () => {
  const bad = clone(BUFFER);
  bad.reseedRule = 'catalog-id';
  bad.unit = null;
  assert.ok(hasTooth(findingsOf(bad), 'kind_rule', 'reseedRule'));
});

test('порча: четвёртый тариф → красный sku_complete', () => {
  const bad = clone(BUFFER);
  bad.values['enterprise-v1'] = { MiB: 8192, ratifiedAt: null };
  assert.ok(hasTooth(findingsOf(bad), 'sku_complete', 'enterprise-v1'));
});

test('порча: без третьего тарифа → красный sku_complete (матрица полная или её нет)', () => {
  const bad = clone(BUFFER);
  delete bad.values['observatory-v1'];
  assert.ok(hasTooth(findingsOf(bad), 'sku_complete', 'observatory-v1'));
});

test('порча: quota без MiB → красный value_shape', () => {
  const bad = clone(BUFFER);
  delete bad.values['free-v1'].MiB;
  assert.ok(hasTooth(findingsOf(bad), 'value_shape', 'free-v1.MiB'));
});

test('порча: «MB» вместо «MiB» → красный и в единице, и в значении', () => {
  const badUnit = clone(BUFFER);
  badUnit.unit = 'MB';
  assert.ok(hasTooth(findingsOf(badUnit), 'closed_list', 'unit'));

  const badValue = clone(BUFFER);
  delete badValue.values['free-v1'].MiB;
  badValue.values['free-v1'].MB = 512;
  const f = findingsOf(badValue);
  assert.ok(hasTooth(f, 'value_shape', 'free-v1.MB'));
  assert.ok(hasTooth(f, 'value_shape', 'free-v1.MiB'));
});

test('порча: единица не по правилу (exact-bytes × count) → красный kind_rule', () => {
  const bad = clone(BUFFER);
  bad.unit = 'count';
  bad.unitWords = ['штука', 'штуки', 'штук'];
  assert.ok(hasTooth(findingsOf(bad), 'kind_rule', 'unit'));
});

test('порча: ratifiedAt не дата и не null / ключа нет → красный passport_fields', () => {
  const badDate = clone(BUFFER);
  badDate.passport.ratifiedAt = 'вчера';
  assert.ok(hasTooth(findingsOf(badDate), 'passport_fields', 'passport'));

  const missing = clone(BUFFER);
  delete missing.values['checkpoint-v1'].ratifiedAt;
  assert.ok(hasTooth(findingsOf(missing), 'passport_fields', 'checkpoint-v1'));

  const badValue = clone(BUFFER);
  badValue.values['checkpoint-v1'].ratifiedAt = '2026-13-45';
  assert.ok(hasTooth(findingsOf(badValue), 'passport_fields', 'checkpoint-v1'));
});

test('порча: паспорт без владельца / источника / с кривой версией → красный passport_fields', () => {
  const bad = clone(BUFFER);
  delete bad.passport.owner;
  delete bad.passport.source;
  bad.passport.version = '1.0';
  const f = findingsOf(bad);
  assert.ok(hasTooth(f, 'passport_fields', 'owner'));
  assert.ok(hasTooth(f, 'passport_fields', 'source'));
  assert.ok(hasTooth(f, 'passport_fields', 'version'));
});

test('порча: registry без titleKey → красный registry_fields', () => {
  const bad = clone(BUFFER);
  delete bad.registry.titleKey;
  assert.ok(hasTooth(findingsOf(bad), 'registry_fields', 'titleKey'));
});

test('порча: штуки без трёх форм слова → красный entry_fields (render слов не выдумывает)', () => {
  const nodes = clone(BUFFER);
  Object.assign(nodes, { id: 'nodes', resource: 'nodes.max', unit: 'count', reseedRule: 'exact-count' });
  for (const sku of SKU_IDS) nodes.values[sku] = { count: 1, ratifiedAt: '2026-07-29' };
  assert.ok(hasTooth(findingsOf(nodes), 'entry_fields', 'unitWords'));
  nodes.unitWords = ['прибор', 'прибора', 'приборов'];
  assert.equal(parseResource(nodes).ok, true);
});

test('порча: заглушка без слов (нет reason) или закреплённая (ratifiedAt ≠ null) → красный value_shape', () => {
  const ds = clone(BUFFER);
  Object.assign(ds, { id: 'datasets', resource: 'dataset.sounds', domain: 'catalog', kind: 'catalog', unit: null, reseedRule: 'catalog-id' });
  ds.values = {
    'free-v1': { catalogId: 'free-v1-catalog', ratifiedAt: '2026-07-29' },
    'checkpoint-v1': { catalogId: 'checkpoint-v1-catalog', ratifiedAt: '2026-07-29' },
    'observatory-v1': { catalogId: 'checkpoint-v1-catalog', ratifiedAt: null, stub: { since: '2026-09-08', reason: 'на наборе блокпоста', resolvesBy: 'назначение набора владельцем' } },
  };
  assert.equal(parseResource(ds).ok, true, 'честный заём проходит');

  const noReason = clone(ds);
  delete noReason.values['observatory-v1'].stub.reason;
  assert.ok(hasTooth(findingsOf(noReason), 'value_shape', 'observatory-v1.stub'));

  const ratifiedStub = clone(ds);
  ratifiedStub.values['observatory-v1'].ratifiedAt = '2026-09-08';
  assert.ok(hasTooth(findingsOf(ratifiedStub), 'value_shape', 'observatory-v1.ratifiedAt'));
});

test('порча: gated без preconditionId; produce включён без scope → красный value_shape', () => {
  const gated = clone(COMPOSITE);
  delete gated.entries[1].values['checkpoint-v1'].preconditionId;
  assert.ok(hasTooth(findingsOf(gated), 'value_shape', 'entries[1].values.checkpoint-v1.preconditionId'));

  const produce = clone(COMPOSITE);
  produce.entries.push({
    id: 'produce', resource: 'produce.own', title: 'Своё производство', kind: 'produce', reseedRule: 'produce-scope',
    registry: { titleKey: 'tariff.produce.own', description: 'produce' },
    values: {
      'free-v1': { enabled: false, ratifiedAt: '2026-07-29' },
      'checkpoint-v1': { enabled: true, ratifiedAt: '2026-07-29' },
      'observatory-v1': { enabled: true, scope: ['dataset_index'], ratifiedAt: '2026-07-29' },
    },
  });
  assert.ok(hasTooth(findingsOf(produce), 'value_shape', 'entries[2].values.checkpoint-v1.scope'));
});

test('порча: форма matrix-only (available/outsideQuota) у обычного правила → красный; при matrix-only — проходит', () => {
  const smuggled = clone(BUFFER);
  smuggled.values['free-v1'] = { MiB: 512, ratifiedAt: '2026-09-08', outsideQuota: true };
  assert.ok(hasTooth(findingsOf(smuggled), 'value_shape', 'free-v1'));

  const sys = clone(BUFFER);
  Object.assign(sys, { id: 'system-datasets', resource: 'dataset.system', domain: 'catalog', kind: 'catalog', unit: null, reseedRule: 'matrix-only' });
  for (const sku of SKU_IDS) sys.values[sku] = { available: true, outsideQuota: true, ratifiedAt: '2026-09-08' };
  assert.equal(parseResource(sys).ok, true);
  const half = clone(sys);
  delete half.values['free-v1'].outsideQuota;
  assert.ok(hasTooth(findingsOf(half), 'value_shape', 'free-v1'));
});

test('порча: составная форма вместе с одиночной / ресурс дважды → красный entry_fields', () => {
  const both = clone(COMPOSITE);
  both.values = {};
  assert.ok(hasTooth(findingsOf(both), 'entry_fields', '(документ)'));

  const twice = clone(COMPOSITE);
  twice.entries[1].resource = 'instrument.mfcc';
  assert.ok(hasTooth(findingsOf(twice), 'entry_fields', 'entries[1].resource'));
});

// ─── слова строки ───────────────────────────────────────────────────────────────

test('строка: порядок колонок по rank, а не по порядку ключей в файле', () => {
  const shuffled = clone(BUFFER);
  shuffled.values = {
    'observatory-v1': BUFFER.values['observatory-v1'],
    'free-v1': BUFFER.values['free-v1'],
    'checkpoint-v1': BUFFER.values['checkpoint-v1'],
  };
  const { resource } = parseResource(shuffled);
  assert.equal(renderRow(resource.entries[0]), '| Буфер записи | 512 МиБ | 2048 МиБ | 4096 МиБ |');
  assert.equal(renderHeader().split('\n')[0], '| Ресурс | Датчик | Блокпост | Наблюдательный пункт |');
});

test('слова: штуки склоняются, заём помечен «(заглушка)», незакреплённое — «(не закреплено)», label из гранулы главнее', () => {
  assert.equal(pluralRu(1, ['прибор', 'прибора', 'приборов']), '1 прибор');
  assert.equal(pluralRu(4, ['прибор', 'прибора', 'приборов']), '4 прибора');
  assert.equal(pluralRu(9, ['прибор', 'прибора', 'приборов']), '9 приборов');
  const count = { reseedRule: 'exact-count', unitWords: ['сценарий', 'сценария', 'сценариев'] };
  assert.equal(formatValue(count, { count: 3, ratifiedAt: null }), '3 сценария (не закреплено)');
  const cat = { reseedRule: 'catalog-id' };
  assert.equal(formatValue(cat, { catalogId: 'checkpoint-v1-catalog', ratifiedAt: null, label: 'набор блокпоста', stub: { since: '2026-09-08', reason: 'x', resolvesBy: 'y' } }), 'набор блокпоста (заглушка)');
  assert.equal(formatValue({ reseedRule: 'exact-bytes' }, { MiB: 0, ratifiedAt: '2026-09-08' }), 'нет');
  assert.equal(formatValue({ reseedRule: 'gated-by-precondition' }, { enabled: true, preconditionId: 'p', ratifiedAt: '2026-07-29', label: 'при готовой сети' }), 'при готовой сети');
  assert.equal(formatValue({ reseedRule: 'matrix-only' }, { available: true, outsideQuota: true, ratifiedAt: '2026-09-08' }), 'да, вне квоты');
});

// ─── живые файлы дерева ─────────────────────────────────────────────────────────

function liveResourceFiles() {
  return readdirSync(GRANULES, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('tariff-'))
    .map((d) => path.join(GRANULES, d.name, 'resource.json'))
    .filter((p) => existsSync(p));
}

test('живые resource.json всех гранул tariff-* проходят паспорт (предмет — файлы дерева)', () => {
  const files = liveResourceFiles();
  console.log(`  passport: живых resource.json взято ${files.length}`);
  assert.ok(files.length > 0, 'ни одного живого resource.json — зубу нечего проверять');
  for (const file of files) {
    const r = parseResource(JSON.parse(readFileSync(file, 'utf8')));
    assert.equal(r.ok, true, `${path.relative(ROOT, file)}:\n${JSON.stringify(r.findings ?? null, null, 2)}`);
  }
});

test('живые гранулы: объединение ресурсов (кроме matrix-only) = реестр текущей сетки', () => {
  const files = liveResourceFiles();
  const matrixResources = new Set();
  for (const file of files) {
    const r = parseResource(JSON.parse(readFileSync(file, 'utf8')));
    if (!r.ok) continue;
    for (const e of r.resource.entries) if (e.reseedRule !== 'matrix-only') matrixResources.add(e.resource);
  }
  const grid = JSON.parse(readFileSync(GRID_PATH, 'utf8'));
  const gridIds = new Set(grid.registry.map((d) => d.id));
  console.log(`  passport: ресурсов в матрице ${matrixResources.size}, прав в сетке ${gridIds.size}`);
  const missingInMatrix = [...gridIds].filter((id) => !matrixResources.has(id));
  const extraInMatrix = [...matrixResources].filter((id) => !gridIds.has(id));
  assert.deepEqual(missingInMatrix, [], 'права сетки без гранулы матрицы');
  assert.deepEqual(extraInMatrix, [], 'гранулы матрицы без права в сетке (кроме matrix-only)');
});

test('живые function-гранулы tariff-* рендерят строку(и) «| … | … | … | … |» через свой fn', async () => {
  const dirs = readdirSync(GRANULES, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('tariff-'))
    .map((d) => path.join(GRANULES, d.name))
    .filter((dir) => existsSync(path.join(dir, 'render.mjs')));
  console.log(`  passport: function-гранул отрендерено ${dirs.length}`);
  assert.ok(dirs.length > 0);
  const io = { exec: async () => { throw new Error('гранула матрицы не ходит в io'); } };
  for (const dir of dirs) {
    const meta = JSON.parse(readFileSync(path.join(dir, 'granule.json'), 'utf8'));
    assert.equal(meta.kind, 'function', dir);
    assert.equal(meta.version, '1.0.0', dir);
    assert.ok(meta.usedBy?.some((u) => u.templateId === 'tariff-matrix' && /^\{\{row_[a-z_]+\}\}$/.test(u.placeholder)), `${dir}: usedBy на tariff-matrix`);
    const mod = await import(pathToFileURL(path.join(dir, meta.modulePath.replace(/^\.\//, ''))).href);
    const fn = mod[meta.fn];
    assert.equal(typeof fn, 'function', `${dir}: нет экспорта ${meta.fn}`);
    const { body } = await fn({ ctx: { granuleId: meta.id, version: meta.version } }, io);
    const lines = body.split('\n');
    assert.ok(lines.length >= 1);
    for (const line of lines) {
      assert.match(line, /^\| [^|]+ \| [^|]+ \| [^|]+ \| [^|]+ \|$/, `${meta.id}: строка не по форме «ресурс × три тарифа»: ${line}`);
      assert.doesNotMatch(line, /\d МБ\b/, `${meta.id}: «МБ» в строке — единица паспорта МиБ`);
    }
  }
});
