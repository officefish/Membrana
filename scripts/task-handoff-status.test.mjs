/**
 * Зубы глагола task:handoff (tw-handoff-status): парс очереди, вердикты строк
 * (включая mismatch класса #1330 и honest unknown), кусты живого остатка, рендер
 * пяти секций формата капитана 13.08.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ROW_VERDICTS,
  clusterAlive,
  parseHandoffQueue,
  renderHandoffStatus,
  resolveRow,
} from './lib/task-handoff-status.mjs';

const SAMPLE = `# HANDOFF → 2026-08-12 (утро) · очередь «двадцать малых»

Текст преамбулы.

| # | Задача | Маркер живости | Размер |
|---|---|---|---|
| 1 | **\`worktrees-align-snapshot-guard\`** [#1864](https://github.com/x/y/issues/1864) — гард охвата | боевой прогон | S |
| 2 | **\`openrouter-default-model-unverified\`** — литерал в коде | карточка 10.08 | S |
| 8 | **\`frame-holders-reassign-twenty\`** [#1787](https://github.com/x/y/issues/1787) — держатели; ждёт [#1781](https://github.com/x/y/issues/1781) | Issue OPEN | M |
`;

test('парс: id из бэктиков, все Issue строки, номер строки', () => {
  const { title, rows } = parseHandoffQueue(SAMPLE);
  assert.match(title, /двадцать малых/u);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], {
    n: 1, id: 'worktrees-align-snapshot-guard', issues: [1864],
    raw: rows[0].raw,
  });
  assert.deepEqual(rows[1].issues, []);
  assert.deepEqual(rows[2].issues, [1787, 1781]);
});

test('парс: хендоф без таблицы очереди — rows пуст, не ошибка', () => {
  const { rows } = parseHandoffQueue('# Хендоф\n\nпросто текст');
  assert.deepEqual(rows, []);
});

const ctx = (cards, issueStates) => ({
  cards: new Map(Object.entries(cards)),
  issueStates: new Map(Object.entries(issueStates).map(([k, v]) => [Number(k), v])),
});

test('вердикт closed: карточка в архиве — свидетельство несёт дату и первую фразу заметок', () => {
  const r = resolveRow(
    { id: 'a', issues: [1] },
    ctx({ a: { status: 'archived', archivedAt: '2026-08-12', archiveNotes: 'Влито PR #1881. Прочее.' } }, { 1: 'CLOSED' }),
  );
  assert.equal(r.verdict, 'closed');
  assert.match(r.evidence, /2026-08-12/u);
  assert.match(r.evidence, /#1881/u);
  assert.doesNotMatch(r.evidence, /Прочее/u, 'таблице нужна первая фраза, не абзац');
});

test('вердикт alive: карточка активна и Issue OPEN', () => {
  const r = resolveRow({ id: 'a', issues: [1] }, ctx({ a: { status: 'active', archivedAt: null, archiveNotes: null } }, { 1: 'OPEN' }));
  assert.equal(r.verdict, 'alive');
});

test('вердикт mismatch (класс #1330): Issue закрыт, карточка активна — не гасится приоритетом', () => {
  const r = resolveRow({ id: 'a', issues: [1330] }, ctx({ a: { status: 'active', archivedAt: null, archiveNotes: null } }, { 1330: 'CLOSED' }));
  assert.equal(r.verdict, 'mismatch');
  assert.match(r.evidence, /#1330/u);
});

test('вердикт по Issue без карточки: CLOSED → closed, OPEN → alive', () => {
  assert.equal(resolveRow({ id: null, issues: [7] }, ctx({}, { 7: 'CLOSED' })).verdict, 'closed');
  assert.equal(resolveRow({ id: null, issues: [7] }, ctx({}, { 7: 'OPEN' })).verdict, 'alive');
});

test('honest unknown: сеть не дала состояние и карточки нет — ❓, не выдумка', () => {
  const r = resolveRow({ id: null, issues: [9] }, ctx({}, {}));
  assert.equal(r.verdict, 'unknown');
  assert.match(r.evidence, /не добыто|нечем/u);
});

test('honest unknown: ни карточки, ни Issue вовсе — строке нечем свидетельствовать (P2 Ожегова)', () => {
  const r = resolveRow({ id: 'ghost-row', issues: [] }, ctx({}, {}));
  assert.equal(r.verdict, 'unknown');
  assert.match(r.evidence, /нечем свидетельствовать/u);
});

test('словарь вердиктов закрыт', () => {
  assert.deepEqual([...ROW_VERDICTS].sort(), ['alive', 'closed', 'mismatch', 'unknown']);
});

test('кусты: общий префикс двух сегментов собирает строки вместе', () => {
  const out = clusterAlive([
    { id: 'static-mmbrn-live-inventory', n: 4 },
    { id: 'static-mmbrn-live-services', n: 5 },
    { id: 'network-container', n: 17 },
  ]);
  assert.ok(out.some((s) => s.startsWith('static-mmbrn-*')), out.join(' · '));
  assert.ok(out.includes('network-container'));
});

test('рендер: пять секций формата — шапка, отставание, таблица, итог, кусты', () => {
  const text = renderHandoffStatus({
    title: 'HANDOFF → 2026-08-12',
    fileCommit: { sha: 'abcdef1234567890', date: '2026-08-12', subject: 'очередь' },
    staleDays: 1,
    rows: [
      { n: 1, id: 'a', issues: [1], verdict: 'closed', evidence: 'архив 2026-08-12' },
      { n: 2, id: 'static-mmbrn-x', issues: [], verdict: 'alive', evidence: 'карточка активна' },
      { n: 3, id: 'static-mmbrn-y', issues: [], verdict: 'alive', evidence: 'карточка активна' },
      { n: 4, id: 'b', issues: [2], verdict: 'mismatch', evidence: 'Issue #2 закрыт, карточка активна' },
    ],
  });
  assert.match(text, /Последняя правка: abcdef12/u);
  assert.match(text, /Отставание от жизни/u);
  assert.match(text, /\| 1 \| `a` #1 \| ✅ \|/u);
  assert.match(text, /Итог: 1 из 4 закрыты · живых 2 · ⚠ расхождений 1/u);
  assert.match(text, /static-mmbrn-\* \(№2, №3\)/u);
  assert.match(text, /класс #1330/u);
});

test('рендер без очереди: честное «сверять нечего»', () => {
  const text = renderHandoffStatus({ title: 'X', fileCommit: null, staleDays: null, rows: [] });
  assert.match(text, /сверять нечего/u);
});
