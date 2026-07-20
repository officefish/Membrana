/**
 * Р1 формата ШТОРМА — предикаты жизненного цикла.
 * Канон: docs/STORM_REGULATION.md § «Контейнер и жизненный цикл».
 *
 * Чистое ядро над объектом состояния (без сети, детерминировано). FS-адаптер
 * (парсинг CONSPECTUS.md → state) — отдельно, чтобы предикаты тестировались
 * поконъюнктно без файловой системы.
 *
 * Состояние шторма:
 *   { dirExists, topic, topicByOwner, pora, sevenBreaths, fork }
 *   - dirExists     — директория docs/storm/<id>/ существует
 *   - topic         — предмет шторма (строка) или null
 *   - topicByOwner  — предмет назван владельцем
 *   - pora          — владелец сказал «пора» (суверенный пол)
 *   - sevenBreaths  — счётчик вдохов достиг 7 (неотменяемый потолок)
 *   - fork          — развилка на выходе (включая "никуда") или null
 */

function nonEmpty(v) {
  return typeof v === 'string' && v.trim() !== '';
}

/**
 * Развилка названа ⟺ непустое явное значение.
 * «никуда» — валидная развилка (явное слово владельца), НЕ пустота.
 */
export function forkNamed(state) {
  return nonEmpty(state.fork);
}

/** Шторм законно начат ⟺ дом есть ∧ предмет непуст ∧ предмет назван владельцем. */
export function isStarted(state) {
  return Boolean(state.dirExists) && nonEmpty(state.topic) && Boolean(state.topicByOwner);
}

/** Сработал триггер закрытия ⟺ пол «пора» ∨ потолок «семь вдохов». */
export function closeTriggered(state) {
  return Boolean(state.pora) || Boolean(state.sevenBreaths);
}

/**
 * Закрыт ⟺ начат ∧ (пора ∨ семь-вдохов) ∧ развилка названа.
 *
 * Гард `isStarted` обязателен: ратифицированный инвариант (ровно один из
 * open/closed/not-started) без него не держится — не начатый шторм с
 * выставленным триггером и развилкой оказался бы одновременно closed и
 * not-started. Триггер без развилки — НЕ закрыт (регламент: Ангелина возвращает,
 * молчаливое закрытие — паразит).
 */
export function isClosed(state) {
  return isStarted(state) && closeTriggered(state) && forkNamed(state);
}

/** Открыт ⟺ начат ∧ не закрыт. Пустой/безымянный дом — не открыт. */
export function isOpen(state) {
  return isStarted(state) && !isClosed(state);
}

/** Не начат ⟺ дома нет / предмет пуст / предмет не назван владельцем. */
export function isNotStarted(state) {
  return !isStarted(state);
}

/**
 * Жизненный статус — ровно одно из трёх (тотальность + взаимоисключение).
 * @returns {'open' | 'closed' | 'not-started'}
 */
export function lifecycleStatus(state) {
  if (isNotStarted(state)) return 'not-started';
  return isClosed(state) ? 'closed' : 'open';
}
