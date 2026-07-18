/**
 * Тесты ядра вечернего аудита (#627, фаза 2). Офлайн: git и fs не участвуют —
 * ядро принимает готовые снимки, поэтому проверяется на фикстурах.
 *
 * Канон разреза областей: docs/adr/ADR-0013-daily-audit-is-chronicle.md.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  linesByArea,
  registryMovement,
  renderReport,
  repoMovement,
  truthMovement,
} from './lib/audit-evening.mjs';

const f = (path, added, removed) => ({ path, added, removed });
const areaOf = (path) => {
  const { rows } = linesByArea([f(path, 1, 0)]);
  return rows[0].key;
};

// ── Разрез областей: канон Р4 ADR-0013 ──────────────────────────────────────────

test('области: продукт, кабинет, тулинг, процессы, витрина', () => {
  assert.equal(areaOf('packages/core/src/index.ts'), 'product');
  assert.equal(areaOf('packages/services/detectors/harmonic/src/a.ts'), 'product');
  assert.equal(areaOf('apps/client/src/App.tsx'), 'product');
  assert.equal(areaOf('apps/cabinet/src/main.tsx'), 'cabinet');
  assert.equal(areaOf('packages/background-cabinet/src/api.ts'), 'cabinet');
  assert.equal(areaOf('scripts/audit-evening.mjs'), 'tooling');
  assert.equal(areaOf('package.json'), 'tooling');
  assert.equal(areaOf('docs/MEETING_REGULATION.md'), 'process');
  assert.equal(areaOf('apps/panel/src/Board.tsx'), 'showcase');
});

test('спорные случаи разрешены каноном поимённо (Р4)', () => {
  // Процесс, а не витрина: передача смены и вещдоки ритуалов — это работа команды.
  assert.equal(areaOf('docs/handoff/session-2026-07-18.md'), 'process');
  assert.equal(areaOf('docs/archive/daily-day/2026-07-18/audit.md'), 'process');
  // Собственные решения и артефакты ревью — тоже процесс (пропуск, найденный в фазе 2).
  assert.equal(areaOf('docs/adr/ADR-0013-daily-audit-is-chronicle.md'), 'process');
  assert.equal(areaOf('docs/discussions/branch-code-review.md'), 'process');
  // Референсы облика — витрина, а не производственный канон.
  assert.equal(areaOf('docs/design/REFERENCE_SOURCES.md'), 'showcase');
  // Правила работы команды — процесс, несмотря на положение в корне.
  assert.equal(areaOf('AGENTS.md'), 'process');
  // Входы и следы работы — не работа: иначе день мерился бы объёмом данных.
  assert.equal(areaOf('data/detectors-benchmark/v0.2/drone/a.wav'), 'other');
  assert.equal(areaOf('logs/deploy.log'), 'other');
});

test('границы продуктовые, а не по языку', () => {
  // Тот же JS, но scripts — тулинг, а не продукт.
  assert.equal(areaOf('scripts/lib/audit-evening.mjs'), 'tooling');
  assert.equal(areaOf('packages/core/src/wire.ts'), 'product');
  // Тот же markdown, но регламент — процесс, а доки панели — витрина.
  assert.equal(areaOf('docs/MEETING_REGULATION.md'), 'process');
  assert.equal(areaOf('apps/docs/pages/overview.mdx'), 'showcase');
});

test('«Прочее» существует явно — иначе доли молча не сойдутся к 100%', () => {
  const { rows, totals } = linesByArea([f('какой-то/новый/путь.txt', 10, 0), f('scripts/a.mjs', 10, 0)]);
  const other = rows.find((r) => r.key === 'other');
  assert.ok(other, 'категория обязана быть видимой');
  assert.equal(other.added, 10);
  assert.equal(totals.added, 20);
});

test('первое совпадение выигрывает: частное правило выше общего', () => {
  // packages/services/** — продукт, хотя packages/background-* — кабинет.
  assert.equal(areaOf('packages/services/rag/src/x.ts'), 'product');
  assert.equal(areaOf('packages/background-media/src/y.ts'), 'cabinet');
});

// ── Подсчёт строк: инварианты Р5 ────────────────────────────────────────────────

test('Р5: + и − не схлопываются — переписывание это не простой', () => {
  const { rows } = linesByArea([f('packages/core/src/a.ts', 500, 500)]);
  assert.equal(rows[0].added, 500);
  assert.equal(rows[0].removed, 500);
  assert.equal(rows[0].net, 0, 'net виден отдельно, но не заменяет собой +/−');
});

test('Р5: файл в списке один раз — задвоения нет (дифф, а не сумма по коммитам)', () => {
  // Обвязка обязана давать по одной записи на файл; ядро суммирует как есть.
  // Тест фиксирует контракт: пять правок одного файла = одна строка на входе.
  const { rows, totals } = linesByArea([f('apps/cabinet/src/a.ts', 42, 7)]);
  assert.equal(totals.files, 1, 'файл считается один раз');
  assert.equal(rows[0].added, 42);
});

test('пустой день: нулевой дифф не роняет и не делит на ноль', () => {
  const { rows, totals } = linesByArea([]);
  assert.deepEqual(rows, []);
  assert.deepEqual(totals, { added: 0, removed: 0, files: 0 });
});

// ── Движение реестра ────────────────────────────────────────────────────────────

const card = (id, over = {}) => ({ id, title: `Задача ${id}`, status: 'active', githubIssue: 1, ...over });

test('реестр: заведено / в архив / сменило статус', () => {
  const before = { tasks: [card('a'), card('b')] };
  const after = { tasks: [card('a'), card('b', { status: 'archived' }), card('c')] };
  const m = registryMovement(before, after);
  assert.deepEqual(m.added.map((t) => t.id), ['c']);
  assert.deepEqual(m.archived.map((t) => t.id), ['b']);
  assert.equal(m.counts.wasTotal, 2);
  assert.equal(m.counts.total, 3);
});

test('реестр: правка одних лишь полей помечается отдельно, не выдаётся за движение', () => {
  // Живой случай 18.07: массовый tasks:sync-issues тронул 319 карточек, и без этого
  // разделения 190 одинаковых строк похоронили бы две настоящие.
  const before = { tasks: [card('a', { githubIssueClosedAt: null })] };
  const after = { tasks: [card('a', { githubIssueClosedAt: '2026-07-15' })] };
  const m = registryMovement(before, after);
  assert.equal(m.statusChanged.length, 1);
  assert.equal(m.statusChanged[0].fieldsOnly, true, 'помечено как обслуживание данных');
  assert.equal(m.archived.length, 0);
});

// ── Движение графа правды ───────────────────────────────────────────────────────

const tok = (id, over = {}) => ({ id, class: 'derived', status: 'active', claim: `Утверждение ${id}`, ...over });

test('граф: отзыв ловится СМЕНОЙ СТАТУСА, а не исчезновением записи', () => {
  // Отозванный токен остаётся в реестре со status: revoked — если искать пропажу,
  // отзыв не будет виден никогда.
  const before = { tokens: [tok('t1'), tok('t2')] };
  const after = { tokens: [tok('t1'), tok('t2', { status: 'revoked' })] };
  const m = truthMovement(before, after);
  assert.deepEqual(m.revoked.map((t) => t.id), ['t2']);
  assert.equal(m.added.length, 0);
});

test('граф: кристаллизация и счётчики по классам', () => {
  const before = { tokens: [tok('t1')] };
  const after = { tokens: [tok('t1'), tok('t2', { class: 'owner' })] };
  const m = truthMovement(before, after);
  assert.deepEqual(m.added.map((t) => t.id), ['t2']);
  assert.equal(m.counts.owner, 1);
  assert.equal(m.counts.derived, 1);
  assert.equal(m.counts.wasTotal, 1);
});

// ── Коммиты и проекция ──────────────────────────────────────────────────────────

test('коммиты: группировка по типу, PR из хвоста темы', () => {
  const r = repoMovement([
    { sha: 'a1', subject: 'feat(x): раз (#100)', files: 2 },
    { sha: 'a2', subject: 'fix(y): два', files: 1 },
    { sha: 'a3', subject: 'feat(z): три', files: 3 },
  ]);
  assert.equal(r.total, 3);
  assert.equal(r.byType[0].type, 'feat');
  assert.equal(r.byType[0].count, 2);
  assert.deepEqual(r.merged.map((m) => m.pr), [100]);
});

test('проекция детерминирована: один вход → побайтово один выход', () => {
  const data = {
    date: '2026-07-18',
    base: 'aaaaaaaa1111',
    head: 'bbbbbbbb2222',
    repo: repoMovement([{ sha: 'a1', subject: 'feat(x): раз (#100)', files: 1 }]),
    lines: linesByArea([f('packages/core/src/a.ts', 10, 2)]),
    registry: registryMovement({ tasks: [] }, { tasks: [card('a')] }),
    truth: truthMovement({ tokens: [] }, { tokens: [tok('t1')] }),
  };
  assert.equal(renderReport(data), renderReport(data));
});

test('пустой день: отчёт собирается и честно говорит «не двигалось»', () => {
  const md = renderReport({
    date: '2026-07-18',
    base: 'aaaaaaaa1111',
    head: 'aaaaaaaa1111',
    repo: repoMovement([]),
    lines: linesByArea([]),
    registry: registryMovement({ tasks: [] }, { tasks: [] }),
    truth: truthMovement({ tokens: [] }, { tokens: [] }),
  });
  assert.match(md, /Коммитов за день нет/u);
  assert.match(md, /Реестр за день не двигался/u);
  assert.match(md, /Граф правды за день не двигался/u);
  assert.doesNotMatch(md, /NaN|Infinity/u, 'доли не считаются от нуля');
});
