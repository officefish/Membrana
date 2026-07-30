/**
 * Адаптер шва **A→C**: план нарезки → предсказание рода `forecast` (`experience-loop`).
 *
 * Контракт: `INTERFACE_CONTRACT.md` §2, адаптер №2.
 *
 * ДВА РЕШЕНИЯ КОНСИЛИУМА, вшитые здесь, — оба оказались сильнее обеих сторон спора:
 *
 * 1. **`claim` считается ОБЩИМ ПРЕДИКАТОМ.** C просил перечисление `fits|does-not-fit`, A даёт
 *    число. Адаптер не согласует форматы, а зовёт `isSegmentOversized` — ту самую функцию,
 *    которую оба блока уже импортируют из `day-work-diff.mjs`. Расхождение исключено
 *    **конструкцией**: договорённость можно забыть, общий предикат — нет.
 * 2. **`predictedAt = ratification.at`.** C просил время черновика, A такого поля не отдавал.
 *    Взят момент ратификации: неретифицированный набросок предсказанием не является. Решение
 *    совпало с собственным правилом C «нератифицированный план в мерку не входит».
 */
import { isSegmentOversized, OVERSIZED_CHANGED_LINES } from '../day-work-diff.mjs';
import { assignedBlocks, planRatified } from '../sprint-cut/index.mjs';

/**
 * Предсказание тимлида по плану — вход `computeCutAccuracy` через `makeForecastRecord`.
 *
 * @param {object} plan сырой план в схеме `sprint-cut/1`
 * @returns {{ subject: 'cut', personaId: string, sprintId: string, predictedAt: string,
 *             ratifiedBy: string|{none: string}, predicted: object }}
 */
export function planToForecast(plan) {
  const blocks = assignedBlocks(plan).map((b) => ({
    // Имя ключа — `blockId` (контракт G9): дом поля у автора плана. Довод C об омониме
    // «блок нарезки ≠ блок коворка» принят в глоссарий контракта, а не в имя поля.
    blockId: b.blockId,
    contextPersonaId: b.context,
    // Общий предикат, а не своё сравнение с 400 (см. шапку, решение 1).
    claim: isSegmentOversized(b.estimateChangedLines ?? 0) ? 'does-not-fit' : 'fits',
    predictedChangedLines: b.estimateChangedLines,
    threshold: OVERSIZED_CHANGED_LINES,
  }));

  return {
    subject: 'cut',
    personaId: plan?.cutBy,
    sprintId: plan?.sprintId,
    // Момент ратификации, а не черновика (см. шапку, решение 2). Отсутствие ратификации
    // не подменяется временем: пусть валидатор рода назовёт `predictedAt` не-ISO-меткой.
    predictedAt: plan?.ratification?.at,
    ratifiedBy: planRatified(plan) ? 'owner' : { none: 'план не ратифицирован владельцем' },
    predicted: { blocks },
  };
}
