/**
 * Порог размера PR — дверь ДО создания PR (#2020).
 *
 * ПОВОД. 25.08 семь PR ушли в ствол oversized, и 26.08 пять из них пришлось ревьюить
 * вдогонку: вечернее ревью помечало их «oversized» и диффа не читало. Порог существовал
 * — но срабатывал ПОСЛЕ мерджа, то есть сообщал о том, чего уже не изменить. Здесь он
 * стоит перед `pr-create`: пока PR нет, нарезка ещё возможна.
 *
 * ФОРМА ДВЕРИ — не запрет, а названная причина (тот же образец, что
 * `REVIEW_GATE_OVERRIDE_REASON` у ревью-гейта). Бывают PR, которые честно не режутся:
 * пересадка одного класса по всему дереву, генерированный lockfile. Такой PR проходит,
 * НО причина уезжает в тело PR и остаётся на виду у ревьюера — молчаливого oversized
 * больше нет.
 *
 * Порог не копируем: единственный носитель мерки — `OVERSIZED_CHANGED_LINES`
 * (`day-work-diff.mjs`), две копии числа разъехались бы молча.
 */
import { OVERSIZED_CHANGED_LINES, changedLinesFromShortstat } from './day-work-diff.mjs';

export { OVERSIZED_CHANGED_LINES, changedLinesFromShortstat };

/** Заголовок строки причины в теле PR — по нему же её находит ревьюер и тест. */
export const SIZE_REASON_MARKER = 'PR size:';

/**
 * Сколько строк уедет в PR: уже закоммиченное относительно базы плюс то, что в индексе
 * (шаг `commit` ещё впереди). Обе части считаются одним и тем же счётчиком.
 *
 * @param {{ base?: string, run: (args: string[]) => string }} p run — исполнитель git
 * @returns {number}
 */
export function changedLinesForShip({ base = 'main', run }) {
  const safe = (args) => {
    try {
      return run(args);
    } catch {
      return '';
    }
  };
  const committed = changedLinesFromShortstat(safe(['diff', '--shortstat', `origin/${base}...HEAD`]));
  const staged = changedLinesFromShortstat(safe(['diff', '--cached', '--shortstat']));
  return committed + staged;
}

/**
 * Отказ до создания PR: превышен порог и причина не названа.
 *
 * `merge-only` не судится — там PR уже существует, резать нечего; отказ бы только
 * мешал доставке уже отревьюенного.
 *
 * @param {{ changedLines: number, reason?: string|null, mergeOnly?: boolean, execute?: boolean }} p
 * @returns {string|null} текст отказа либо null
 */
export function oversizedShipProblem({ changedLines, reason, mergeOnly, execute }) {
  if (!execute || mergeOnly) return null;
  if (!(Number(changedLines) > OVERSIZED_CHANGED_LINES)) return null;
  if (String(reason ?? '').trim().length > 0) return null;
  return [
    `pr:ship: ${changedLines} изменённых строк против порога ${OVERSIZED_CHANGED_LINES} — PR НЕ создан.`,
    'Порог стоит здесь, а не после мерджа: пока PR нет, нарезка ещё возможна (25.08 семь PR ушли',
    'oversized, и пять пришлось ревьюить вдогонку — ревью помечало размер и диффа не читало).',
    'Выходов два, оба честные:',
    '  • нарезать: доставить куски отдельными PR (обычно один класс правки = один PR);',
    '  • назвать причину: pr:ship … --size-reason "почему этот PR не режется".',
    'Причина уедет в тело PR и останется на виду у ревьюера — молчаливого oversized не будет.',
  ].join('\n');
}

/**
 * Строка причины для тела PR. Ревьюер видит и число, и объяснение — не «просто большой PR».
 * @param {{ changedLines: number, reason: string }} p
 */
export function sizeReasonLine({ changedLines, reason }) {
  return `${SIZE_REASON_MARKER} ${changedLines} изменённых строк (порог ${OVERSIZED_CHANGED_LINES}) — не режется: ${String(reason).trim()}`;
}

/**
 * Дописать причину к телу PR, не затирая его. Пустое тело — причина становится телом.
 * @param {string} body @param {string} line
 */
export function appendSizeReason(body, line) {
  const base = String(body ?? '').trim();
  const add = String(line ?? '').trim();
  // Причины нет — тело не портим ни одним лишним переводом строки (иначе ATF4-3 краснеет).
  if (add.length === 0) return base;
  return base.length > 0 ? base + String.fromCharCode(10,10) + add : add;
}
