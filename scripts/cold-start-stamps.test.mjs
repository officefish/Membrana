import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoDay, parseHandoffHeaderDate, gapDays, pickFreshnessGap } from './lib/freshness.mjs';
import { ruDays, parseTipLine, collectStamps, renderStamps } from './cold-start-stamps.mjs';

// ─── чистые функции freshness ────────────────────────────────────────────────────

test('isoDay: ISO-штамп с таймзоной → календарный день источника (без UTC-сдвига)', () => {
  assert.equal(isoDay('2026-07-29T00:30:10+03:00'), '2026-07-29');
  assert.equal(isoDay('2026-07-28'), '2026-07-28');
  assert.equal(isoDay('мусор'), null);
  assert.equal(isoDay(null), null);
});

test('parseHandoffHeaderDate: дата из H1 «# HANDOFF → 2026-07-28 · …»', () => {
  assert.equal(parseHandoffHeaderDate('# HANDOFF → 2026-07-28 · **топ-10** · ЗАКРЫТ\n\nтело'), '2026-07-28');
});

test('parseHandoffHeaderDate: дата берётся из H1, не из тела; нет даты в H1 → null', () => {
  assert.equal(parseHandoffHeaderDate('# HANDOFF без даты\n\nв теле 2026-07-01'), null);
  assert.equal(parseHandoffHeaderDate('просто текст 2026-07-01'), null);
  assert.equal(parseHandoffHeaderDate(''), null);
  assert.equal(parseHandoffHeaderDate(null), null);
});

test('gapDays: положительная дыра = второй аргумент свежее (локальное отстало)', () => {
  assert.equal(gapDays('2026-07-26', '2026-07-28'), 2);
  assert.equal(gapDays('2026-07-28', '2026-07-28'), 0);
  assert.equal(gapDays('2026-07-29', '2026-07-28'), -1, 'локальное впереди origin → отрицательно');
  assert.equal(gapDays('2026-06-30', '2026-07-01'), 1, 'через границу месяца');
});

test('gapDays: невалидная дата → null («неизвестно» ≠ «свежо»)', () => {
  assert.equal(gapDays(null, '2026-07-28'), null);
  assert.equal(gapDays('2026-07-28', 'мусор'), null);
});

test('pickFreshnessGap: приоритет дат HANDOFF над tip-коммитами', () => {
  const r = pickFreshnessGap({
    localHandoffDate: '2026-07-26',
    originHandoffDate: '2026-07-28',
    localTipDay: '2026-07-29',
    originTipDay: '2026-07-29',
  });
  assert.deepEqual(r, { days: 2, basis: 'handoff' });
});

test('pickFreshnessGap: без дат HANDOFF падает на tip; совсем без дат → null', () => {
  const byTip = pickFreshnessGap({
    localHandoffDate: null,
    originHandoffDate: '2026-07-28',
    localTipDay: '2026-07-26',
    originTipDay: '2026-07-29',
  });
  assert.deepEqual(byTip, { days: 3, basis: 'tip' });
  assert.equal(
    pickFreshnessGap({ localHandoffDate: null, originHandoffDate: null, localTipDay: null, originTipDay: null }),
    null,
  );
});

// ─── чистые функции штампов ──────────────────────────────────────────────────────

test('ruDays: русское склонение (1 день, 2 дня, 5 дней, 11 дней, 21 день)', () => {
  assert.equal(ruDays(1), '1 день');
  assert.equal(ruDays(2), '2 дня');
  assert.equal(ruDays(5), '5 дней');
  assert.equal(ruDays(11), '11 дней');
  assert.equal(ruDays(21), '21 день');
  assert.equal(ruDays(104), '104 дня');
});

test('parseTipLine: «%h|%cI» → {sha, day}; мусор/пусто → null', () => {
  assert.deepEqual(parseTipLine('e57ad7ed|2026-07-29T07:46:10+03:00\n'), {
    sha: 'e57ad7ed',
    day: '2026-07-29',
  });
  assert.equal(parseTipLine('fatal: not a git repo'), null);
  assert.equal(parseTipLine(null), null);
});

// ─── collectStamps с инъекцией IO (без git и сети) ───────────────────────────────

/** Фикстурный run: git-команды по ключу; fetch управляется флагом online. */
function fixtureRun({ online, originHandoffMd }) {
  return (cmd, args) => {
    const key = args.join(' ');
    if (key === 'log -1 --format=%h|%cI HEAD') return 'aaaa111|2026-07-26T19:31:00+03:00';
    if (key === 'branch --show-current') return 'feat/x\n';
    if (key === 'fetch origin --quiet') return online ? '' : null;
    if (key === 'log -1 --format=%h|%cI origin/main') return 'bbbb222|2026-07-29T07:46:10+03:00';
    if (key === 'show origin/main:docs/HANDOFF.md') return originHandoffMd;
    return null;
  };
}

test('collectStamps online: дыра по датам HANDOFF локальный 26.07 ↔ origin 28.07', () => {
  const state = collectStamps({
    run: fixtureRun({ online: true, originHandoffMd: '# HANDOFF → 2026-07-28 · топ-10' }),
    readFile: () => '# HANDOFF → 2026-07-26 · очередь дня',
    mtimeDay: () => {
      throw new Error('mtime не должен зваться: дата есть в заголовке');
    },
  });
  assert.deepEqual(state.localTip, { sha: 'aaaa111', day: '2026-07-26' });
  assert.equal(state.branch, 'feat/x');
  assert.deepEqual(state.localHandoff, { date: '2026-07-26', source: 'из заголовка' });
  assert.equal(state.fetched, true);
  assert.deepEqual(state.originTip, { sha: 'bbbb222', day: '2026-07-29' });
  assert.equal(state.originHandoffDate, '2026-07-28');
  assert.deepEqual(state.gap, { days: 2, basis: 'handoff' });
});

test('collectStamps offline: fetch упал → origin-штампов нет, gap не считается', () => {
  const state = collectStamps({
    run: fixtureRun({ online: false }),
    readFile: () => '# HANDOFF → 2026-07-26',
    mtimeDay: () => null,
  });
  assert.equal(state.fetched, false);
  assert.equal(state.originTip, null);
  assert.equal(state.originHandoffDate, null);
  assert.equal(state.gap, null);
});

test('collectStamps: HANDOFF без даты в заголовке → фолбэк на mtime', () => {
  const state = collectStamps({
    run: fixtureRun({ online: true, originHandoffMd: null }),
    readFile: () => '# HANDOFF без даты',
    mtimeDay: () => '2026-07-25',
  });
  assert.deepEqual(state.localHandoff, { date: '2026-07-25', source: 'по mtime' });
});

// ─── renderStamps (чистый рендер) ────────────────────────────────────────────────

function fullState(overrides = {}) {
  return {
    localTip: { sha: 'aaaa111', day: '2026-07-26' },
    branch: 'feat/x',
    localHandoff: { date: '2026-07-26', source: 'из заголовка' },
    fetched: true,
    originTip: { sha: 'bbbb222', day: '2026-07-29' },
    originHandoffDate: '2026-07-28',
    gap: { days: 2, basis: 'handoff' },
    ...overrides,
  };
}

test('renderStamps: дыра ≥1 день → строка «⚠ ДЫРА N дней» с указанием читать origin', () => {
  const md = renderStamps(fullState());
  assert.match(md, /⚠ ДЫРА 2 дня: локальное дерево отстало от origin\/main \(по датам HANDOFF\)/);
  assert.match(md, /читать origin\/main:docs\/HANDOFF\.md/);
  assert.match(md, /локальное дерево: tip `aaaa111` от 2026-07-26, ветка `feat\/x`/);
  assert.match(md, /локальный docs\/HANDOFF\.md: 2026-07-26 \(из заголовка\)/);
  assert.match(md, /origin\/main: tip `bbbb222` от 2026-07-29/);
  assert.match(md, /origin\/main:docs\/HANDOFF\.md: 2026-07-28/);
});

test('renderStamps: дыры нет (0 дней) → спокойная строка, без «⚠ ДЫРА»', () => {
  const md = renderStamps(fullState({ gap: { days: 0, basis: 'handoff' } }));
  assert.match(md, /свежесть: дыры нет/);
  assert.doesNotMatch(md, /ДЫРА/);
});

test('renderStamps offline: «штампы только локальные», origin-строк нет', () => {
  const md = renderStamps(fullState({ fetched: false, originTip: null, originHandoffDate: null, gap: null }));
  assert.match(md, /⚠ offline: git fetch origin не прошёл — штампы только локальные/);
  assert.doesNotMatch(md, /origin\/main: tip/);
  assert.doesNotMatch(md, /ДЫРА/);
});

test('renderStamps: деградация — нет git и нет HANDOFF → «н/д», не бросает', () => {
  const md = renderStamps({
    localTip: null,
    branch: null,
    localHandoff: null,
    fetched: false,
    originTip: null,
    originHandoffDate: null,
    gap: null,
  });
  assert.match(md, /локальное дерево: н\/д/);
  assert.match(md, /локальный docs\/HANDOFF\.md: н\/д \(файла нет\)/);
});

test('renderStamps: детерминизм — одинаковый state → побайтово одинаковый выход', () => {
  assert.equal(renderStamps(fullState()), renderStamps(fullState()));
});
