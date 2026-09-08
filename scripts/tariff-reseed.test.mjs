/**
 * Зуб глагола пересева `yarn tariff:reseed` — полный цикл на фикстуре с диска
 * (спринт tariff-matrix-2331, b4): reseed → --check зелёный → правка руками → --check
 * красный (exit 1, путь назван) → reseed → зелёный; релиза нет → exit 2, не зелёный.
 *
 * Живой релиз в дереве ещё не собран (b3): здесь — мини-релиз из трёх гранул в temp-каталоге,
 * гоняется НАСТОЯЩИЙ скрипт дочерним процессом (подложенные --release/--granules/--grid).
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { gridFindings } from './lib/tariff-grid-check.mjs';
import { loadMatrixRelease, ReseedIoError } from './tariff-reseed.mjs';

const SCRIPT = fileURLToPath(new URL('./tariff-reseed.mjs', import.meta.url));

const run = (args, opts = {}) => {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', ...opts });
  return { code: r.status, out: r.stdout, err: r.stderr };
};

function writeFixture(root) {
  const granules = join(root, 'granules');
  const releaseDir = join(root, 'releases', 'tariff-matrix');
  mkdirSync(releaseDir, { recursive: true });
  const put = (id, resource, version = '1.0.0') => {
    mkdirSync(join(granules, id), { recursive: true });
    writeFileSync(join(granules, id, 'granule.json'), JSON.stringify({ id, version, kind: 'function' }, null, 2));
    writeFileSync(join(granules, id, 'resource.json'), JSON.stringify(resource, null, 2));
  };
  const passport = { version: '1.0.0', ratifiedAt: '2026-09-08', owner: 'владелец', source: 'T1', note: '' };
  const q = (MiB, ratifiedAt = '2026-09-08') => ({ MiB, ratifiedAt });
  put('tariff-buffer', {
    schema: 'tariff-resource/1',
    id: 'tariff-buffer',
    resource: 'storage.buffer',
    title: 'Буфер записи',
    domain: 'storage',
    kind: 'quota',
    unit: 'MiB',
    reseedRule: 'exact-bytes',
    passport,
    registry: { titleKey: 'tariff.storage.buffer', description: 'Живой буфер записи' },
    values: { 'free-v1': q(512), 'checkpoint-v1': q(2048), 'observatory-v1': q(4096) },
  });
  put('tariff-nodes', {
    schema: 'tariff-resource/1',
    id: 'tariff-nodes',
    resource: 'nodes.max',
    title: 'Устройства',
    domain: 'rights',
    kind: 'quota',
    unit: 'count',
    reseedRule: 'exact-count',
    passport,
    registry: { titleKey: 'tariff.nodes.max', description: 'Устройства в мембране' },
    values: {
      'free-v1': { count: 1, ratifiedAt: '2026-07-29' },
      'checkpoint-v1': { count: 4, ratifiedAt: '2026-07-29' },
      'observatory-v1': { count: 9, ratifiedAt: '2026-07-29' },
    },
  });
  put('tariff-datasets', {
    schema: 'tariff-resource/1',
    id: 'tariff-datasets',
    resource: 'dataset.sounds',
    title: 'Наборы звуков',
    domain: 'catalog',
    kind: 'catalog',
    unit: null,
    reseedRule: 'catalog-id',
    passport,
    registry: { titleKey: 'tariff.dataset.sounds', description: 'Словарь звуков' },
    values: {
      'free-v1': { catalogId: 'free-v1-catalog', ratifiedAt: '2026-09-08' },
      'checkpoint-v1': { catalogId: 'checkpoint-v1-catalog', ratifiedAt: '2026-09-08' },
      'observatory-v1': {
        catalogId: 'checkpoint-v1-catalog',
        ratifiedAt: null,
        stub: { since: '2026-09-08', reason: 'пока на наборе блокпоста', resolvesBy: 'слово владельца' },
      },
    },
  });
  const releasePath = join(releaseDir, 'release.json');
  writeFileSync(
    releasePath,
    JSON.stringify(
      {
        releaseId: 'tariff-matrix',
        version: '0.1.0',
        templateId: 'tariff-matrix',
        templateVersion: '0.1.0',
        pins: { 'tariff-buffer': '1.0.0', 'tariff-nodes': '1.0.0', 'tariff-datasets': '1.0.0' },
        status: 'release',
        generatedAt: '2026-09-08T12:00:00.000Z',
      },
      null,
      2,
    ),
  );
  return { granules, releasePath, gridPath: join(root, 'tariff-grid.json') };
}

const withFixture = (fn) => {
  const root = mkdtempSync(join(tmpdir(), 'tariff-reseed-'));
  try {
    return fn(writeFixture(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

const argsOf = (fx) => ['--release', fx.releasePath, '--granules', fx.granules, '--grid', fx.gridPath];

test('полный цикл: reseed → check зелёный → правка руками → check красный → reseed → зелёный', () => {
  withFixture((fx) => {
    const args = argsOf(fx);

    const first = run(args);
    assert.equal(first.code, 0, first.err);
    assert.match(first.out, /сетка записана/u);
    assert.ok(existsSync(fx.gridPath));
    const grid = JSON.parse(readFileSync(fx.gridPath, 'utf8'));
    assert.deepEqual(gridFindings(grid), [], 'записанная сетка проходит зуб формы');
    assert.equal(grid.rows[0].cells['storage.buffer'].limit, 512 * 1024 * 1024);
    assert.equal(grid['//provisional']['observatory-v1.dataset.sounds'], 'пока на наборе блокпоста');
    assert.doesNotMatch(readFileSync(fx.gridPath, 'utf8'), /generatedAt/u, 'дата релиза в сетку не течёт');

    const green = run([...args, '--check']);
    assert.equal(green.code, 0, green.err);
    assert.match(green.out, /совпадает с проекцией релиза tariff-matrix@0\.1\.0/u);

    const again = run(args);
    assert.equal(again.code, 0);
    assert.match(again.out, /уже совпадала/u, 'повторный пересев — те же байты');

    grid.rows[1].cells['nodes.max'].limit = 5;
    writeFileSync(fx.gridPath, `${JSON.stringify(grid, null, 2)}\n`);
    const red = run([...args, '--check']);
    assert.equal(red.code, 1, 'правка руками → красный');
    assert.match(red.err, /rows\.checkpoint-v1\.cells\.nodes\.max\.limit/u, 'путь расхождения назван');
    assert.match(red.err, /yarn tariff:reseed/u);

    const reseed = run(args);
    assert.equal(reseed.code, 0);
    assert.match(reseed.out, /сетка записана/u);
    assert.equal(run([...args, '--check']).code, 0, 'после пересева — зелёный');
  });
});

test('--dry-run печатает проекцию в stdout и не трогает файл', () => {
  withFixture((fx) => {
    const r = run([...argsOf(fx), '--dry-run']);
    assert.equal(r.code, 0, r.err);
    assert.ok(!existsSync(fx.gridPath));
    const grid = JSON.parse(r.out);
    assert.deepEqual(gridFindings(grid), []);
    assert.deepEqual(grid.registry.map((d) => d.id), ['storage.buffer', 'nodes.max', 'dataset.sounds']);
  });
});

test('--check без сетки на диске — красный с подсказкой пересева, не зелёный', () => {
  withFixture((fx) => {
    const r = run([...argsOf(fx), '--check']);
    assert.equal(r.code, 1);
    assert.match(r.err, /сетки нет на диске/u);
  });
});

test('релиза нет → exit 2 «пересев не состоялся», не зелёный', () => {
  withFixture((fx) => {
    const r = run(['--release', join(fx.granules, '..', 'нет-релиза.json'), '--granules', fx.granules, '--grid', fx.gridPath]);
    assert.equal(r.code, 2);
    assert.match(r.err, /релиза матрицы нет — пересев не состоялся/u);
    assert.ok(!existsSync(fx.gridPath));
  });
});

test('гранула из pins не читается → exit 2 с именем гранулы; pin ≠ версии гранулы → exit 2', () => {
  withFixture((fx) => {
    rmSync(join(fx.granules, 'tariff-nodes', 'resource.json'));
    const r = run(argsOf(fx));
    assert.equal(r.code, 2);
    assert.match(r.err, /гранула tariff-nodes/u);
  });
  withFixture((fx) => {
    writeFileSync(join(fx.granules, 'tariff-nodes', 'granule.json'), JSON.stringify({ id: 'tariff-nodes', version: '1.1.0' }));
    const r = run(argsOf(fx));
    assert.equal(r.code, 2);
    assert.match(r.err, /pin 1\.0\.0, в дереве версия 1\.1\.0/u);
  });
});

test('гранула с правилом вне списка → exit 2 (инструментальная ошибка проекции)', () => {
  withFixture((fx) => {
    const p = join(fx.granules, 'tariff-nodes', 'resource.json');
    const res = JSON.parse(readFileSync(p, 'utf8'));
    res.reseedRule = 'roughly';
    writeFileSync(p, JSON.stringify(res));
    const r = run(argsOf(fx));
    assert.equal(r.code, 2);
    assert.match(r.err, /вне закрытого списка/u);
  });
});

test('прозаическая гранула (literal, body.md без resource.json) в pins — не ресурс: пропускается, не падает', () => {
  withFixture((fx) => {
    const dir = join(fx.granules, 'tariff-matrix-purpose');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'granule.json'), JSON.stringify({ id: 'tariff-matrix-purpose', version: '1.0.0', kind: 'literal' }));
    const release = JSON.parse(readFileSync(fx.releasePath, 'utf8'));
    release.pins = { 'tariff-matrix-purpose': '1.0.0', ...release.pins };
    writeFileSync(fx.releasePath, JSON.stringify(release));
    const r = run([...argsOf(fx), '--dry-run']);
    assert.equal(r.code, 0, r.err);
    const grid = JSON.parse(r.out);
    assert.deepEqual(grid.registry.map((d) => d.id), ['storage.buffer', 'nodes.max', 'dataset.sounds']);
    assert.match(grid['//'], /tariff-matrix-purpose@1\.0\.0/u, 'pin прозы остаётся в шапке — состав релиза полный');
    const loaded = loadMatrixRelease({ release: fx.releasePath, granules: fx.granules });
    assert.equal(loaded.granules.get('tariff-matrix-purpose'), null);
  });
});

test('loadMatrixRelease как модуль: релиза нет → ReseedIoError; есть → Map гранул по pins', () => {
  assert.throws(() => loadMatrixRelease({ release: join(tmpdir(), 'нет', 'release.json') }), ReseedIoError);
  withFixture((fx) => {
    const loaded = loadMatrixRelease({ release: fx.releasePath, granules: fx.granules });
    assert.deepEqual([...loaded.granules.keys()], ['tariff-buffer', 'tariff-nodes', 'tariff-datasets']);
  });
});
