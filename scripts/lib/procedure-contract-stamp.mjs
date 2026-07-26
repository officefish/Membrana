/**
 * Штамп лицензии контракта (Ф3 #1220) — без зависимостей от генераторов.
 * Канон: docs/procedures/LICENSE.md.
 */

/** Версия парсера — ломающее изменение схемы штампа / правил = bump major. */
export const PARSER_VERSION = '1.0.0';

const LEGACY_HEADER_RE =
  /^<!--\s*generated:\s*(.+?)\s+из\s+(\S+)\s+—\s*руками не править\s*-->/u;
const CONTRACT_HEADER_RE =
  /^<!--\s*contract:\s*parser@([^\s]+)\s*·\s*generated:\s*(.+?)\s*·\s*source:\s*(\S+)\s*—\s*руками не править\s*-->/u;

/**
 * @param {{generator: string, source: string, parserVersion?: string}} p
 * @returns {string}
 */
export function stampContractHeader(p) {
  const ver = p.parserVersion ?? PARSER_VERSION;
  return `<!-- contract: parser@${ver} · generated: ${p.generator} · source: ${p.source} — руками не править -->`;
}

/**
 * @param {string} text
 * @returns {{parserVersion: string|null, generator: string, source: string, legacy: boolean}|null}
 */
export function parseContractHeader(text) {
  if (typeof text !== 'string') return null;
  const first = text.split(/\r?\n/u, 1)[0] ?? '';
  const neo = first.match(CONTRACT_HEADER_RE);
  if (neo) {
    return {
      parserVersion: neo[1],
      generator: neo[2].trim(),
      source: neo[3],
      legacy: false,
    };
  }
  const legacy = first.match(LEGACY_HEADER_RE);
  if (legacy) {
    return {
      parserVersion: null,
      generator: legacy[1].trim(),
      source: legacy[2],
      legacy: true,
    };
  }
  return null;
}
