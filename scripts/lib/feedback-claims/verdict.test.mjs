/**
 * Зубы вердикта (блок b1, карточка feedback-claims-code-probe #1795).
 *
 * Два вещдока 07.08 — hard, один — soft-находка «реестр протух», прочее не красное.
 * Здесь же держится асимметрия: «нашли по одному законному адресу» доказывает, «не нашли
 * ни по одному из нескольких» — только сомнение (профилактика 03.08).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ATOM_CLASSES } from './atoms.mjs';
import {
  decidedInOf,
  formatClaimsReport,
  hasHardViolation,
  OUTCOMES,
  outcomeLabel,
  verdictFor,
  verdictsFor,
} from './verdict.mjs';

const symbolAtom = (token) => ({ token, classes: [ATOM_CLASSES.SYMBOL] });

// b4 ritual-reads-decisions: решённость — причина в строке, не пятый исход.
const LEDGER_29_09 = {
  decisions: [{
    sprintId: 'sample-library-paging-a11y', key: '//decisions', path: 'docs/sprint/cut/sample-library-paging-a11y.json',
    ratifiedAt: '2026-09-29T15:13:04+03:00',
    text: 'Три решения: (1) aria-current с индикатора СНЯТЬ, индикатор становится role=status; (2) правило фокуса; (3) стрелок не заводить.',
  }],
  closedSprints: [{ sprintId: 'batch-collection-run-contour', status: 'pass', closedDay: '2026-09-29', card: 'active', stale: true }],
};

test('b4: decidedInOf находит токен в тексте решения и id закрытого спринта; печатает полный якорь носителя', () => {
  assert.deepEqual(decidedInOf('aria-current', LEDGER_29_09), [
    'решение docs/sprint/cut/sample-library-paging-a11y.json#//decisions (ратифицировано 2026-09-29T15:13:04+03:00)',
  ]);
  assert.deepEqual(decidedInOf('batch-collection-run-contour', LEDGER_29_09), [
    'спринт закрыт 2026-09-29 (pass), карточка active — долг закрытия',
  ]);
  assert.deepEqual(decidedInOf('NIGHT_RUN_MAX_AGE_MS', LEDGER_29_09), [], 'решение вне спринтов ведомость не несёт — предел носителя');
  assert.deepEqual(decidedInOf('(1)', LEDGER_29_09), [], 'короткий токен не ищется, хоть и есть в тексте');
  assert.deepEqual(decidedInOf('aria-current', null), []);
});

test('b4: вердикт по aria-current (card|doc, обоих нет) остаётся soft, а причина несёт «решено: …»', () => {
  const atom = { token: 'aria-current', classes: [ATOM_CLASSES.CARD, ATOM_CLASSES.DOC] };
  const withDecision = verdictFor(atom, { cardFound: false, docExists: false, decidedIn: decidedInOf('aria-current', LEDGER_29_09), sha: 'abc' });
  assert.equal(withDecision.outcome, OUTCOMES.SOFT, 'список исходов не расширен');
  assert.match(withDecision.reason, /карточки в реестре нет; документа нет @abc · решено: решение docs\/sprint\/cut\/sample-library-paging-a11y\.json#\/\/decisions/u);
  // ПОРЧА: без decidedIn строки нет — прежняя причина слово в слово.
  const without = verdictFor(atom, { cardFound: false, docExists: false, sha: 'abc' });
  assert.equal(without.outcome, OUTCOMES.SOFT);
  assert.doesNotMatch(without.reason, /решено/u);
  assert.equal(withDecision.reason.startsWith(without.reason), true);
  // `null` — «не узнали», не «не решено»: хвоста тоже нет.
  assert.doesNotMatch(verdictFor(atom, { cardFound: false, docExists: false, decidedIn: null }).reason, /решено/u);
  // Хвост есть и у holds: карточка закрытого спринта в реестре active — читатель видит долг.
  const card = verdictFor({ token: 'batch-collection-run-contour', classes: [ATOM_CLASSES.CARD] }, { cardFound: true, cardStatus: 'active', decidedIn: decidedInOf('batch-collection-run-contour', LEDGER_29_09) });
  assert.equal(card.outcome, OUTCOMES.HOLDS);
  assert.match(card.reason, /· решено: спринт закрыт 2026-09-29 \(pass\), карточка active — долг закрытия/u);
  assert.deepEqual(Object.keys(OUTCOMES), ['HOLDS', 'HARD', 'SOFT', 'UNKNOWN'], 'закрытый список исходов не тронут');
});

test('вещдок 07.08: PromoDeclineReason — ноль вхождений при однозначном классе → hard', () => {
  const v = verdictFor(symbolAtom('PromoDeclineReason'), { symbolDecls: 0, sha: 'abcdef1234567890' });
  assert.equal(v.outcome, OUTCOMES.HARD);
  assert.equal(v.klass, ATOM_CLASSES.SYMBOL);
  assert.ok(v.addr.includes('packages/**/src/**'));
  assert.ok(v.reason.includes('@abcdef123456'));
});

test('существующий символ подтверждается вхождениями', () => {
  const v = verdictFor(symbolAtom('decideTransition'), { symbolDecls: 4 });
  assert.equal(v.outcome, OUTCOMES.HOLDS);
  assert.ok(v.reason.includes('4'));
});

test('вещдок 07.08: утверждение о клиентской части при отсутствии клиентских файлов в PR → hard', () => {
  const atom = { token: '#1776', classes: [ATOM_CLASSES.PR], clientSide: true };
  const v = verdictFor(atom, {
    prMerged: true,
    prFiles: [
      'packages/background-cabinet/src/domain/tariff-transition.ts',
      'packages/background-cabinet/src/modules/tariff/tariff.module.ts',
      'docs/tasks/registry.json',
    ],
  });
  assert.equal(v.outcome, OUTCOMES.HARD);
  assert.ok(v.reason.includes('клиентских нет'));
});

test('тот же PR без утверждения о слое красным не становится — гейт не домысливает', () => {
  const atom = { token: '#1776', classes: [ATOM_CLASSES.PR], clientSide: false };
  const v = verdictFor(atom, { prMerged: true, prFiles: ['packages/background-cabinet/src/x.ts'] });
  assert.equal(v.outcome, OUTCOMES.HOLDS);
});

test('клиентские файлы в PR подтверждают утверждение о слое', () => {
  const atom = { token: '#1900', classes: [ATOM_CLASSES.PR], clientSide: true };
  const v = verdictFor(atom, { prMerged: true, prFiles: ['apps/cabinet/src/ui/Promo.tsx'] });
  assert.equal(v.outcome, OUTCOMES.HOLDS);
  assert.ok(v.reason.includes('клиентских файлов в PR: 1'));
});

test('невлитый PR — unknown: содержимое из ствола не читается, а не «нет файлов»', () => {
  const atom = { token: '#9999', classes: [ATOM_CLASSES.PR], clientSide: true };
  const v = verdictFor(atom, { prMerged: false });
  assert.equal(v.outcome, OUTCOMES.UNKNOWN);
  assert.ok(v.reason.includes('не влит'));
});

test('вещдок 07.08: карточка active при доставленной работе → soft-находка «реестр протух», не hard', () => {
  const atom = { token: 'morning-gates-two-moments', classes: [ATOM_CLASSES.CARD] };
  const v = verdictFor(atom, { cardFound: true, cardStatus: 'active', cardDeliveredPr: 1766 });
  assert.equal(v.outcome, OUTCOMES.SOFT);
  assert.ok(v.reason.includes('РЕЕСТР ПРОТУХ'));
  assert.ok(v.reason.includes('1766'));
  assert.equal(hasHardViolation([v]), false);
});

test('неоднозначный класс без подтверждения даёт soft, а не hard: могли смотреть не туда (03.08)', () => {
  const atom = { token: 'MAIN_DAY_ISSUE', classes: [ATOM_CLASSES.DOC, ATOM_CLASSES.SYMBOL] };
  const v = verdictFor(atom, { docExists: false, symbolDecls: 0 });
  assert.equal(v.outcome, OUTCOMES.SOFT);
});

test('любой holds побеждает при неоднозначном классе', () => {
  const atom = { token: 'MAIN_DAY_ISSUE', classes: [ATOM_CLASSES.DOC, ATOM_CLASSES.SYMBOL] };
  const v = verdictFor(atom, { docExists: true, symbolDecls: 0 });
  assert.equal(v.outcome, OUTCOMES.HOLDS);
  assert.equal(v.klass, ATOM_CLASSES.DOC);
});

test('факт не добыт → unknown, и это не алерт (эталон drift-anchor-divergence #413)', () => {
  assert.equal(verdictFor(symbolAtom('anySymbol'), {}).outcome, OUTCOMES.UNKNOWN);
  assert.equal(verdictFor(symbolAtom('anySymbol'), { symbolDecls: null }).outcome, OUTCOMES.UNKNOWN);
  assert.equal(hasHardViolation([verdictFor(symbolAtom('anySymbol'), {})]), false);
});

test('opaque не имеет адреса и красным не бывает', () => {
  const v = verdictFor({ token: 'promo_revoked', classes: [ATOM_CLASSES.OPAQUE] }, {});
  assert.equal(v.outcome, OUTCOMES.UNKNOWN);
  assert.ok(v.addr.includes('адреса нет'));
});

test('пропавший файл и пропавший глагол — hard при однозначном классе', () => {
  const p = verdictFor({ token: 'scripts/nope.mjs', classes: [ATOM_CLASSES.PATH] }, { pathExists: false });
  assert.equal(p.outcome, OUTCOMES.HARD);
  const v = verdictFor({ token: 'yarn nope:verb', classes: [ATOM_CLASSES.VERB] }, { verbExists: false });
  assert.equal(v.outcome, OUTCOMES.HARD);
});

test('ядро тотально: пустой атом и пустые факты не бросают', () => {
  const v = verdictFor(undefined, undefined);
  assert.equal(v.outcome, OUTCOMES.UNKNOWN);
  assert.deepEqual(verdictsFor(undefined), []);
  assert.equal(hasHardViolation(undefined), false);
});

test('отчёт ставит нарушения сверху, метит их ТЕКСТОМ и не топит находку в holds', () => {
  const verdicts = [
    { token: 'okSymbol', line: 3, outcome: OUTCOMES.HOLDS, addr: 'a', reason: 'r' },
    { token: 'PromoDeclineReason', line: 37, outcome: OUTCOMES.HARD, addr: 'git grep', reason: 'ноль вхождений' },
    { token: 'card-x', line: 58, outcome: OUTCOMES.SOFT, addr: 'реестр', reason: 'РЕЕСТР ПРОТУХ' },
  ];
  const report = formatClaimsReport(verdicts);
  const body = report.split('\n');
  assert.ok(body[0].includes('1 не подтверждено'));
  assert.ok(body[0].includes('1 подтверждено'));
  const hardRow = body.findIndex((l) => l.includes('PromoDeclineReason'));
  const softRow = body.findIndex((l) => l.includes('card-x'));
  assert.ok(hardRow < softRow);
  assert.ok(report.includes('НЕ ПОДТВЕРЖДЕНО'));
  assert.equal(report.includes('okSymbol'), false);
  assert.ok(formatClaimsReport(verdicts, { includeHolds: true }).includes('okSymbol'));
});

test('пустой отчёт говорит прямо, а не молчит', () => {
  assert.ok(formatClaimsReport([]).includes('Ни одного утверждения'));
  assert.equal(outcomeLabel('нет такого'), '—');
});
