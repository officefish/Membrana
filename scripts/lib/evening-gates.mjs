/**
 * Вечерний partner-swallow gate (#1475): собственная дверь вечера поверх общего
 * digest/ack-контура отправки. Транспорт остаётся прежним (`telegram:swallow`),
 * но путь подготовки больше не ссылается на утренний `morning:gate`.
 */

import {
  canSendAlly,
  draftDigestOf,
  setSwallowMoment,
  swallowMoment,
  swallowMomentFresh,
  todayIso,
} from './morning-gates.mjs';

export const EVENING_GATE_NAME = 'partner-swallow';
export const EVENING_GATE_MARKER = `evening:${EVENING_GATE_NAME}`;

export function hasEveningPartnerGateMarker(state) {
  return state?.swallow?.gate === EVENING_GATE_MARKER;
}

/**
 * Держит ли ласточку сверка утверждений протокола (`yarn feedback:claims`, карточка
 * `feedback-claims-code-probe` #1795).
 *
 * ЗАЧЕМ ЗДЕСЬ. 07.08 протокол вечера утверждал о коде то, чего в коде нет — четыре
 * утверждения, — и на этом протоколе строится доклад союзникам. Поймала ведущая глазом уже
 * после генерации. Отправку держит гейт, а не exit-код шага: сам протокол обязателен по
 * CLAUDE.md и красной сверкой не отменяется.
 *
 * ТОЛЬКО `hard`. `soft` и `unknown` не держат ничего: гейт, который красит жёлтое в красное,
 * учит команду не верить гейтам, и следующая настоящая находка утонет вместе с шумом.
 *
 * Проходимость — квитанцией владельца под ТО ЖЕ дерево (`yarn feedback:claims --ack --note`).
 * Сменилось дерево — квитанция сгорела: иначе одно «ок» разрешало бы любые будущие вердикты.
 *
 * Читается ровно одно своё поле `swallow.claimsProbe`; моменты субъектов (ADR-0024,
 * долг `swallow-own-moment` снят) этот блокер не читает и не пишет.
 */
export function claimsProbeBlocker(state) {
  const probe = state?.swallow?.claimsProbe;
  if (!probe || probe.verdict !== 'hard') return null;
  const override = probe.override;
  if (override && override.sha && override.sha === probe.sha) return null;
  const where = probe.protocol ? ` (${probe.protocol})` : '';
  return (
    `partner-swallow: сверка утверждений протокола${where} нашла НЕ ПОДТВЕРЖДЁННОЕ деревом — ` +
    'поправь протокол либо квитируй: yarn feedback:claims --ack --note "…"'
  );
}

/**
 * Зафиксировать черновик вечерней ласточки на сегодняшний день.
 * @param {object} state
 * @param {{draftText: string, draftFile: string, today?: string}} input
 * @returns {object}
 */
export function recordEveningPartnerDraft(state = {}, { draftText, draftFile, today = todayIso() }) {
  // ADR-0024 Р3 (долг swallow-own-moment снят): вечерний черновик ставит ТОЛЬКО момент
  // ласточки через фасад леммы — `state.day` (день заморозки утра) больше не трогается.
  const next = {
    ...state,
    swallow: {
      ...(state?.swallow ?? {}),
      gate: EVENING_GATE_MARKER,
      draftDigest: draftDigestOf(draftText),
      draftFile,
      ownerAck: false,
    },
  };
  return setSwallowMoment(next, today);
}

/**
 * Явное «ок» владельца на уже зафиксированный вечерний черновик.
 * @param {object} state
 * @param {string} today
 * @returns {{ok: boolean, state: object, blockedBy: string[]}}
 */
export function approveEveningPartnerDraft(state = {}, today = todayIso()) {
  const blockedBy = [];
  // Р2 ADR-0024: «ок» сверяет момент ЛАСТОЧКИ, не общий `state.day`.
  if (!swallowMomentFresh(state, today)) {
    blockedBy.push(
      `partner-swallow: черновик протух или не заведён (момент ${swallowMoment(state) ?? '—'}, сегодня ${today})`,
    );
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
  const claims = claimsProbeBlocker(state);
  const gate = canSendAlly(state, today, payload);
  if (gate.ok) return claims ? { ok: false, blockedBy: [claims] } : gate;
  const blockedBy = gate.blockedBy.map((b) =>
    b.replace('swallow-send:', 'partner-swallow:').replace('yarn morning:gate swallow', 'yarn evening:gate partner-swallow'),
  );
  return { ok: false, blockedBy: claims ? [...blockedBy, claims] : blockedBy };
}
