/**
 * Вечерний partner-swallow gate (#1475): собственная дверь вечера поверх общего
 * digest/ack-контура отправки. Транспорт остаётся прежним (`telegram:swallow`),
 * но путь подготовки больше не ссылается на утренний `morning:gate`.
 */

import { canSendAlly, draftDigestOf, todayIso } from './morning-gates.mjs';

export const EVENING_GATE_NAME = 'partner-swallow';
export const EVENING_GATE_MARKER = `evening:${EVENING_GATE_NAME}`;

export function hasEveningPartnerGateMarker(state) {
  return state?.swallow?.gate === EVENING_GATE_MARKER;
}

/**
 * Зафиксировать черновик вечерней ласточки на сегодняшний день.
 * @param {object} state
 * @param {{draftText: string, draftFile: string, today?: string}} input
 * @returns {object}
 */
export function recordEveningPartnerDraft(state = {}, { draftText, draftFile, today = todayIso() }) {
  return {
    ...state,
    day: today,
    swallow: {
      ...(state?.swallow ?? {}),
      gate: EVENING_GATE_MARKER,
      draftDigest: draftDigestOf(draftText),
      draftFile,
      ownerAck: false,
    },
  };
}

/**
 * Явное «ок» владельца на уже зафиксированный вечерний черновик.
 * @param {object} state
 * @param {string} today
 * @returns {{ok: boolean, state: object, blockedBy: string[]}}
 */
export function approveEveningPartnerDraft(state = {}, today = todayIso()) {
  const blockedBy = [];
  if (state?.day !== today) {
    blockedBy.push(`day: состояние протухло или не заведено (day=${state?.day ?? '—'}, сегодня ${today})`);
  }
  if (!state?.swallow?.draftDigest) {
    blockedBy.push('partner-swallow: нет зафиксированного черновика');
  }
  if (state?.swallow?.draftDigest && !hasEveningPartnerGateMarker(state)) {
    blockedBy.push('partner-swallow: черновик зафиксирован не через вечернюю дверь');
  }
  if (blockedBy.length > 0) return { ok: false, state, blockedBy };
  return {
    ok: true,
    blockedBy: [],
    state: {
      ...state,
      swallow: {
        ...(state.swallow ?? {}),
        gate: EVENING_GATE_MARKER,
        ownerAck: true,
      },
    },
  };
}

/**
 * Предикат отправки вечерней ласточки: день ∧ ownerAck ∧ digest(payload).
 * @param {object} state
 * @param {string} today
 * @param {string} payload
 */
export function canSendEveningPartnerSwallow(state, today, payload) {
  if (!hasEveningPartnerGateMarker(state)) {
    return {
      ok: false,
      blockedBy: ['partner-swallow: черновик не зафиксирован через yarn evening:gate partner-swallow --draft'],
    };
  }
  const gate = canSendAlly(state, today, payload);
  if (gate.ok) return gate;
  return {
    ok: false,
    blockedBy: gate.blockedBy.map((b) =>
      b.replace('swallow-send:', 'partner-swallow:').replace('yarn morning:gate swallow', 'yarn evening:gate partner-swallow'),
    ),
  };
}
