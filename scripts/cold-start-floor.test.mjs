/**
 * Зубы провода пола в хук старта (§6 контракта `workshop-wires`).
 *
 * Прогон: `node --test scripts/cold-start-floor.test.mjs`
 */

import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { WARM_TTL_MS, renderFloorBlock, sessionWarmth, stampWarm } from './cold-start-stamps.mjs';

const marker = () => join(mkdtempSync(join(tmpdir(), 'warm-')), 'marker');
const NOW = Date.parse('2026-07-31T12:00:00Z');

// ── Холодная и тёплая ─────────────────────────────────────────────────────────────────────

test('маркера нет — сессия холодная', () => {
  assert.equal(sessionWarmth(NOW, marker()), 'cold');
});

test('свежий маркер делает сессию тёплой, протухший — снова холодной', () => {
  const m = marker();
  stampWarm(NOW, m);
  assert.equal(sessionWarmth(NOW, m), 'warm');
  assert.equal(sessionWarmth(NOW + WARM_TTL_MS - 1, m), 'warm');
  assert.equal(sessionWarmth(NOW + WARM_TTL_MS, m), 'cold', 'граница TTL — уже холодная');
});

test('битый маркер — холодная, а не тёплая', () => {
  // Асимметрия названа: лишний раз показать пол дешевле, чем промолчать в сессии,
  // которая его не видела.
  const m = marker();
  writeFileSync(m, 'позавчера', 'utf8');
  assert.equal(sessionWarmth(NOW, m), 'cold');
});

test('маркер живёт вне репозитория', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('./cold-start-stamps.mjs', import.meta.url), 'utf8');
  assert.match(src, /tmpdir\(\)/u, 'дом маркера — временный каталог ОС');
  assert.doesNotMatch(src, /WARM_MARKER = path\.join\(REPO_ROOT/u, 'в tracked-пути маркер не течёт');
});

// ── Сборка блока ──────────────────────────────────────────────────────────────────────────

/** Заглушки: тесты гоняют без ФС и без git. */
const deps = (over = {}) => ({
  repoRoot: '/nowhere',
  warmth: 'cold',
  now: '2026-07-31T12:00:00Z',
  buildFloor: () => ({
    workshops: [{ home: 'scripts', entryVerb: 'yarn scripts:orphans', description: null, valid: true }],
    workshopCount: 1,
    compact: false,
    callable: { calls: ['yarn scripts:orphans'], dropped: 0 },
    namespaces: [],
    registryState: 'ok',
    registryProblems: [],
    policyLine: 'греп — последний',
    docLink: 'docs/x.md',
    stamps: { lines: ['штамп'] },
  }),
  validateFloor: () => ({ health: 'ok', reasons: [], secondLevel: 'свеж' }),
  renderHealth: () => ['инвентарь: ok'],
  readSecondLevelStamp: () => null,
  ...over,
});

test('штампы доезжают в пол как есть — второго счёта свежести нет', () => {
  let seen = null;
  const d = deps({ buildFloor: (_root, ctx) => { seen = ctx; return deps().buildFloor(); } });
  renderFloorBlock('штамп 1\nштамп 2', d);
  assert.deepEqual(seen.stamps.lines, ['штамп 1', 'штамп 2']);
});

test('холодная печатает каталог, тёплая — нет', () => {
  const cold = renderFloorBlock('штамп', deps());
  assert.match(cold, /мастерские \(1\)/u);
  const warm = renderFloorBlock('штамп', deps({ warmth: 'warm' }));
  assert.doesNotMatch(warm, /мастерские \(1\)/u, '§6: тёплая сессия каталог не перепечатывает');
  assert.match(warm, /инвентарь: ok/u, 'но отчёт остаётся');
});

test('перебор бюджета доезжает предупреждением, а не обрезкой', () => {
  const many = Array.from({ length: 60 }, (_, i) => `дом-${i}`);
  const d = deps({
    buildFloor: () => ({
      ...deps().buildFloor(),
      workshops: many.map((h) => ({ home: h, entryVerb: null, description: null, valid: true })),
      workshopCount: many.length,
    }),
  });
  const out = renderFloorBlock('штамп', d);
  assert.match(out, /⚠ выдача \d+ строк при бюджете 40/u);
  assert.match(out, /дом-59/u, 'строки не отрезаны — их посчитали');
});

// ── Отказоустойчивость ────────────────────────────────────────────────────────────────────

test('сбой сборки пола НЕ роняет хук — честная пустота с причиной', () => {
  // Обвалить старт сессии из-за собственного пола было бы худшим исполнением запрета §6
  // «сессию не блокирует».
  const out = renderFloorBlock('штамп', deps({
    buildFloor: () => { throw new Error('манифесты не читаются'); },
  }));
  assert.match(out, /^DEGRADED/u);
  assert.match(out, /манифесты не читаются/u, 'причина названа, а не проглочена');
  assert.match(out, /сессия работоспособна/u);
});

test('сбой записи маркера не мешает выдаче', () => {
  assert.equal(stampWarm(NOW, join('/нет-такого-каталога', 'marker')), false);
  // Пол важнее своей же метки: невозможность пометить сессию тёплой её не ломает.
  assert.match(renderFloorBlock('штамп', deps()), /мастерские/u);
});

test('DEGRADED-полоса из валидации доезжает первой строкой', () => {
  const out = renderFloorBlock('штамп', deps({
    validateFloor: () => ({ health: 'degraded', reasons: [{ kind: 'registry', text: 'реестра нет' }], secondLevel: 'неизвестно' }),
    renderHealth: () => ['DEGRADED · инвентарь неполон (1)', '  registry: реестра нет'],
  }));
  assert.match(out.split('\n')[0], /^DEGRADED/u);
});
