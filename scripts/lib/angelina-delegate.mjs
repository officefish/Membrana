/**
 * Предикат делегирования ведущей персоны (Ангелина).
 *
 * Вердикт M1 (docs/seanses/team-execution-contour-m1-leading-persona-2026-07-19.md):
 *   delegate(task) = ¬fitsOneContext ∨ needsParallelFactua ∨ isLongLivedDocument
 * Все три ложны → делает сама (эталон — шторм 19.07 инлайном).
 *
 * Род помощника — по природе работы:
 *   isLongLivedDocument → писарь (scribe), needsParallelFactua → аналитик (analyst).
 * Сработал только общий триггер ¬fitsOneContext → род входами не определён,
 * выбирается при декомпозиции: kinds = [] — честный ответ, не выдуманный род.
 *
 * Чистая функция: без сети, без состояния, без побочных эффектов.
 */

export const SUBAGENT_KINDS = Object.freeze({
  ANALYST: 'analyst',
  SCRIBE: 'scribe',
});

const INPUT_NAMES = Object.freeze([
  'fitsOneContext',
  'needsParallelFactua',
  'isLongLivedDocument',
]);

/**
 * @param {{fitsOneContext: boolean, needsParallelFactua: boolean, isLongLivedDocument: boolean}} inputs
 *   Три наблюдаемых входа; наблюдение — на ведущей, функция только выносит вердикт.
 * @returns {{delegate: boolean, kinds: string[]}}
 *   kinds ⊆ {analyst, scribe}; порядок детерминирован: analyst, затем scribe.
 * @throws {TypeError} вход отсутствует или не булев — ошибка вызывающего, наблюдаемая.
 */
export function decideDelegation(inputs) {
  if (inputs === null || typeof inputs !== 'object') {
    throw new TypeError('decideDelegation: ожидается объект с тремя булевыми входами');
  }
  for (const name of INPUT_NAMES) {
    if (typeof inputs[name] !== 'boolean') {
      throw new TypeError(`decideDelegation: вход "${name}" обязан быть булевым`);
    }
  }

  const { fitsOneContext, needsParallelFactua, isLongLivedDocument } = inputs;
  const delegate = !fitsOneContext || needsParallelFactua || isLongLivedDocument;

  const kinds = [];
  if (needsParallelFactua) kinds.push(SUBAGENT_KINDS.ANALYST);
  if (isLongLivedDocument) kinds.push(SUBAGENT_KINDS.SCRIBE);

  return { delegate, kinds };
}
