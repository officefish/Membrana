/**
 * Зубы книги сделанного (b2 `ritual-reads-done-work`). Каждый зуб несёт порчу: тот же вход с
 * одним сдвинутым полем обязан менять исход. Прогон: `node --test scripts/lib/review-done-ledger.test.mjs`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDoneLedger, dayOf, formatDoneLedger, LEDGER_STATUS, prRefsIn } from './review-done-ledger.mjs';

/** Живой случай 27.09 в миниатюре. */
const PRS = [
  { pr: 2488, mergedDay: '2026-09-27', subject: 'feat(media): массовый вывоз проб (#2488)', changedLines: 1340 },
  { pr: 2489, mergedDay: '2026-09-27', subject: 'feat(sample-library): окно «перенести все» (#2489)', changedLines: 2568 },
  { pr: 2505, mergedDay: '2026-09-28', subject: 'feat(sample-library): страницы по 40 (#2505)', changedLines: 1243 },
];
const ISSUES = [
  { number: 2492, title: 'Две подписи moveSamplesBatch в #2488 и #2489', body: '…', createdAt: '2026-09-27T12:07:37Z', state: 'OPEN' },
  { number: 2493, title: 'Набор причин чеканится дважды', body: 'Адреса (ветка …, #2488, голова 135e406b)', createdAt: '2026-09-27T12:08:33Z', state: 'OPEN' },
  { number: 2497, title: '745 строк окна продублированы', body: 'PR #2489 завёл окно двумя носителями', createdAt: '2026-09-27T14:12:01Z', state: 'OPEN' },
  { number: 2496, title: 'совет в плашке врёт', body: 'Влито в PR #2489.', createdAt: '2026-09-27T14:10:40Z', state: 'CLOSED' },
];

test('живой случай: #2488 → #2492 #2493, #2489 → #2492 #2496 #2497, #2505 — не заведён', () => {
  const { entries } = buildDoneLedger({ prs: PRS, issues: ISSUES });
  const by = Object.fromEntries(entries.map((e) => [e.pr, e]));
  assert.deepEqual(by[2488].tickets.map((t) => t.number), [2492, 2493]);
  assert.deepEqual(by[2489].tickets.map((t) => t.number), [2492, 2496, 2497]);
  assert.equal(by[2505].status, LEDGER_STATUS.NOT_TICKETED);
  assert.equal(by[2488].status, LEDGER_STATUS.TICKETED);
});

test('ПОРЧА: билет, созданный ДО дня мерджа, результатом разбора не считается', () => {
  const early = ISSUES.map((i) => (i.number === 2493 ? { ...i, createdAt: '2026-09-26T23:59:59Z' } : i));
  const { entries } = buildDoneLedger({ prs: PRS, issues: early });
  const e = entries.find((x) => x.pr === 2488);
  assert.deepEqual(e.tickets.map((t) => t.number), [2492], '2493 до мерджа выпал; 2492 остался');
  // Тот же день мерджа — считается: «не раньше» включает день.
  const sameDay = buildDoneLedger({ prs: PRS, issues: ISSUES }).entries.find((x) => x.pr === 2488);
  assert.equal(sameDay.tickets.length, 2);
});

test('ПОРЧА: #24880 в теле — не ссылка на #2488; билет сам на себя не ссылается', () => {
  const issues = [
    { number: 9001, title: 'чужой', body: 'см. #24880 и #12488', createdAt: '2026-09-28T10:00:00Z' },
    { number: 2488, title: 'билет с тем же номером, что PR', body: 'ссылка на #2488', createdAt: '2026-09-28T10:00:00Z' },
  ];
  const { entries } = buildDoneLedger({ prs: PRS, issues });
  assert.equal(entries.find((x) => x.pr === 2488).status, LEDGER_STATUS.NOT_TICKETED);
});

test('prRefsIn: границы номера', () => {
  assert.deepEqual([...prRefsIn('в #2488 и (#2489), хвост #24880, x#12, url/pull/7')].sort((a, b) => a - b), [2488, 2489, 24880]);
  assert.deepEqual([...prRefsIn(null)], []);
  assert.deepEqual([...prRefsIn('##5 #a')], []);
});

test('PR не oversized — в книгу не входит (мерка одна: isSegmentOversized), но виден числом', () => {
  const prs = [...PRS, { pr: 2503, mergedDay: '2026-09-28', subject: 'small', changedLines: 373 }];
  const { entries, dropped } = buildDoneLedger({ prs, issues: ISSUES });
  assert.equal(entries.some((e) => e.pr === 2503), false);
  assert.equal(dropped.notOversized, 1);
  // Порча мерки: 400 ровно — не oversized (граница строгая, как у ревью).
  const edge = buildDoneLedger({ prs: [{ pr: 1, mergedDay: '2026-09-28', changedLines: 400 }], issues: [] });
  assert.equal(edge.entries.length, 0);
  const over = buildDoneLedger({ prs: [{ pr: 1, mergedDay: '2026-09-28', changedLines: 401 }], issues: [] });
  assert.equal(over.entries.length, 1);
});

test('отброшенное не молчит: PR без номера, без дня мерджа; билет без даты — числом', () => {
  const { entries, dropped } = buildDoneLedger({
    prs: [{ pr: null, mergedDay: '2026-09-28', changedLines: 900 }, { pr: 5, mergedDay: 'вчера', changedLines: 900 }, { pr: 6, mergedDay: '2026-09-28T10:00:00Z', changedLines: 900 }],
    issues: [{ number: 7, body: '#6', createdAt: undefined }],
  });
  assert.deepEqual(dropped, { noPr: 1, badMergedDay: 1, notOversized: 0, issuesWithoutDay: 1 });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].mergedDay, '2026-09-28', 'ISO-момент сведён к дню');
  assert.equal(dayOf('2026-9-8'), null);
});

test('порядок: свежие мерджи выше, билеты по дате создания', () => {
  const { entries } = buildDoneLedger({ prs: PRS, issues: ISSUES });
  assert.deepEqual(entries.map((e) => e.pr), [2505, 2489, 2488]);
  assert.deepEqual(entries.find((e) => e.pr === 2489).tickets.map((t) => t.number), [2492, 2496, 2497]);
});


test('formatDoneLedger: показывает носители результата и не выдумывает CLOSURE', () => {
  const { entries } = buildDoneLedger({
    prs: [
      {
        pr: 2544,
        mergedDay: '2026-10-01',
        subject: 'docs: personas source phase1 (#2544)',
        changedLines: 900,
        files: ['docs/sprint/cut/personas-source-phase1.json', 'docs/discussions/personas-source-phase1-report.md'],
      },
    ],
    issues: [],
  });
  assert.equal(entries[0].resultFacts.length, 2);
  const text = formatDoneLedger({ entries, dropped: { noPr: 0, badMergedDay: 0, notOversized: 0, issuesWithoutDay: 0 } });
  assert.match(text, /носители результата:/u);
  assert.match(text, /personas-source-phase1-report\.md/u);
  assert.match(text, /CLOSURE в диффе не найден/u);
});
test('formatDoneLedger: заведённые названы билетами, незаведённые — словами; пустая книга не молчит', () => {
  const text = formatDoneLedger(buildDoneLedger({ prs: PRS, issues: ISSUES }), { sinceDay: '2026-09-22' });
  assert.match(text, /\*\*#2488\*\* \(2026-09-27 · 1340 строк\)/u);
  assert.match(text, /→ разбор заведён билетами: #2492 \(2026-09-27, OPEN\), #2493 \(2026-09-27, OPEN\)/u);
  assert.match(text, /\*\*#2505\*\*[^\n]*\n {2}→ разбор не заведён/u);
  assert.match(text, /Итого: 3 oversized-PR, разбор заведён у 2, не заведён у 1/u);
  assert.match(text, /Окно: мерджи с 2026-09-22/u);
  assert.match(text, /не снимает PR с очереди/u);
  assert.match(formatDoneLedger(buildDoneLedger({ prs: [], issues: [] })), /oversized-PR в окне нет/u);
});
