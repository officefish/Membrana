/**
 * Двухгейтовое утро — предикаты (вердикт M3-G заседания angelina-hostess, 21.07).
 *
 * Ровно два стопа утра (тезис Т2 шторма #741): magistral (owner-choice из топ-3) и
 * swallow-send (одобрение доклада). `send` — ТЕРМИНАЛЬНОЕ действие: вызывается ⟺
 * `canSend(state) === true`; пути мимо предикатов нет — «забыть» невозможно, ружьё
 * умерло как класс.
 *
 * Чистое ядро: предикаты от состояния, без сети/Telegram/DOM. Снимок топ-3 замораживается
 * на сессию — выбор не устаревает от пересчёта. Идемпотентность отправки — ключ по дню.
 */

import { createHash } from 'node:crypto';

/**
 * Гейт magistral: выбор владельца принадлежит замороженному снимку топ-3. Если состояние
 * несёт `frozenDigest` — снимок сверяется с ним (защита от подмены options задним числом;
 * P2 ревью #762): подменённый список не пройдёт, даже если выбор в нём «есть».
 * @param {{magistral?: {id?: string}|string|null, magistralOptions?: Array<{id: string}|string>, frozenDigest?: string|null}} state
 * @returns {boolean}
 */
export function magistralChosen(state) {
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
 * Гейт swallow-send: явное «ок» владельца. Черновик обязан быть виден целиком ДО
 * одобрения — предикат требует и ack, и след показанного черновика (digest).
 * @param {{swallow?: {ownerAck?: boolean, draftDigest?: string|null}}} state
 * @returns {boolean}
 */
export function swallowApproved(state) {
  return state?.swallow?.ownerAck === true && Boolean(state?.swallow?.draftDigest);
}

/**
 * Единственный путь к отправке: оба гейта. Возвращает и причины блока — Ангелина
 * называет, чего ждёт (сопровождение = фронтир + связь, M4-H).
 * @param {object} state
 * @returns {{ok: boolean, blockedBy: string[]}}
 */
export function canSend(state) {
  const blockedBy = [];
  if (!magistralChosen(state)) blockedBy.push('magistral: ждёт owner-choice из топ-3');
  if (!swallowApproved(state)) blockedBy.push('swallow-send: ждёт явного «ок» владельца по черновику');
  return { ok: blockedBy.length === 0, blockedBy };
}

/**
 * Ключ идемпотентности отправки: по содержимому И ДНЮ утра (не по попытке доставки) —
 * таймаут+ретрай дают один выстрел (M3-G; класс swallow-delivery-idempotency).
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
 * @returns {{magistralOptions: string[], frozenDigest: string}}
 */
export function freezeTopThree(topThree) {
  const ids = (topThree ?? []).map((t) => (typeof t === 'string' ? t : t?.id)).filter(Boolean);
  return {
    magistralOptions: ids,
    frozenDigest: createHash('sha256').update(ids.join('\n')).digest('hex'),
  };
}

/**
 * Терминальный send-раннер: единственная обёртка, из которой можно дёргать эффект
 * отправки. Эффект (`transport`) инъектируется; при блоке — НЕ вызывается, возвращаются
 * причины. Повтор с тем же ключом — no-op (журнал ключей у вызывающего).
 * @param {object} state
 * @param {string} payload
 * @param {string} dayOfMorning
 * @param {{transport: (payload: string) => Promise<unknown>, sentKeys?: Set<string>}} io
 * @returns {Promise<{sent: boolean, key: string|null, blockedBy: string[], duplicate?: boolean}>}
 */
export async function terminalSend(state, payload, dayOfMorning, io) {
  const gate = canSend(state);
  if (!gate.ok) return { sent: false, key: null, blockedBy: gate.blockedBy };
  const key = sendIdempotencyKey(payload, dayOfMorning);
  if (io?.sentKeys?.has(key)) return { sent: false, key, blockedBy: [], duplicate: true };
  await io.transport(payload);
  io?.sentKeys?.add(key);
  return { sent: true, key, blockedBy: [] };
}
