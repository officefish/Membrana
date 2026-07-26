/**
 * Двухгейтовое утро — предикаты (вердикт M3-G заседания angelina-hostess, 21.07).
 *
 * Ровно два стопа утра (тезис Т2 шторма #741): magistral (owner-choice из топ-3) и
 * swallow-send (одобрение доклада). send — терминальное действие: вызывается тогда и только тогда, когда
 * canSend(state, today) === true; пути мимо предикатов нет — «забыть» невозможно.
 *
 * #1233: согласие и снимок живут только в границах `state.day` (YYYY-MM-DD). День
 * подаётся снаружи (детерминизм — как у ключа идемпотентности). Состояние без day
 * или со вчерашним day — гейт закрыт («протухло»). Отправитель (`telegram:swallow`)
 * зовёт `canSendAlly` и сверяет payload с `draftDigest`.
 *
 * Вечер: тот же swallow-контур (день + ack + digest); magistral — только утренний
 * статус / terminalSend. Парный вечерний файл состояния не заводим — один след.
 *
 * Чистое ядро: предикаты от состояния, без сети/Telegram/DOM.
 */

import { createHash } from 'node:crypto';

/** @returns {string} YYYY-MM-DD (UTC, как у соседних ритуальных скриптов) */
export function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * Digest черновика / payload — тот же текст, что уйдёт в транспорт (trim).
 * @param {string} text
 * @returns {string}
 */
export function draftDigestOf(text) {
  return createHash('sha256').update(String(text ?? '').trim()).digest('hex');
}

/**
 * Состояние «на сегодня»: `state.day` обязан совпасть с поданным днём.
 * @param {{day?: string|null}} state
 * @param {string} today YYYY-MM-DD
 * @returns {boolean}
 */
export function dayFresh(state, today) {
  return Boolean(today) && state?.day === today;
}

/**
 * Гейт magistral: выбор владельца принадлежит замороженному снимку топ-3 И день свеж.
 * Если состояние несёт `frozenDigest` — снимок сверяется с ним (P2 ревью #762).
 * @param {{day?: string|null, magistral?: {id?: string}|string|null, magistralOptions?: Array<{id: string}|string>, frozenDigest?: string|null}} state
 * @param {string} today YYYY-MM-DD (подаётся снаружи)
 * @returns {boolean}
 */
export function magistralChosen(state, today) {
  if (!dayFresh(state, today)) return false;
  const chosen = typeof state?.magistral === 'string' ? state.magistral : state?.magistral?.id;
  if (!chosen) return false;
  const options = (state?.magistralOptions ?? []).map((o) => (typeof o === 'string' ? o : o?.id));
  if (state?.frozenDigest) {
    const actual = createHash('sha256').update(options.join('\n')).digest('hex');
    if (actual !== state.frozenDigest) return false; // снимок подменён — гейт закрыт
  }
  return options.includes(chosen);
}

/**
 * Гейт swallow-send: явное «ок» владельца на сегодняшний зафиксированный черновик.
 * @param {{day?: string|null, swallow?: {ownerAck?: boolean, draftDigest?: string|null}}} state
 * @param {string} today YYYY-MM-DD
 * @returns {boolean}
 */
export function swallowApproved(state, today) {
  if (!dayFresh(state, today)) return false;
  return state?.swallow?.ownerAck === true && Boolean(state?.swallow?.draftDigest);
}

/**
 * Отправляемый текст = тот, на который дали «ок».
 * @param {{swallow?: {draftDigest?: string|null}}} state
 * @param {string} payload
 * @returns {boolean}
 */
export function payloadMatchesDraft(state, payload) {
  const expected = state?.swallow?.draftDigest;
  if (!expected) return false;
  return draftDigestOf(payload) === expected;
}

/**
 * Утренний путь к отправке: день ∧ magistral ∧ swallow. Причины блока — для Ангелины.
 * @param {object} state
 * @param {string} today YYYY-MM-DD
 * @returns {{ok: boolean, blockedBy: string[]}}
 */
export function canSend(state, today) {
  const blockedBy = [];
  if (!dayFresh(state, today)) {
    blockedBy.push('day: состояние протухло — согласие/снимок не на сегодня (нужен сегодняшний freeze/draft+ack)');
    return { ok: false, blockedBy };
  }
  if (!magistralChosen(state, today)) blockedBy.push('magistral: ждёт owner-choice из топ-3');
  if (!swallowApproved(state, today)) blockedBy.push('swallow-send: ждёт явного «ок» владельца по черновику');
  return { ok: blockedBy.length === 0, blockedBy };
}

/**
 * Путь отправителя (`telegram:swallow`): день ∧ swallow ∧ digest payload.
 * Magistral не требуется — вечерняя ласточка ходит тем же контуром без утреннего выбора.
 * @param {object} state
 * @param {string} today YYYY-MM-DD
 * @param {string} payload текст, который уйдёт в транспорт
 * @returns {{ok: boolean, blockedBy: string[]}}
 */
export function canSendAlly(state, today, payload) {
  const blockedBy = [];
  if (!dayFresh(state, today)) {
    blockedBy.push('day: состояние протухло — согласие не на сегодня');
  } else if (!(state?.swallow?.ownerAck === true && Boolean(state?.swallow?.draftDigest))) {
    blockedBy.push('swallow-send: ждёт явного «ок» владельца по черновику');
  } else if (!payloadMatchesDraft(state, payload)) {
    blockedBy.push('digest: отправляемый текст ≠ зафиксированному черновику (yarn morning:gate swallow --draft …)');
  }
  return { ok: blockedBy.length === 0, blockedBy };
}

/**
 * Ключ идемпотентности отправки: по содержимому И ДНЮ утра (не по попытке доставки).
 * @param {string} payload
 * @param {string} dayOfMorning YYYY-MM-DD (подаётся снаружи — детерминизм)
 * @returns {string}
 */
export function sendIdempotencyKey(payload, dayOfMorning) {
  return createHash('sha256').update(`${dayOfMorning}\n${String(payload ?? '')}`).digest('hex');
}

/**
 * Заморозка снимка топ-3 на сессию (M3-G: выбор не устаревает от пересчёта).
 * @param {Array<{id: string}>} topThree
 * @param {string} [today] день снимка; по умолчанию сегодня
 * @returns {{day: string, magistralOptions: string[], frozenDigest: string}}
 */
export function freezeTopThree(topThree, today = todayIso()) {
  const ids = (topThree ?? []).map((t) => (typeof t === 'string' ? t : t?.id)).filter(Boolean);
  return {
    day: today,
    magistralOptions: ids,
    frozenDigest: createHash('sha256').update(ids.join('\n')).digest('hex'),
  };
}

/**
 * Терминальный send-раннер: единственная обёртка morning-пути. Эффект инъектируется;
 * при блоке — НЕ вызывается. Повтор с тем же ключом — no-op.
 * @param {object} state
 * @param {string} payload
 * @param {string} dayOfMorning
 * @param {{transport: (payload: string) => Promise<unknown>, sentKeys?: Set<string>}} io
 * @returns {Promise<{sent: boolean, key: string|null, blockedBy: string[], duplicate?: boolean}>}
 */
export async function terminalSend(state, payload, dayOfMorning, io) {
  const gate = canSend(state, dayOfMorning);
  if (!gate.ok) return { sent: false, key: null, blockedBy: gate.blockedBy };
  if (!payloadMatchesDraft(state, payload)) {
    return {
      sent: false,
      key: null,
      blockedBy: ['digest: отправляемый текст ≠ зафиксированному черновику'],
    };
  }
  const key = sendIdempotencyKey(payload, dayOfMorning);
  if (io?.sentKeys?.has(key)) return { sent: false, key, blockedBy: [], duplicate: true };
  await io.transport(payload);
  io?.sentKeys?.add(key);
  return { sent: true, key, blockedBy: [] };
}
