import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  affectedSubscribers,
  buildGraph,
  checkAcyclic,
  checkDecorrelation,
  checkDerivedIntegrity,
  checkInvariants,
  checkParentsExist,
  checkOwnerEvidence,
  checkPredicateDecay,
  checkSubscribers,
  evidenceKind,
  computeStale,
  hasError,
  independentPremises,
  isAfter,
  originOf,
  radiusOfBreak,
} from './lib/truth-graph.mjs';

/** Владельческий токен: без parents, держится на слове владельца. */
const owner = (id, extra = {}) => ({
  id,
  claim: `claim:${id}`,
  class: 'owner',
  parents: [],
  status: 'active',
  source: { kind: 'owner', date: '2026-07-17' },
  ...extra,
});

/** Выведенный: parents = полный список посылок-токенов, premisesUsed = + предикаты. */
const derived = (id, parents, extra = {}) => ({
  id,
  claim: `claim:${id}`,
  class: 'derived',
  parents,
  status: 'active',
  source: { kind: 'deduction', premisesUsed: [...parents] },
  ...extra,
});

const reg = (tokens) => buildGraph({ tokens });

// ── I1 ацикличность ──────────────────────────────────────────────────────────

test('I1: цикл ловится — токен, выведенный из самого себя, доказывает сам себя', () => {
  const g = reg([derived('a', ['b']), derived('b', ['a'])]);
  const v = checkAcyclic(g);
  assert.ok(v.length > 0, 'цикл не пойман');
  assert.equal(v[0].rule, 'I1');
  assert.match(v[0].message, /цикл/u);
  assert.ok(hasError(v));
});

test('I1: длинный цикл через три узла тоже ловится', () => {
  const g = reg([derived('a', ['c']), derived('b', ['a']), derived('c', ['b'])]);
  assert.ok(checkAcyclic(g).length > 0);
});

test('I1: честный DAG проходит', () => {
  const g = reg([owner('root'), derived('mid', ['root']), derived('leaf', ['mid'])]);
  assert.deepEqual(checkAcyclic(g), []);
});

test('I1: ромб (два пути к одному предку) — не цикл', () => {
  const g = reg([owner('r'), derived('l', ['r']), derived('m', ['r']), derived('t', ['l', 'm'])]);
  assert.deepEqual(checkAcyclic(g), []);
});

// ── I2 существование узла ────────────────────────────────────────────────────

test('I2: висячий parent ловится — правило отзыва указывает в пустоту', () => {
  const g = reg([derived('a', ['ghost'])]);
  const v = checkParentsExist(g);
  assert.equal(v.length, 1);
  assert.equal(v[0].rule, 'I2');
  assert.match(v[0].message, /ghost/u);
  assert.ok(hasError(v));
});

test('I2: живой parent проходит', () => {
  assert.deepEqual(checkParentsExist(reg([owner('r'), derived('a', ['r'])])), []);
});

// ── I3 ложная посылка + контрабанда/лишняя посылка ───────────────────────────

test('I3: сломанный родитель, живой потомок — каскад не сработал', () => {
  const g = reg([owner('r', { status: 'revoked' }), derived('a', ['r'])]);
  const v = checkDerivedIntegrity(g);
  assert.equal(v.length, 1);
  assert.equal(v[0].rule, 'I3');
  assert.match(v[0].message, /сломан/u);
});

test('I3: родитель отозван и потомок отозван — норма', () => {
  const g = reg([owner('r', { status: 'revoked' }), derived('a', ['r'], { status: 'revoked' })]);
  assert.deepEqual(checkDerivedIntegrity(g), []);
});

test('I3: КОНТРАБАНДА — посылка использована, но не в parents (лжёт о выводе)', () => {
  const g = reg([
    owner('r'),
    owner('hidden'),
    { ...derived('a', ['r']), source: { kind: 'deduction', premisesUsed: ['r', 'hidden'] } },
  ]);
  const v = checkDerivedIntegrity(g);
  assert.equal(v.filter((x) => /КОНТРАБАНДА/u.test(x.message)).length, 1);
  assert.ok(hasError(v));
});

test('I3: ЛИШНЯЯ ПОСЫЛКА — parent не участвует в выводе (лжёт об отзыве)', () => {
  const g = reg([
    owner('r'),
    owner('unrelated'),
    { ...derived('a', ['r', 'unrelated']), source: { kind: 'deduction', premisesUsed: ['r'] } },
  ]);
  const v = checkDerivedIntegrity(g);
  const found = v.filter((x) => /ЛИШНЯЯ/u.test(x.message));
  assert.equal(found.length, 1);
  assert.match(found[0].message, /unrelated/u);
});

test('I3: предикат использован, но не объявлен НИГДЕ — ловится', () => {
  const g = reg([
    owner('r'),
    { ...derived('a', ['r']), source: { kind: 'deduction', premisesUsed: ['r', 'predicate:p1'] } },
  ]);
  assert.equal(checkDerivedIntegrity(g).filter((x) => /не объявлен нигде/u.test(x.message)).length, 1);
});

test('I3: предикат объявлен СОСЕДОМ и используется по id — норма (найдено на живом реестре 17.07)', () => {
  const g = reg([
    owner('r'),
    {
      ...derived('declarer', ['r']),
      predicates: [{ id: 'shared', cmd: 'yarn studio:build && grep Палитра client-dist' }],
      source: { kind: 'deduction', premisesUsed: ['r', 'predicate:shared'] },
    },
    { ...derived('borrower', ['r']), source: { kind: 'deduction', premisesUsed: ['r', 'predicate:shared'] } },
  ]);
  assert.deepEqual(checkDerivedIntegrity(g), [], 'заимствование предиката по id — не ошибка');
});

test('I3: предикат без команды — хранит ответ, а не способ перепроверки', () => {
  const g = reg([
    owner('r'),
    {
      ...derived('a', ['r']),
      predicates: [{ id: 'p1', verified: '2026-07-17' }],
      source: { kind: 'deduction', premisesUsed: ['r', 'predicate:p1'] },
    },
  ]);
  assert.equal(checkDerivedIntegrity(g).filter((x) => /без команды/u.test(x.message)).length, 1);
});

test('I3: ДЕКОРАЦИЯ — предикат объявлен, но не используется НИ ОДНИМ токеном (warn)', () => {
  const g = reg([
    owner('r'),
    {
      ...derived('a', ['r']),
      predicates: [{ id: 'p1', cmd: 'echo 1' }],
      source: { kind: 'deduction', premisesUsed: ['r'] },
    },
  ]);
  const v = checkDerivedIntegrity(g);
  const dec = v.filter((x) => /ДЕКОРАЦИЯ/u.test(x.message));
  assert.equal(dec.length, 1);
  assert.equal(dec[0].severity, 'warn');
  assert.equal(hasError(dec), false);
});

test('I3: честный derived с предикатом проходит', () => {
  const g = reg([
    owner('r'),
    {
      ...derived('a', ['r']),
      predicates: [{ id: 'p1', cmd: 'echo 1' }],
      source: { kind: 'deduction', premisesUsed: ['r', 'predicate:p1'] },
    },
  ]);
  assert.deepEqual(checkDerivedIntegrity(g), []);
});

// ── I4 декоррелированность (защита от эхо-камеры) ────────────────────────────

test('I4: две посылки с общим origin-hash = ОДНО свидетельство (урок 16.07)', () => {
  const snap = { kind: 'owner', date: '2026-07-06', origin: 'snapshot@2026-07-06' };
  const g = reg([
    owner('echo1', { source: snap }),
    owner('echo2', { source: snap }),
    derived('magistral', ['echo1', 'echo2']),
  ]);
  assert.equal(independentPremises(g, 'magistral'), 1, 'эхо посчитано за консенсус');
  const v = checkDecorrelation(g);
  assert.equal(v.length, 1);
  assert.equal(v[0].rule, 'I4');
  assert.match(v[0].message, /ЭХО: заявлено 2 посылок, независимых 1/u);
  assert.equal(v[0].severity, 'warn');
});

test('I4: три отражения одного снимка — ровно случай MAIN_DAY_ISSUE 16.07', () => {
  const snap = { kind: 'owner', date: '2026-07-06', origin: 'detection-planning-priorities.mjs@2026-07-06' };
  const g = reg([
    owner('plan', { source: snap }),
    owner('standup', { source: snap }),
    owner('foresight', { source: snap }),
    derived('verdict', ['plan', 'standup', 'foresight']),
  ]);
  assert.equal(independentPremises(g, 'verdict'), 1);
});

test('I4: независимые посылки не схлопываются', () => {
  const g = reg([
    owner('a', { source: { kind: 'owner', origin: 'source-a' } }),
    owner('b', { source: { kind: 'owner', origin: 'source-b' } }),
    derived('c', ['a', 'b']),
  ]);
  assert.equal(independentPremises(g, 'c'), 2);
  assert.deepEqual(checkDecorrelation(g), []);
});

test('I4: владелец без origin-hash — самостоятельное свидетельство', () => {
  const g = reg([owner('a'), owner('b'), derived('c', ['a', 'b'])]);
  assert.equal(independentPremises(g, 'c'), 2);
});

test('I4: одна посылка — проверять нечего', () => {
  assert.deepEqual(checkDecorrelation(reg([owner('r'), derived('a', ['r'])])), []);
});

test('originOf: hash источника, иначе null', () => {
  assert.match(String(originOf(owner('a', { source: { kind: 'owner', origin: 'src' } }))), /^hash:[0-9a-f]{7}$/u);
  assert.equal(originOf(owner('b')), null);
});

// ── свежесть по git-факту ────────────────────────────────────────────────────

test('computeStale: тронули то, на чём факт стоит, ПОСЛЕ проверки → горячий', () => {
  const g = reg([
    {
      ...derived('a', []),
      predicates: [{ id: 'p', cmd: 'x', verified: '2026-07-17', touches: ['scripts/studio-build.mjs'] }],
      source: { kind: 'deduction', premisesUsed: ['predicate:p'] },
    },
  ]);
  const stale = computeStale(g, () => '2026-07-18');
  assert.equal(stale.length, 1);
  assert.equal(stale[0].id, 'a');
  assert.match(stale[0].reason, /тронут 2026-07-18 после проверки 2026-07-17/u);
});

test('computeStale: общий предикат протух → горячи ВСЕ пользователи, не только объявивший', () => {
  const g = reg([
    owner('r'),
    {
      ...derived('declarer', ['r']),
      predicates: [{ id: 'shared', cmd: 'x', verified: '2026-07-17', touches: ['scripts/studio-build.mjs'] }],
      source: { kind: 'deduction', premisesUsed: ['r', 'predicate:shared'] },
    },
    { ...derived('borrower1', ['r']), source: { kind: 'deduction', premisesUsed: ['r', 'predicate:shared'] } },
    { ...derived('borrower2', ['r']), source: { kind: 'deduction', premisesUsed: ['r', 'predicate:shared'] } },
  ]);
  const stale = computeStale(g, () => '2026-07-18');
  assert.deepEqual(
    stale.map((s) => s.id).sort(),
    ['borrower1', 'borrower2', 'declarer'],
    'заимствующие остались свежими на протухшем основании',
  );
});

test('computeStale: тронули ДО проверки → факт свежий', () => {
  const g = reg([
    {
      ...derived('a', []),
      predicates: [{ id: 'p', cmd: 'x', verified: '2026-07-17', touches: ['f.mjs'] }],
      source: { kind: 'deduction', premisesUsed: ['predicate:p'] },
    },
  ]);
  assert.deepEqual(computeStale(g, () => '2026-07-16'), []);
});

test('computeStale: отозванный не проверяется — он уже мёртв', () => {
  const g = reg([
    {
      ...derived('a', [], { status: 'revoked' }),
      predicates: [{ id: 'p', cmd: 'x', verified: '2026-07-17', touches: ['f.mjs'] }],
    },
  ]);
  assert.deepEqual(computeStale(g, () => '2026-07-18'), []);
});

test('computeStale: git молчит про путь (null) → не горячий, а не «протух»', () => {
  const g = reg([
    {
      ...derived('a', []),
      predicates: [{ id: 'p', cmd: 'x', verified: '2026-07-17', touches: ['f.mjs'] }],
    },
  ]);
  assert.deepEqual(computeStale(g, () => null), []);
});

test('isAfter: тронули в ДЕНЬ проверки → свеж (строковое сравнение врало бы)', () => {
  assert.equal(isAfter('2026-07-17T05:00:00+03:00', '2026-07-17'), false, 'ложное «протух» вернулось');
  assert.equal('2026-07-17T05:00:00+03:00' > '2026-07-17', true, 'строковое сравнение и правда врёт — вот почему нужен isAfter');
});

test('isAfter: тронули на следующий день → протух', () => {
  assert.equal(isAfter('2026-07-18T00:01:00+03:00', '2026-07-17'), true);
});

test('isAfter: тронули раньше → свеж', () => {
  assert.equal(isAfter('2026-06-18T17:43:04+03:00', '2026-07-17'), false);
});

// ── I6 предикат обязан уметь протухнуть ──────────────────────────────────────

test('I6: предикат без touches — бессрочная «истина», ловится', () => {
  const g = reg([
    {
      ...derived('a', []),
      predicates: [{ id: 'p', cmd: 'echo', verified: '2026-07-17' }],
      source: { kind: 'deduction', premisesUsed: ['predicate:p'] },
    },
  ]);
  const v = checkPredicateDecay(g);
  assert.equal(v.length, 1);
  assert.equal(v[0].rule, 'I6');
  assert.match(v[0].message, /не может протухнуть/u);
  assert.ok(hasError(v));
});

test('I6: предикат без verified — свежесть невычислима', () => {
  const g = reg([
    {
      ...derived('a', []),
      predicates: [{ id: 'p', cmd: 'echo', touches: ['f.mjs'] }],
      source: { kind: 'deduction', premisesUsed: ['predicate:p'] },
    },
  ]);
  assert.equal(checkPredicateDecay(g).filter((x) => /без verified/u.test(x.message)).length, 1);
});

test('I6: полный предикат проходит', () => {
  const g = reg([
    {
      ...derived('a', []),
      predicates: [{ id: 'p', cmd: 'echo', verified: '2026-07-17', touches: ['f.mjs'] }],
      source: { kind: 'deduction', premisesUsed: ['predicate:p'] },
    },
  ]);
  assert.deepEqual(checkPredicateDecay(g), []);
});

// ── I5 подписчики ────────────────────────────────────────────────────────────

test('I5: подписчик читает призрака — охлаждается по пустоте', () => {
  const g = reg([owner('r')]);
  const v = checkSubscribers(g, { subscribers: [{ process: 'main-day-issue', reads: ['ghost'], onBreak: 'block' }] });
  assert.equal(v.length, 1);
  assert.equal(v[0].rule, 'I5');
  assert.match(v[0].message, /призраку/u);
});

test('I5: кривой onBreak ловится', () => {
  const g = reg([owner('r')]);
  const v = checkSubscribers(g, { subscribers: [{ process: 'p', reads: ['r'], onBreak: 'maybe' }] });
  assert.equal(v.filter((x) => /onBreak/u.test(x.message)).length, 1);
});

test('affectedSubscribers: слом токена бьёт по читателю ЧЕРЕЗ потомка', () => {
  const g = reg([owner('root'), derived('mid', ['root'])]);
  const manifest = { subscribers: [{ process: 'main-day-issue', reads: ['mid'], onBreak: 'block' }] };
  const a = affectedSubscribers(g, manifest, ['root']);
  assert.equal(a.length, 1);
  assert.equal(a[0].process, 'main-day-issue');
  assert.deepEqual(a[0].via, ['mid'], 'каскад до подписчика не дошёл');
});

test('affectedSubscribers: не читающий процесс не задет', () => {
  const g = reg([owner('a'), owner('b')]);
  const manifest = { subscribers: [{ process: 'p', reads: ['b'], onBreak: 'block' }] };
  assert.deepEqual(affectedSubscribers(g, manifest, ['a']), []);
});

// ── радиус поражения ─────────────────────────────────────────────────────────

test('radiusOfBreak: отзыв корня утаскивает всю цепочку', () => {
  const g = reg([owner('root'), derived('mid', ['root']), derived('leaf', ['mid'])]);
  assert.deepEqual(radiusOfBreak(g, 'root').sort(), ['leaf', 'mid']);
});

test('radiusOfBreak: лист никого не тянет', () => {
  const g = reg([owner('root'), derived('leaf', ['root'])]);
  assert.deepEqual(radiusOfBreak(g, 'leaf'), []);
});

test('radiusOfBreak: несущий токен — цена решения видна ДО отзыва', () => {
  const g = reg([
    owner('studio-shipped'),
    derived('a', ['studio-shipped']),
    derived('b', ['studio-shipped']),
    derived('c', ['studio-shipped']),
  ]);
  assert.equal(radiusOfBreak(g, 'studio-shipped').length, 3);
});

test('radiusOfBreak: ромб не даёт дублей', () => {
  const g = reg([owner('r'), derived('l', ['r']), derived('m', ['r']), derived('t', ['l', 'm'])]);
  assert.deepEqual(radiusOfBreak(g, 'r').sort(), ['l', 'm', 't']);
});

// ── сводно ───────────────────────────────────────────────────────────────────

test('checkInvariants: владельческий токен без указателя — WARN, поток не блокируется', () => {
  const g = reg([owner('r'), derived('a', ['r'])]);
  const v = checkInvariants(g);
  assert.equal(v.length, 1, 'ожидался ровно I7 на владельце без utterance');
  assert.equal(v[0].rule, 'I7');
  assert.equal(v[0].severity, 'warn');
  assert.equal(hasError(v), false, 'слабый токен НЕ должен ронять поток (решение владельца 17.07)');
});

test('checkInvariants: владелец с указателем — граф чист', () => {
  const g = reg([
    owner('r', { source: { kind: 'owner', date: '2026-07-17', utterance: { sessionId: 's', uuid: 'u' } } }),
    derived('a', ['r']),
  ]);
  assert.deepEqual(checkInvariants(g), []);
  assert.equal(hasError(checkInvariants(g)), false);
});

test('I7: указатель = sessionId + uuid; одной цитаты мало (копию можно сочинить)', () => {
  const onlyQuote = reg([owner('r', { source: { kind: 'owner', utterance: { quote: 'я так сказал' } } })]);
  assert.equal(checkOwnerEvidence(onlyQuote).length, 1, 'цитата без указателя принята за доказательство');
  const withPointer = reg([owner('r', { source: { kind: 'owner', utterance: { sessionId: 's', uuid: 'u' } } })]);
  assert.deepEqual(checkOwnerEvidence(withPointer), []);
});

test('evidenceKind: указатель / предикат / проба / ничего', () => {
  const g = reg([
    owner('u', { source: { kind: 'owner', utterance: { sessionId: 's', uuid: 'x' } } }),
    owner('p', { probe: { cmd: 'curl', verified: '2026-07-16' } }),
    owner('none'),
  ]);
  assert.equal(evidenceKind(g, g.byId.get('u')), 'utterance');
  assert.equal(evidenceKind(g, g.byId.get('p')), 'probe');
  assert.equal(evidenceKind(g, g.byId.get('none')), null);
});

test('checkInvariants: битый граф ловится всеми правилами разом', () => {
  const g = reg([derived('a', ['ghost']), derived('x', ['y']), derived('y', ['x'])]);
  const v = checkInvariants(g);
  const rules = new Set(v.map((x) => x.rule));
  assert.ok(rules.has('I1'), 'цикл не пойман');
  assert.ok(rules.has('I2'), 'висячая ссылка не поймана');
  assert.ok(hasError(v));
});

test('buildGraph: пустой реестр не падает', () => {
  const g = buildGraph({});
  assert.deepEqual(checkInvariants(g), []);
  assert.deepEqual(radiusOfBreak(g, 'нет-такого'), []);
  assert.equal(independentPremises(g, 'нет-такого'), 0);
});
