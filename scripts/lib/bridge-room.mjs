/**
 * Комната «мостик» — ядро состояния (спринт bridge-room #936, этап Б1; проект Ожегова).
 *
 * Формат «мостик» — особый режим диалога капитана с ведущей (Ангелина), питомцем
 * (Фаррелл) и попугаем-техдолгом. Семантика жизненного цикла (слово капитана,
 * две поправки 22.07):
 *   - открытие ЯВНОЕ (по слову капитана; не обязано быть с утра);
 *   - закрытие НЕ ЯВНОЕ (автоматически, шагом вечернего ритуала);
 *   - при закрытии конспект уезжает ФРЕЙМОМ в репозиторий (не ручным пушем).
 *
 * Конечный автомат `closed → opened → closed`. Чистые функции без fs/сети:
 * состояние — простой объект, персистентность у вызывающего (bridge.mjs). Тот же
 * вход → тот же выход; переходы идемпотентны (анти-двойной-дом).
 */

/** @typedef {'opened'|'closed'} RoomPhase */
/** @typedef {{phase: RoomPhase, day: string|null, openedBy: string|null}} RoomState */

/** Пустое (закрытое) состояние — стартовая точка КА. */
export const CLOSED = Object.freeze({ phase: 'closed', day: null, openedBy: null });

/** @param {RoomState|null|undefined} state */
export function isOpen(state) {
  return state?.phase === 'opened';
}

/**
 * Явное открытие. Идемпотентно: открытие уже открытой комнаты того же дня —
 * тот же state (не второй дом, не сброс конспекта). Открытие в другой день
 * поверх незакрытой — тоже возврат текущей (закрытие — обязанность вечера, не
 * перезапись); вызывающий увидит `reopened:false` и честно предупредит.
 *
 * @param {RoomState} state
 * @param {{day: string, cap?: string}} ctx
 * @returns {{state: RoomState, opened: boolean, already: boolean}}
 */
export function openRoom(state, { day, cap = 'cap' }) {
  if (!day) throw new Error('openRoom: нужен day (YYYY-MM-DD)');
  if (isOpen(state)) {
    return { state, opened: false, already: true };
  }
  return { state: { phase: 'opened', day, openedBy: cap }, opened: true, already: false };
}

/**
 * НЕявное закрытие (вызывается вечерним ритуалом, не капитаном). Идемпотентно:
 * закрытие уже закрытой комнаты — no-op, `closed:false` (вызывающий печатает
 * «мостик не открыт», не пустоту — анти-«молчун»).
 *
 * @param {RoomState} state
 * @returns {{state: RoomState, closed: boolean, day: string|null}}
 */
export function closeRoom(state) {
  if (!isOpen(state)) {
    return { state: { ...CLOSED }, closed: false, day: null };
  }
  return { state: { ...CLOSED }, closed: true, day: state.day };
}
