/**
 * Тесты двухгейтового утра (M3-G angelina-hostess) + #1233 (день / digest / ally).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  magistralChosen, swallowApproved, canSend, canSendAlly,
  sendIdempotencyKey, freezeTopThree, terminalSend,
  dayFresh, draftDigestOf, payloadMatchesDraft, todayIso,
  magistralMoment, magistralMomentFresh,
  chooseMagistralManually, manualChoiceIntact, snapshotDigest,
  swallowMoment, swallowMomentFresh, setSwallowMoment,
} from './lib/morning-gates.mjs';

const DAY = '2026-07-26';

const okState = () => ({
  day: DAY,
  // ADR-0024: у КАЖДОГО субъекта свой момент. Прежде свежесть обоих бралась из общего `day`;
  // после swallow-own-moment ласточка несёт момент в swallow.day.
  magistralChosenAt: DAY,
  magistral: 'task-b',
  magistralOptions: ['task-a', 'task-b', 'task-c'],
  swallow: { day: DAY, ownerAck: true, draftDigest: draftDigestOf('approved body') },
});

test('dayFresh: совпадение day/today; без day или чужой день — false', () => {
  assert.equal(dayFresh({ day: DAY }, DAY), true);
  assert.equal(dayFresh({}, DAY), false);
  assert.equal(dayFresh({ day: '2026-07-22' }, DAY), false);
  assert.equal(dayFresh({ day: DAY }, ''), false);
});

test('magistralChosen: требует сегодня; выбор ∈ снимок — true', () => {
  assert.equal(magistralChosen(okState(), DAY), true);
  // ADR-0024 сменил контракт: свежесть выбора живёт в СВОЁМ моменте, не в общем `day`.
  assert.equal(
    magistralChosen({ ...okState(), magistralChosenAt: '2026-07-22' }, DAY),
    false,
    'вчерашний ВЫБОР протух',
  );
  assert.equal(
    magistralChosen({ ...okState(), day: '2026-07-22' }, DAY),
    true,
    'чужой протухший день (ласточки) магистраль НЕ роняет — в этом и была починка',
  );
  assert.equal(magistralChosen({ magistral: 'ghost', magistralOptions: ['a'], magistralChosenAt: DAY }, DAY), false);
  assert.equal(magistralChosen({ magistralOptions: ['a'], magistralChosenAt: DAY }, DAY), false);
  assert.equal(magistralChosen({}, DAY), false);
});

test('swallowApproved: ack + digest + СВОЙ сегодняшний момент; вчерашний ack — false', () => {
  assert.equal(swallowApproved(okState(), DAY), true);
  const stale = okState();
  stale.swallow.day = '2026-07-22';
  assert.equal(swallowApproved(stale, DAY), false, 'ок от 22.07 не живёт 26.07');
  // Чужой `state.day` ласточку больше не трогает ни в какую сторону (swallow-own-moment).
  assert.equal(swallowApproved({ ...okState(), day: '2026-07-22' }, DAY), true, 'день заморозки — не момент ласточки');
  assert.equal(swallowApproved({ day: DAY, swallow: { day: DAY, ownerAck: true } }, DAY), false);
  assert.equal(swallowApproved({ day: DAY, swallow: { day: DAY, ownerAck: false, draftDigest: 'd' } }, DAY), false);
});

test('canSend: причина называется ПО СУБЪЕКТУ, а не одной строкой про общий день', () => {
  // ADR-0024 сменил контракт: прежде ранний выход по общему `day` давал ОДНУ причину
  // «состояние протухло» и скрывал, КОТОРЫЙ из двух гейтов виноват. Теперь каждый
  // сомножитель отвечает за себя.
  const staleState = okState();
  staleState.swallow.day = '2026-07-22';
  const stale = canSend(staleState, DAY);
  assert.equal(stale.ok, false);
  assert.equal(stale.blockedBy.length, 1, 'протух только черновик — магистраль не при чём');
  assert.match(stale.blockedBy[0], /swallow-send/u);

  const empty = canSend({}, DAY);
  assert.equal(empty.blockedBy.length, 2, 'пустое состояние — оба субъекта неизвестны');
  assert.match(empty.blockedBy.join(' '), /magistral/u);
  assert.match(empty.blockedBy.join(' '), /swallow-send/u);

  const one = canSend({ ...okState(), swallow: {} }, DAY);
  assert.equal(one.ok, false);
  assert.equal(one.blockedBy.length, 1);
  assert.match(one.blockedBy[0], /swallow/u);
  assert.equal(canSend(okState(), DAY).ok, true);
});

test('payloadMatchesDraft / canSendAlly: чужой файл не уходит', () => {
  const state = okState();
  assert.equal(payloadMatchesDraft(state, 'approved body'), true);
  assert.equal(payloadMatchesDraft(state, 'другой текст'), false);

  const ok = canSendAlly(state, DAY, 'approved body');
  assert.equal(ok.ok, true);

  const mismatch = canSendAlly(state, DAY, 'другой текст');
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.blockedBy.join(' '), /digest/u);

  const staleState = { ...state, swallow: { ...state.swallow, day: '2026-07-22' } };
  const stale = canSendAlly(staleState, DAY, 'approved body');
  assert.equal(stale.ok, false);
  assert.match(stale.blockedBy[0], /swallow-send: момент черновика/u);
});

test('canSendAlly: без magistral — ок (вечерний контур)', () => {
  const evening = {
    swallow: { day: DAY, ownerAck: true, draftDigest: draftDigestOf('evening note') },
  };
  assert.equal(canSend(evening, DAY).ok, false, 'утренний canSend всё ещё требует magistral');
  assert.equal(canSendAlly(evening, DAY, 'evening note').ok, true);
});

test('freezeTopThree: несёт day; снимок детерминирован', () => {
  const a = freezeTopThree([{ id: 'x' }, { id: 'y' }], DAY);
  const b = freezeTopThree([{ id: 'x' }, { id: 'y' }], DAY);
  assert.deepEqual(a, b);
  assert.equal(a.day, DAY);
  assert.equal(typeof todayIso(), 'string');
  assert.match(todayIso(), /^\d{4}-\d{2}-\d{2}$/u);
});

test('sendIdempotencyKey: по дню утра, не по попытке', () => {
  assert.equal(sendIdempotencyKey('p', '2026-07-21'), sendIdempotencyKey('p', '2026-07-21'));
  assert.notEqual(sendIdempotencyKey('p', '2026-07-21'), sendIdempotencyKey('p', '2026-07-22'));
});

test('terminalSend: блок → транспорт НЕ вызван; digest mismatch тоже блок', async () => {
  let calls = 0;
  const r = await terminalSend({}, 'p', DAY, { transport: async () => { calls += 1; } });
  assert.equal(r.sent, false);
  assert.equal(calls, 0);
  // ADR-0024: у пустого состояния первым называется субъект магистрали, а не общий день.
  assert.match(r.blockedBy.join(' '), /magistral/u);

  const badDigest = await terminalSend(okState(), 'not-approved', DAY, {
    transport: async () => { calls += 1; },
  });
  assert.equal(badDigest.sent, false);
  assert.equal(calls, 0);
  assert.match(badDigest.blockedBy.join(' '), /digest/u);
});

test('terminalSend: pass → один выстрел; повтор того же дня → duplicate no-op', async () => {
  let calls = 0;
  const io = { transport: async () => { calls += 1; }, sentKeys: new Set() };
  const r1 = await terminalSend(okState(), 'approved body', DAY, io);
  const r2 = await terminalSend(okState(), 'approved body', DAY, io);
  assert.equal(r1.sent, true);
  assert.equal(r2.sent, false);
  assert.equal(r2.duplicate, true);
  assert.equal(calls, 1);
});

test('magistralChosen: подмена options при frozenDigest — гейт закрыт (P2 #762)', () => {
  const { magistralOptions, frozenDigest, day } = freezeTopThree([{ id: 'a' }, { id: 'b' }, { id: 'c' }], DAY);
  const honest = { day, magistralChosenAt: day, magistral: 'b', magistralOptions, frozenDigest };
  assert.equal(magistralChosen(honest, DAY), true);
  const forged = { day, magistralChosenAt: day, magistral: 'ghost', magistralOptions: [...magistralOptions, 'ghost'], frozenDigest };
  assert.equal(magistralChosen(forged, DAY), false);
});

// ─── два субъекта — два момента (ADR-0024, долг #gates-state-magistral-carryover) ───
//
// Дефект: одно поле `day` обслуживало оба гейта. `swallow --draft` ставил day=today и
// магистрали не касался — утро, пошедшее к черновику мимо заморозки, получало сегодняшнюю
// дату при ВЧЕРАШНЕМ выборе. `status` докладывал ложный owner-choice, `canSend` считал
// предикат выполненным. Наблюдалось трижды, 05.08–07.08.

const TODAY = '2026-08-07';
const YESTERDAY = '2026-08-06';
const snapshot = (ids) => freezeTopThree(ids, TODAY);

test('ГЛАВНЫЙ случай: свежий черновик НЕ делает вчерашний выбор сегодняшним', () => {
  const state = {
    ...snapshot(['a', 'b']),
    magistral: 'a',
    magistralChosenAt: YESTERDAY, // выбор был вчера
    swallow: { day: TODAY, draftDigest: 'd', ownerAck: true }, // а черновик — сегодняшний
  };
  assert.equal(magistralChosen(state, TODAY), false, 'ложный owner-choice — ровно чинимый дефект');
  assert.equal(swallowApproved(state, TODAY), true, 'ласточка при этом законно сегодняшняя');
  const gate = canSend(state, TODAY);
  assert.equal(gate.ok, false);
  assert.match(gate.blockedBy.join(' '), /выбор не сегодняшний \(сделан 2026-08-06\)/);
});

test('момент магистрали читается отдельно от дня ласточки', () => {
  assert.equal(magistralMoment({ magistralChosenAt: TODAY }), TODAY);
  assert.equal(magistralMoment({ day: TODAY }), null, 'общий день моментом магистрали не является');
  assert.equal(magistralMoment({}), null);
  assert.equal(magistralMoment({ magistralChosenAt: '  ' }), null, 'пустая строка — не момент');
});

test('Р4: старое состояние без momenta читается как НЕИЗВЕСТНЫЙ, а не наследует day', () => {
  const legacy = { ...snapshot(['a']), magistral: 'a', day: TODAY, magistralChosenAt: undefined };
  assert.equal(magistralMomentFresh(legacy, TODAY), false, 'наследование воспроизвело бы дефект при починке');
  assert.equal(magistralChosen(legacy, TODAY), false);
  assert.match(canSend(legacy, TODAY).blockedBy.join(' '), /момент выбора неизвестен/);
});

test('оба момента сегодняшние — гейт открыт', () => {
  const state = {
    ...snapshot(['a', 'b']),
    magistral: 'a',
    magistralChosenAt: TODAY,
    swallow: { day: TODAY, draftDigest: 'd', ownerAck: true },
  };
  assert.equal(magistralChosen(state, TODAY), true);
  assert.equal(canSend(state, TODAY).ok, true);
});

test('обратный случай: выбор сегодняшний, а черновик вчерашний — блок ТОЛЬКО по ласточке', () => {
  const state = {
    ...snapshot(['a']),
    magistral: 'a',
    magistralChosenAt: TODAY,
    swallow: { day: YESTERDAY, draftDigest: 'd', ownerAck: true },
  };
  const gate = canSend(state, TODAY);
  assert.equal(gate.ok, false);
  assert.equal(gate.blockedBy.length, 1, 'магистраль не должна попасть под чужую протухлость');
  assert.match(gate.blockedBy[0], /swallow-send: черновик не сегодняшний/);
});

test('Р3: заморозка снимает момент выбора вместе с самим выбором', () => {
  const frozen = freezeTopThree(['x', 'y'], TODAY);
  assert.equal(frozen.magistralChosenAt, null, 'иначе выбор по ПРЕЖНЕМУ списку числился бы сегодняшним');
  assert.equal(frozen.day, TODAY);
});

test('canSend называет ОБА гейта раздельно, а не «состояние протухло» одной строкой', () => {
  const gate = canSend({ day: YESTERDAY }, TODAY);
  assert.equal(gate.blockedBy.length, 2, 'прежний ранний выход скрывал, КОТОРЫЙ из двух протух');
  assert.match(gate.blockedBy.join(' '), /magistral/);
  assert.match(gate.blockedBy.join(' '), /swallow-send/);
});

// ─── свой момент ласточки (ADR-0024, карточка-наследник swallow-own-moment) ─────────
//
// Долг 07.08: ласточка осталась на state.day, потому что то же поле читал вечерний гейт —
// один термин нёс два смысла в разных домах. Теперь subject «черновик дня» несёт момент
// в swallow.day, оба пути (утренний и вечерний) пишут его фасадами леммы.

test('момент ласточки читается из СВОЕГО поля; общий день моментом не является', () => {
  assert.equal(swallowMoment({ swallow: { day: TODAY } }), TODAY);
  assert.equal(swallowMoment({ day: TODAY }), null, 'день заморозки — не момент ласточки');
  assert.equal(swallowMoment({}), null);
  assert.equal(swallowMoment({ swallow: { day: '  ' } }), null, 'пустая строка — не момент');
});

test('Р4 ласточки: старое состояние с одним day читается как НЕИЗВЕСТНЫЙ момент', () => {
  const legacy = { day: TODAY, swallow: { draftDigest: 'd', ownerAck: true } };
  assert.equal(swallowMomentFresh(legacy, TODAY), false, 'наследование дня воспроизвело бы дефект');
  assert.equal(swallowApproved(legacy, TODAY), false);
  const ally = canSendAlly(legacy, TODAY, 'x');
  assert.equal(ally.ok, false);
  assert.match(ally.blockedBy[0], /момент черновика/);
});

test('моменты двигаются независимо: draft не трогает магистраль, freeze не трогает ласточку', () => {
  const state = { magistralChosenAt: YESTERDAY, swallow: { draftDigest: 'd' } };
  setSwallowMoment(state, TODAY);
  assert.equal(magistralMoment(state), YESTERDAY, 'момент ласточки не поднимает чужой');
  assert.equal(swallowMoment(state), TODAY);
  const frozen = freezeTopThree(['x'], TODAY);
  assert.equal('swallow' in frozen, false, 'заморозка магистрали ласточку не сбрасывает и не заводит');
  assert.equal(frozen.magistralChosenAt, null);
});


/**
 * Ручная чеканка магистрали (#2083). Канон утра её разрешает («подписывается author=human»),
 * прибор не умел — и из-за закрытого магистрального гейта вставал canSend, то есть не уходил
 * ОБЯЗАТЕЛЬНЫЙ доклад партнёрам. Случай 23.08: владелец назвал работу, которой нет в снимке.
 */
const SNAPSHOT = ['angelina-hostess-impl', 'assets-container', 'batch-collection-run-contour'];
const OUTSIDE = 'chart-list-prod-polish';
const frozen = (day = DAY) => ({
  ...freezeTopThree(SNAPSHOT, day),
  swallow: { day, ownerAck: true, draftDigest: 'd', draftFile: 'x.md' },
});

test('#2083: выбор ВНЕ снимка старым путём отвергается — это и была блокировка доклада', () => {
  const state = { ...frozen(), magistral: OUTSIDE, magistralAuthor: 'snapshot' };
  assert.equal(magistralChosen(state, DAY), false);
});

test('#2083: ручная чеканка признаётся предикатом, canSend открывается', () => {
  const state = chooseMagistralManually(frozen(), OUTSIDE, DAY);
  assert.equal(state.magistralAuthor, 'human');
  assert.equal(magistralChosen(state, DAY), true, 'канон разрешает — предикат обязан признавать');
  assert.equal(canSend(state, DAY).ok, true, 'иначе обязательный доклад партнёрам не уйдёт');
});

test('#2083: снимок машины остаётся НЕТРОНУТЫМ — два разных поля, не одно', () => {
  const before = frozen();
  const state = chooseMagistralManually(before, OUTSIDE, DAY);
  assert.deepEqual(state.magistralOptions, SNAPSHOT, 'что предложила машина');
  assert.equal(state.frozenDigest, before.frozenDigest, 'отпечаток снимка не пересчитан');
  assert.equal(state.magistral, OUTSIDE, 'что выбрал человек — отдельным полем');
  assert.equal(state.magistralManual.inSnapshot, false, 'и записано, что выбор был ВНЕ снимка');
});

test('#2083 ЗУБ ПОРЧИ: человеческий выбор вписан В снимок — красное, гейт закрыт', () => {
  const state = chooseMagistralManually(frozen(), OUTSIDE, DAY);
  // Ровно запрещённый билетом обход: дописать выбор владельца в снимок генератора и
  // пересчитать дайджест, чтобы «сошлось». Так запись утверждала бы, что машина его ранжировала.
  state.magistralOptions = [...state.magistralOptions, OUTSIDE];
  state.frozenDigest = snapshotDigest(state.magistralOptions);

  const verdict = manualChoiceIntact(state);
  assert.equal(verdict.ok, false, 'сторож, который не краснеет на внесённой порче, ничего не удостоверяет');
  assert.match(verdict.reason, /вписан В снимок/u);
  assert.equal(magistralChosen(state, DAY), false, 'подгонка не должна открывать гейт');
});

test('#2083 ЗУБ ПОРЧИ: снимок переморожен после чеканки — красное по расхождению отпечатка', () => {
  const state = chooseMagistralManually(frozen(), OUTSIDE, DAY);
  state.magistralOptions = ['совсем-другой-контур'];
  state.frozenDigest = snapshotDigest(state.magistralOptions);

  const verdict = manualChoiceIntact(state);
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /снимок изменился после ручной чеканки/u);
});

test('#2083: честная ручная чеканка НЕ даёт ложного срабатывания сторожа', () => {
  const state = chooseMagistralManually(frozen(), OUTSIDE, DAY);
  assert.equal(manualChoiceIntact(state).ok, true);
});

test('#2083: выбор владельца, совпавший с кандидатом снимка, помечается честно и сторожа не злит', () => {
  const state = chooseMagistralManually(frozen(), SNAPSHOT[0], DAY);
  assert.equal(state.magistralManual.inSnapshot, true, 'записано как есть: выбор совпал со снимком');
  assert.equal(manualChoiceIntact(state).ok, true, 'это не подгонка — снимок не менялся');
  assert.equal(magistralChosen(state, DAY), true);
});

test('#2083: ручная чеканка протухает через сутки, как и обычная (свой момент, ADR-0024)', () => {
  const state = chooseMagistralManually(frozen(), OUTSIDE, DAY);
  assert.equal(magistralChosen(state, '2026-07-27'), false, 'вчерашняя чеканка сегодня не считается');
});

test('#2083: выбор из снимка снимает автора-человека — состояние не хранит двух ответов сразу', () => {
  // Ядро отвечает за поля выбора; смывание записи о чеканке — за прибором (см. morning-gate.mjs).
  // Здесь фиксируем главное: как только автором снова стала машина, предикат судит по снимку.
  const manual = chooseMagistralManually(frozen(), OUTSIDE, DAY);
  const back = { ...manual, magistral: SNAPSHOT[1], magistralAuthor: 'snapshot' };
  assert.equal(magistralChosen(back, DAY), true, 'кандидат из снимка законен');
  const outside = { ...manual, magistral: OUTSIDE, magistralAuthor: 'snapshot' };
  assert.equal(magistralChosen(outside, DAY), false, 'вчерашняя чеканка не легализует id вне снимка сегодня');
});
