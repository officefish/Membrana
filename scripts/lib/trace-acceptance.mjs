/**
 * Отказ-II «приёмка не подтверждена или ложна» — зубы регламента, вердикт M2.
 *
 * Носитель подтверждения — артефакт закрытия с полем приёмки
 * `{ acceptedBy, headRev }`: кто дал LGTM и на какой ревизии head.
 * Подтверждение декоррелировано от назначения фазой: назначение — акт
 * регистрации карточки, подтверждение — акт LGTM на конкретной ревизии.
 *
 * Двухскоростной режим (вердикт M2, «не ломать несущую стену на ходу»):
 *   mode = 'soft'  → нарушение даёт замечание: exit 0 + строка в отчёт;
 *   mode = 'hard'  → нарушение даёт отказ: exit ≠ 0 (после миграции карточек).
 * Переключение режима — решение постановки (параметр), не Date.now().
 *
 * Чистая функция: вход — артефакт (данные), сети/git внутри нет.
 * Вшивание в closure review — адаптер интеграции.
 */

import { traceResult } from './trace-exit-codes.mjs';

const SHA_RE = /^[0-9a-f]{7,40}$/;
export const ACCEPTANCE_MODES = Object.freeze(['soft', 'hard']);

/**
 * @typedef {import('./trace-exit-codes.mjs').TraceResult} TraceResult
 *
 * @typedef {object} ClosureArtifactLike
 * @property {string} [taskId]
 * @property {{ acceptedBy?: string | null, headRev?: string | null } | null} [acceptance]
 */

/**
 * Проверка подтверждения приёмки в артефакте закрытия.
 *
 * @param {ClosureArtifactLike} artifact
 * @param {object} options
 * @param {'soft' | 'hard'} options.mode режим гейта (см. шапку модуля)
 * @param {string} [options.expectedHeadRev] ревизия закрытия; при передаче
 *   несовпадение с `acceptance.headRev` = ложное подтверждение (LGTM не на том head)
 * @returns {TraceResult}
 */
export function checkAcceptance(artifact, { mode, expectedHeadRev } = {}) {
  if (!ACCEPTANCE_MODES.includes(mode)) {
    throw new Error(`checkAcceptance: mode обязателен и ∈ {soft, hard}, получено: ${mode}`);
  }
  const violation = (reason) => traceResult(mode === 'hard' ? 'hard' : 'soft', reason);
  const id = artifact?.taskId ?? '<без id>';

  if (!artifact || typeof artifact !== 'object') {
    return violation('артефакт закрытия отсутствует — приёмку подтвердить не на чем');
  }
  const acceptance = artifact.acceptance;
  if (!acceptance || typeof acceptance !== 'object') {
    return violation(`артефакт ${id}: поле приёмки отсутствует — подтверждение не поставлено`);
  }
  const acceptedBy = typeof acceptance.acceptedBy === 'string' ? acceptance.acceptedBy.trim() : acceptance.acceptedBy;
  if (!acceptedBy) {
    return violation(`артефакт ${id}: acceptedBy пуст — LGTM никем не дан`);
  }
  const headRev = typeof acceptance.headRev === 'string' ? acceptance.headRev.trim() : acceptance.headRev;
  if (!headRev || !SHA_RE.test(headRev)) {
    return violation(`артефакт ${id}: headRev отсутствует или не ревизия — подтверждение не привязано к факту`);
  }
  if (expectedHeadRev && headRev !== expectedHeadRev) {
    return violation(
      `артефакт ${id}: подтверждение ложно — LGTM дан на ${headRev}, закрывается ${expectedHeadRev}`,
    );
  }
  return traceResult('pass', `артефакт ${id}: приёмка подтверждена (${acceptedBy} @ ${headRev})`);
}

/**
 * Три честных состояния для отчёта закрытия (вердикт M2 + норма Верстальщика):
 * зелёный «ответственность есть» / жёлтый «подтверждение отсутствует — soft,
 * пропущено» / красный «hard-отказ, не пропущено». Жёлтое не выглядит как отказ,
 * красное не пропускается молча.
 *
 * @param {TraceResult} result
 * @returns {'green' | 'yellow' | 'red'}
 */
export function traceState(result) {
  if (result.verdict === 'pass') return 'green';
  if (result.verdict === 'soft') return 'yellow';
  return 'red';
}
