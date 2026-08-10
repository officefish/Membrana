import assert from 'node:assert/strict';
import test from 'node:test';

import {
  directPackages,
  formatNotRunReport,
  notRunPackages,
  planVitestGate,
  SCOPE_MODES,
} from './vitest-gate-scope.mjs';

const PACKAGES = [
  { name: '@m/core', dir: 'packages/core', hasTest: true },
  { name: '@m/core-extras', dir: 'packages/core-extras', hasTest: true },
  { name: '@m/audio', dir: 'packages/services/audio-engine', hasTest: true },
  { name: '@m/detector-base', dir: 'packages/services/detectors/base', hasTest: true },
  { name: '@m/panel', dir: 'apps/panel', hasTest: true },
  { name: '@m/docs', dir: 'apps/docs', hasTest: false },
];
const SMOKE = ['@m/core', '@m/audio', '@m/detector-base'];
const plan = (changedFiles) => planVitestGate({ changedFiles, packages: PACKAGES, smoke: SMOKE });

test('docs-only — пол smoke, а не пустой прогон', () => {
  const p = plan(['README.md', 'docs/HANDOFF.md', 'packages/core/NOTES.mdx']);
  assert.equal(p.mode, 'floor');
  assert.deepEqual(p.scope, []);
  assert.deepEqual(p.filters, ['--filter=@m/audio', '--filter=@m/core', '--filter=@m/detector-base']);
  assert.match(p.reason, /\.md/u);
});

test('#1168 не повторяется: markdown ВНУТРИ пакета его не метит', () => {
  const p = plan(['packages/core/DEVICE_BOARD_CONCEPT.md']);
  assert.equal(p.mode, 'floor', 'правка доки внутри пакета не тянет зависимых — это и есть дефект #1168');
  assert.deepEqual(p.scope, []);
});

test('корневой конфиг — весь корпус, фильтров нет', () => {
  for (const f of ['turbo.json', 'tsconfig.base.json', '.env']) {
    const p = plan([f, 'README.md']);
    assert.equal(p.mode, 'full', `${f} обязан звать весь корпус`);
    assert.deepEqual(p.filters, [], 'полный прогон идёт без --filter');
    assert.ok(!p.scope.includes('@m/docs'), 'пакет без скрипта test в корпус не входит');
    assert.equal(p.scope.length, 5);
  }
});

test('корневой package.json корневым конфигом НЕ считается', () => {
  const p = plan(['package.json']);
  assert.equal(p.mode, 'floor', 'иначе over-trigger полного билда — тот самый vite 127');
});

test('пакет и в полу, и в скоупе — получает ..., а не голое имя', () => {
  // Живой прогон 10.08: правка detectors/base давала «прогнано 3 из 38» — один лишь пол,
  // одиннадцать зависимых фундамента молча выпадали. Дедуп обязан идти в сторону пола.
  const p = plan(['packages/services/detectors/base/src/index.ts']);
  assert.equal(p.mode, 'scoped');
  assert.deepEqual(p.scope, ['@m/detector-base']);
  assert.ok(p.filters.includes('--filter=...@m/detector-base'), 'зависимые фундамента обязаны попасть в прогон');
  assert.ok(!p.filters.includes('--filter=@m/detector-base'), 'голое имя рядом с ... — тихое сужение набора');
  assert.equal(p.filters.filter((f) => f.includes('detector-base')).length, 1, 'и без задвоения');
  assert.deepEqual(p.filters, ['--filter=@m/audio', '--filter=@m/core', '--filter=...@m/detector-base']);
});

test('затронутый пакет ВНЕ пола получает ... — раскрытие зависимых за turbo', () => {
  const p = plan(['apps/panel/src/app.tsx']);
  assert.equal(p.mode, 'scoped');
  assert.ok(p.filters.includes('--filter=...@m/panel'));
});

test('граница сегмента: core-extras не принадлежит core', () => {
  assert.deepEqual(directPackages(['packages/core-extras/src/a.ts'], PACKAGES), ['@m/core-extras']);
  assert.deepEqual(directPackages(['packages/core/src/a.ts'], PACKAGES), ['@m/core']);
});

test('пакет БЕЗ скрипта test остаётся в скоупе — тесты его зависимых обязаны пойти', () => {
  // Ревью 10.08 поймало обратное живым замером: правка packages/libs/audioDataViz давала
  // «mode=floor, прогнано 3 из 38», а зависящий от неё @membrana/client со своими тестами
  // уходил в «не гонялось». Своих тестов нет — но сломать чужие он может.
  const p = plan(['apps/docs/src/page.tsx']);
  assert.equal(p.mode, 'scoped');
  assert.deepEqual(p.scope, ['@m/docs']);
  assert.ok(p.filters.includes('--filter=...@m/docs'), 'зависимые обязаны попасть в прогон');
  assert.match(p.reason, /своих тестов нет у: @m\/docs/u, 'и это сказано вслух, а не спрятано');
});

test('пустой ярус smoke без затронутых пакетов — объявленная опасность, а не «прогон всего»', () => {
  // Ноль фильтров turbo читает как «гонять всё», и отчёт вышел бы с шапкой
  // «mode=floor · прогнано 40 из 38» — враньё в сторону, обратную обычной.
  const p = planVitestGate({ changedFiles: ['README.md'], packages: PACKAGES, smoke: [] });
  assert.equal(p.mode, 'floor');
  assert.deepEqual(p.filters, []);
  assert.equal(p.runsEverything, true, 'потребитель обязан остановиться на этом поле');
});

test('runsEverything не поднимается там, где фильтров нет законно', () => {
  assert.equal(plan(['turbo.json']).runsEverything, false, 'режим full и есть прогон всего — по решению, а не молча');
  assert.equal(plan(['README.md']).runsEverything, false);
  assert.equal(plan(['apps/panel/src/a.ts']).runsEverything, false);
});

test('смешанное изменение: код + доки — доки не расширяют скоуп', () => {
  const p = plan(['apps/panel/src/app.tsx', 'packages/core/README.md']);
  assert.deepEqual(p.scope, ['@m/panel'], 'core затронут только докой — в скоуп не идёт');
});

test('корпус для отчёта считается по пакетам со скриптом test, скоуп — по всем', () => {
  const p = plan(['apps/docs/src/a.ts', 'apps/panel/src/b.ts']);
  assert.deepEqual(p.scope, ['@m/docs', '@m/panel']);
  assert.deepEqual(notRunPackages(['@m/core', '@m/panel'], ['@m/panel']), ['@m/core'], 'корпус без @m/docs — тестов у него нет');
});

test('режим всегда из закрытого списка', () => {
  for (const files of [[], ['a.md'], ['turbo.json'], ['packages/core/x.ts']]) {
    assert.ok(SCOPE_MODES.includes(plan(files).mode));
  }
});

test('notRun считается от ФАКТА прогона, а не от плана', () => {
  const corpus = ['a', 'b', 'c', 'd'];
  assert.deepEqual(notRunPackages(corpus, ['a', 'c']), ['b', 'd']);
  assert.deepEqual(notRunPackages(corpus, corpus), [], 'весь корпус — пустой остаток заработан');
});

test('пустой остаток — отдельная строка, а не молчание', () => {
  const report = formatNotRunReport({ mode: 'full', reason: 'корневой конфиг', ran: ['a', 'b'], notRun: [], corpusSize: 2 });
  assert.match(report, /not run in merge gate: —/u, 'тихо пустой результат запрещён');
});

test('остаток называет каждый непрогнанный пакет поимённо', () => {
  const report = formatNotRunReport({
    mode: 'floor',
    reason: 'изменения вне пакетов',
    ran: ['@m/core'],
    notRun: ['@m/panel', '@m/audio'],
    corpusSize: 3,
  });
  assert.match(report, /not run in merge gate: @m\/panel/u);
  assert.match(report, /not run in merge gate: @m\/audio/u);
  assert.match(report, /прогнано 1 из 3/u);
});

test('живой каталог smoke ложится в план без правки', async () => {
  const { readFileSync } = await import('node:fs');
  const catalog = JSON.parse(readFileSync('tests/vitest-smoke.catalog.json', 'utf8'));
  const p = planVitestGate({ changedFiles: ['README.md'], packages: PACKAGES, smoke: catalog.smoke });
  assert.equal(p.mode, 'floor');
  assert.equal(p.filters.length, catalog.smoke.length);
});
