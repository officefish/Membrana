/**
 * Тесты day-work-diff (rt-8, #539).
 *
 * Главное — ЗОЛОТОЙ РЕГРЕСС 15.07: день крупных слияний обязан давать код на ревью,
 * а не пустой контекст, из-за которого ревью объявило «T0 docs-only, Runtime не
 * затронут». Плюс сегментация Q2 и честная деградация.
 *
 * Детерминизм без git/сети: git-раннер инъектируется фикстурой. Формат лога `%H %s`
 * (SHA пробел subject) — фикстуры отражают это.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  changedLinesFromShortstat,
  collectDayWorkDiff,
  dayPeriodRange,
  formatDayReviewHeader,
  formatDayWorkContext,
  isSegmentOversized,
  parseDayCommits,
  OVERSIZED_CHANGED_LINES,
} from './lib/day-work-diff.mjs';

/** Фейковый git: список [подстрока args, stdout]. Первое совпадение выигрывает. */
const fakeGit = (responses) => (args) => {
  const key = args.join(' ');
  for (const [pattern, out] of responses) {
    if (key.includes(pattern)) return out;
  }
  return '';
};

// ─── чистые хелперы ───────────────────────────────────────────────────────────────

test('parseDayCommits: SHA, subject, PR из (#N); делит по ПЕРВОМУ пробелу', () => {
  const commits = parseDayCommits(['abc123 feat(x): a b c (#10)', 'def456 chore: b'].join('\n'));
  assert.deepEqual(commits, [
    { sha: 'abc123', subject: 'feat(x): a b c (#10)', pr: 10 },
    { sha: 'def456', subject: 'chore: b', pr: null },
  ]);
});

test('dayPeriodRange: base = родитель первого, head = последний', () => {
  const range = dayPeriodRange([{ sha: 'aaa' }, { sha: 'bbb' }, { sha: 'ccc' }]);
  assert.deepEqual(range, { base: 'aaa^', head: 'ccc', count: 3 });
});

test('dayPeriodRange: пустой день → null (нечего ревьюить, не ошибка)', () => {
  assert.equal(dayPeriodRange([]), null);
});

test('changedLinesFromShortstat парсит insertions+deletions', () => {
  assert.equal(changedLinesFromShortstat(' 61 files changed, 4535 insertions(+), 652 deletions(-)'), 5187);
  assert.equal(changedLinesFromShortstat(' 1 file changed, 3 insertions(+)'), 3);
  assert.equal(changedLinesFromShortstat(''), 0);
});

test('isSegmentOversized по порогу', () => {
  assert.equal(isSegmentOversized(OVERSIZED_CHANGED_LINES), false);
  assert.equal(isSegmentOversized(OVERSIZED_CHANGED_LINES + 1), true);
});

// ─── ЗОЛОТОЙ РЕГРЕСС 15.07 ────────────────────────────────────────────────────────

test('золотой 15.07: день слияний даёт КОД на ревью, не пустой контекст', () => {
  // Реконструкция: 15.07 в main влились крупные слияния. Раньше daily смотрел на
  // чистое рабочее дерево и объявлял «T0 docs-only». Теперь видит дифф коммитов дня.
  const run = fakeGit([
    [
      'log --since',
      [
        'sha_pc1 feat: PC-1 отчёт одиночного детектора (#493)',
        'sha_pc2 feat: PC-2 спектр развязан от записи (#511)',
        'sha_cw feat: cowork FREE fragment usercases (#487)',
      ].join('\n'),
    ],
    ['diff --shortstat sha_pc1', ' 12 files changed, 350 insertions(+), 40 deletions(-)'],
    ['diff --shortstat sha_pc2', ' 8 files changed, 210 insertions(+), 15 deletions(-)'],
    ['diff --shortstat sha_cw', ' 20 files changed, 300 insertions(+), 30 deletions(-)'],
    ['diff sha_pc1^..sha_pc1', '+++ b/packages/device-board/src/graph/report.ts\n+export function makeReport() {}'],
    ['diff sha_pc2^..sha_pc2', '+++ b/packages/device-board/src/runtime/spectrum.ts\n+const decoupled = true;'],
    ['diff sha_cw^..sha_cw', '+++ b/apps/client/src/usercase.ts\n+export const uc = 1;'],
  ]);

  const result = collectDayWorkDiff({ run });
  assert.equal(result.mode, 'работа дня', 'НЕ «рабочее дерево»');
  assert.equal(result.period.count, 3);
  assert.equal(result.segments.length, 3);
  // Ключевое: контекст содержит РЕАЛЬНЫЙ КОД, а не пусто → «T0 docs-only» невозможен.
  const ctx = formatDayWorkContext(result);
  assert.match(ctx, /makeReport/u, 'код PC-1 виден');
  assert.match(ctx, /spectrum\.ts/u, 'runtime PC-2 виден — «Runtime не затронут» было бы ложью');
  assert.match(ctx, /usercase\.ts/u, 'cowork виден');
  assert.ok(result.segments.every((s) => !s.oversized), 'каждый PR ≤400 — развёрнут');
});

// ─── сегментация Q2 ───────────────────────────────────────────────────────────────

test('Q2: oversized-сегмент помечен, дифф НЕ развёрнут (не молчаливая обрезка)', () => {
  const run = fakeGit([
    ['log --since', 'big feat: огромный PR (#999)'],
    ['diff --shortstat big', ' 80 files changed, 4000 insertions(+), 535 deletions(-)'],
    ['diff big^..big', 'ОГРОМНЫЙ ДИФФ КОТОРЫЙ НЕ ДОЛЖЕН ПОПАСТЬ В КОНТЕКСТ'],
  ]);
  const result = collectDayWorkDiff({ run });
  const seg = result.segments[0];
  assert.equal(seg.oversized, true);
  assert.equal(seg.diff, '', 'дифф oversized не тянется');
  const ctx = formatDayWorkContext(result);
  assert.doesNotMatch(ctx, /ОГРОМНЫЙ ДИФФ/u, 'тело oversized не в контексте');
  assert.match(ctx, /oversized/u, 'но пометка есть');
  assert.match(formatDayReviewHeader(result), /Oversized.*#999/su, 'и в шапке назван');
});

test('день с несколькими PR: каждый сегментирован отдельно', () => {
  const run = fakeGit([
    ['log --since', ['aaa fix: a (#1)', 'bbb fix: b (#2)'].join('\n')],
    ['diff --shortstat aaa', ' 1 file changed, 10 insertions(+)'],
    ['diff --shortstat bbb', ' 1 file changed, 20 insertions(+)'],
    ['diff aaa^..aaa', '+a'],
    ['diff bbb^..bbb', '+b'],
  ]);
  const result = collectDayWorkDiff({ run });
  assert.equal(result.segments.length, 2);
  assert.deepEqual(result.segments.map((s) => s.pr), [1, 2]);
});

// ─── честная деградация ───────────────────────────────────────────────────────────

test('нет коммитов за период → честный режим, не ложное «всё чисто»', () => {
  const result = collectDayWorkDiff({ run: fakeGit([['log --since', '']]) });
  assert.equal(result.mode, 'нет коммитов за период');
  assert.equal(result.period, null);
  assert.match(formatDayReviewHeader(result), /коммитов нет — ревьюить нечего/u);
});

test('шапка честная: режим, precision, период — текстом', () => {
  const run = fakeGit([
    ['log --since', 'xyz feat: y (#5)'],
    ['diff --shortstat xyz', ' 1 file changed, 5 insertions(+)'],
    ['diff xyz^..xyz', '+y'],
  ]);
  const header = formatDayReviewHeader(collectDayWorkDiff({ run }));
  assert.match(header, /Режим: работа дня/u);
  assert.match(header, /Precision: exact/u);
  assert.match(header, /Период: xyz\^\.\.xyz \(1 коммит/u);
});
