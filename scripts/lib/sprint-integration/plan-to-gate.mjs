/**
 * Адаптер шва **A→B**: план нарезки (`cut-contract`) → вход гейта (`execution-gate`).
 *
 * Контракт: `docs/cowork-sprint/cowork-honest-sprint/INTERFACE_CONTRACT.md` §1, адаптер №1.
 *
 * ЧТО АДАПТЕР ДЕЛАЕТ. Переименовывает поля, нормализует литералы режима в сторону слова
 * владельца и превращает ратификацию из документа в предикат. Блоки при этом **не
 * переписываются** — регламент коворка прямо запрещает лечить несогласованность правкой блока.
 *
 * ЧТО АДАПТЕР НЕ ДЕЛАЕТ — и это несущее. Он **не изобретает** `window` и `revisionAt`. Гейт при
 * их отсутствии обязан отдать ошибку входа, потому что считать «всё свежее» есть тихое
 * разрешение переноса согласия на изменённый контракт (запрет M2). Подставь адаптер здесь
 * значение по умолчанию — и запрет обошёл бы сам мост, а не блок.
 */
import { modeOf, planRatified } from '../sprint-cut/index.mjs';
import { MODES } from '../execution-trace/plan-reader.mjs';

/**
 * Литералы режима расходились: A пишет `explicit-honest` / `membrana-flow`, B ждёт
 * `explicit_honest` / `no_personal_responsibility`. Контракт разрешил спор **в пользу слова
 * владельца**, а не в пользу большинства блоков: `membrana-flow` — его формулировка.
 * Нормализация односторонняя, A остаётся каноном.
 */
export const MODE_TO_GATE = Object.freeze({
  'explicit-honest': MODES.EXPLICIT_HONEST,
  'membrana-flow': MODES.NO_PERSONAL_RESPONSIBILITY,
});

/** Находки самого шва — с именем, как всё в этом контуре. */
export const SEAM_FINDINGS = Object.freeze({
  CONTEXT_DIFFERS: 'ia-context-differs',
  MODE_UNKNOWN: 'ia-mode-unknown',
});

/**
 * @param {object} plan сырой план в схеме `sprint-cut/1`
 * @returns {{ planRaw: object, findings: {toothId: string, blockId: string|null, reason: string}[] }}
 *   `planRaw` пригоден для `readPlan()`; `findings` — дефекты, видимые только на шве.
 */
export function planToGate(plan) {
  const findings = [];
  const rawMode = modeOf(plan);
  const mode = MODE_TO_GATE[rawMode];
  if (mode === undefined) {
    // Режим вне двух — ошибка формы, а не повод угадать. Пробрасываем как есть: пусть
    // readPlan назовёт это своей ошибкой входа, а шов добавит адрес.
    findings.push({
      toothId: SEAM_FINDINGS.MODE_UNKNOWN,
      blockId: null,
      reason: `режим «${String(rawMode)}» вне закрытых двух — адаптер не угадывает`,
    });
  }

  const blocks = (plan?.blocks ?? []).map((b) => {
    // Ограничение v1 шва (контракт G5, слово владельца): `context` обязан равняться `persona`.
    // Гейт сверяет след с ОДНИМ идентификатором и различать «чей профиль» пока не умеет.
    // Расхождение — находка, а не молчаливый выбор одного из двух полей.
    if (b.context != null && b.persona != null && b.context !== b.persona) {
      findings.push({
        toothId: SEAM_FINDINGS.CONTEXT_DIFFERS,
        blockId: b.blockId ?? null,
        reason: `context=${b.context} ≠ persona=${b.persona}: в v1 шва обязаны совпадать`,
      });
    }
    return {
      blockId: b.blockId,
      assigned: b.persona,
      mode: mode ?? rawMode,
      reason: b.unassignedReason ?? null,
      // Пробрасываем КАК ЕСТЬ, включая отсутствие: подстановка запрещена (см. шапку).
      revisionAt: b.revisionAt,
    };
  });

  return {
    planRaw: {
      planId: plan?.sprintId,
      ratified: planRatified(plan),
      window: plan?.window,
      revisionAt: plan?.revisionAt,
      blocks,
    },
    findings,
  };
}
