/**
 * membrana-leveling — порт disposition (K1 / §8.2).
 *
 * Stub контейнера §8.1: путь заявлен в MANIFEST.engines, чтобы validateProcedure
 * резолвил ссылку. Реализация — карточка `membrana-leveling-disposition`.
 *
 * @see docs/prompts/MEMBRANA_LEVELING_DISPOSITION_PROMPT.md
 */

/** @typedef {'live' | 'ready' | 'unfinished' | 'trash'} Disposition */

/**
 * @param {string} _path
 * @param {Record<string, unknown>} _ctx
 * @returns {Disposition}
 */
export function disposition(_path, _ctx) {
  throw new Error(
    'membrana-leveling disposition: not implemented — see membrana-leveling-disposition (§8.2)',
  );
}
