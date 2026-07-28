/**
 * Комната «мостик» — ядро состояния (спринт bridge-room #936, этап Б1; проект Ожегова;
 * фазовый апгрейд — очередь 1 стройки #1351 по вердикту M2 заседания bridge-command-post,
 * ратифицирован 27.07).
 *
 * Семантика жизненного цикла (слово капитана, поправки 22.07 + вердикт M2):
 *   - открытие ЯВНОЕ (по слову капитана; presence фазу НЕ меняет);
 *   - тело — СВОБОДНЫЙ режим (free), не конвейер; критический вопрос капитану —
 *     фаза await_captain (wait-гейт), возврат в free — словом;
 *   - закрытие НЕ ЯВНОЕ (вечерний ритуал) ИЛИ явной командой; печать sealed —
 *     только после отработавшего carrier закрытия (gate.close_carrier);
 *   - переходы идемпотентны (анти-двойной-дом; повторный open/close — no-op со статусом).
 *
 * КА (M2): idle → open → free ⇄ await_captain → close → sealed. `open` и `close` —
 * переходы-действия; персистентные фазы: idle | free | await_captain | sealed.
 * Чистые функции без fs/сети; состояние — объект, персистентность у вызывающего.
 */

/** @typedef {'idle'|'free'|'await_captain'|'sealed'} RoomPhase */
/** @typedef {{phase: RoomPhase, day: string|null, openedBy: string|null}} RoomState */

/** Персистентные фазы КА (M2; open/close — переходы, не стоянки). */
export const PHASES = Object.freeze(['idle', 'free', 'await_captain', 'sealed']);

/** Пустое (закрытое) состояние — стартовая точка КА. Имя CLOSED — легаси-совместимость. */
export const CLOSED = Object.freeze({ phase: 'idle', day: null, openedBy: null });

/**
 * Нормализация легаси-состояния (до фазового апгрейда: opened/closed).
 * @param {Record<string, unknown>|null|undefined} raw
 * @returns {RoomState}
 */
export function normalizeState(raw) {
  if (!raw || typeof raw !== 'object') return { ...CLOSED };
  const phase = raw.phase === 'opened' ? 'free'
    : raw.phase === 'closed' ? 'idle'
    : PHASES.includes(raw.phase) ? raw.phase
    : 'idle';
  return { phase, day: raw.day ?? null, openedBy: raw.openedBy ?? null };
}

/** Комната открыта = живое тело сеанса (free либо ожидание слова капитана). */
export function isOpen(state) {
  return state?.phase === 'free' || state?.phase === 'await_captain' || state?.phase === 'opened';
}

/**
 * Явное открытие (bridge.open_command → bridge.open → φ=free). Идемпотентно:
 * открытие открытой комнаты — тот же state, `already:true`. Открытие после sealed
 * (новый день) — легально: новый сеанс.
 * @param {RoomState} state
 * @param {{day: string, cap?: string}} ctx
 * @returns {{state: RoomState, opened: boolean, already: boolean}}
 */
export function openRoom(state, { day, cap = 'cap' }) {
  if (!day) throw new Error('openRoom: нужен day (YYYY-MM-DD)');
  if (isOpen(state)) {
    return { state, opened: false, already: true };
  }
  return { state: { phase: 'free', day, openedBy: cap }, opened: true, already: false };
}

/**
 * Gate.await_captain (wait, не действие): критический вопрос → φ=await_captain.
 * Легален только из free; из закрытых фаз — отказ (`waited:false`).
 * @param {RoomState} state
 * @returns {{state: RoomState, waited: boolean}}
 */
export function awaitCaptain(state) {
  if (state?.phase === 'await_captain') return { state, waited: true };
  if (state?.phase !== 'free') return { state, waited: false };
  return { state: { ...state, phase: 'await_captain' }, waited: true };
}

/**
 * Слово капитана снимает ожидание: await_captain → free. Идемпотентно из free.
 * @param {RoomState} state
 * @returns {{state: RoomState, resumed: boolean}}
 */
export function resumeFree(state) {
  if (state?.phase === 'free') return { state, resumed: true };
  if (state?.phase !== 'await_captain') return { state, resumed: false };
  return { state: { ...state, phase: 'free' }, resumed: true };
}

/**
 * Закрытие (вечерний ритуал или явная команда): open → sealed. Идемпотентно:
 * закрытие незакрытой комнаты — no-op, `closed:false` (вызывающий печатает честный
 * статус, не пустоту). Печать sealed ставится вызывающим ТОЛЬКО после квитанции
 * (gate.close_carrier — граница адаптера, ядро отдаёт переход).
 * @param {RoomState} state
 * @returns {{state: RoomState, closed: boolean, day: string|null}}
 */
export function closeRoom(state) {
  if (!isOpen(state)) {
    return { state: normalizeState(state), closed: false, day: null };
  }
  return { state: { phase: 'sealed', day: state.day, openedBy: state.openedBy ?? null }, closed: true, day: state.day ?? null };
}
