/**
 * Тесты tooling-overview (#554 TF-6).
 *
 * Главное — генератор обязан находить то, чего НЕ БЫЛО в рукописном снимке 08.07
 * (`neighbors`, `research`, `consilium`, `task:register`, `main-day-probe`).
 * Именно их отсутствие стоило пяти повторов «написал заново существующее».
 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  buildToolingOverview,
  extractLibExports,
  extractSkillNames,
  groupScripts,
  parseToolingOverviewCli,
  selectAgentScripts,
} from './lib/tooling-overview.mjs';
import { writeScriptsRegistryReport } from './scripts-registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('selectAgentScripts отсеивает продуктовую сборку, оставляет агентский цикл', () => {
  const picked = selectAgentScripts({
    build: 'turbo run build',
    test: 'turbo run test',
    'dataset:generate': 'x',
    'deploy:when-green': 'x',
    neighbors: 'node scripts/neighbors.mjs',
    'task:register': 'x',
  });
  assert.ok(picked.includes('neighbors'), 'агентское остаётся');
  assert.ok(picked.includes('task:register'));
  assert.ok(!picked.includes('build'), 'продуктовая сборка отсеяна');
  assert.ok(!picked.includes('dataset:generate'));
});

test('groupScripts раскладывает по группам, каждая команда ровно раз', () => {
  const groups = groupScripts(['task:archive', 'code-review', 'consilium', 'pr:ship', 'zzz-unknown']);
  const flat = groups.flatMap((g) => g.items);
  assert.equal(flat.length, 5, 'ничего не потеряно и не задвоено');
  assert.ok(groups.some((g) => g.title === 'Прочее агентское'), 'неизвестное не выпадает');
});

test('extractSkillNames тянет имена скиллов', () => {
  assert.deepEqual(extractSkillNames('см. `membrana-ship` и `membrana-adr`, ещё `membrana-ship`'), [
    'membrana-adr',
    'membrana-ship',
  ]);
});

test('extractLibExports тянет чистые леммы', () => {
  const text = 'export function alpha() {}\nconst x=1;\nexport function beta(a) {}\n// export function fake';
  assert.deepEqual(extractLibExports(text), ['alpha', 'beta']);
});

// ─── ЗОЛОТОЙ: корень — генератор видит то, чего не было в снимке 08.07 ────────────

test('золотой: живой package.json даёт команды, отсутствовавшие в рукописном снимке', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const picked = selectAgentScripts(pkg.scripts);
  // Ровно те, из-за отсутствия которых я писал заново существующее (сессия 16.07).
  for (const name of ['neighbors', 'research', 'consilium', 'task:register', 'main-day-probe']) {
    assert.ok(picked.includes(name), `${name} обязан быть в инвентаре`);
  }
  // Снимок 08.07 держал 11 команд — генератор обязан давать кратно больше.
  assert.ok(picked.length > 50, `агентских команд ${picked.length}, снимок держал 11`);
});

test('обзор честно называет себя генерируемым и не предлагает вести рукой', () => {
  const md = buildToolingOverview({
    scripts: { neighbors: 'x', 'task:register': 'y' },
    skillsReadme: '`membrana-ship`',
    libs: [{ file: 'a.mjs', exports: ['foo'] }],
    hooks: ['pre-push'],
  });
  assert.match(md, /генерируется/u);
  assert.match(md, /Рукой не ведётся/u);
  assert.match(md, /yarn neighbors/u);
  assert.match(md, /membrana-ship/u);
  assert.match(md, /foo/u, 'чистые леммы видны — их и переиспользовать');
  assert.match(md, /Грабли и уроки — НЕ здесь/u, 'раскол генерация/руками явный');
});

test('parseToolingOverviewCli: --report без пути → канон SCRIPTS_LIST', () => {
  assert.equal(parseToolingOverviewCli(['--report']).report, 'scripts/registry/SCRIPTS_LIST.md');
  assert.equal(parseToolingOverviewCli(['--report', 'tmp/out.md']).report, 'tmp/out.md');
  assert.equal(parseToolingOverviewCli(['--json']).json, true);
});

test('S2 writeScriptsRegistryReport пишет Meta Source tooling:overview --report', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sbc-s2-'));
  mkdirSync(join(dir, 'scripts', 'registry'), { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ scripts: { neighbors: 'node scripts/neighbors.mjs' } }),
    'utf8',
  );
  writeFileSync(join(dir, 'scripts', 'neighbors.mjs'), '// stub\n', 'utf8');
  const written = writeScriptsRegistryReport(dir, {
    report: 'scripts/registry/SCRIPTS_LIST.md',
    source: 'yarn tooling:overview --report',
    date: '2026-07-21',
  });
  const md = readFileSync(join(dir, written.reportRel), 'utf8');
  assert.match(md, /yarn tooling:overview --report/);
  assert.match(md, /`neighbors` → `scripts\/neighbors\.mjs`/);
  assert.equal(written.counts.yarnTouching, 1);
});
