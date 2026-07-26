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

/**
 * Миграция legacy-штампа → contract: parser@… (Ф4). Тело не трогает.
 * @param {string} text
 * @param {{parserVersion?: string}} [opts]
 * @returns {{ok: true, text: string}|{ok: false, error: string}}
 */
export function migrateLegacyContractText(text, opts = {}) {
  const header = parseContractHeader(text);
  if (!header) return { ok: false, error: 'нет штампа' };
  if (!header.legacy) return { ok: false, error: 'уже neo-штамп (не legacy)' };
  const nl = text.indexOf('\n');
  const body = nl === -1 ? '' : text.slice(nl + 1);
  const neo = stampContractHeader({
    generator: header.generator,
    source: header.source,
    parserVersion: opts.parserVersion ?? PARSER_VERSION,
  });
  return { ok: true, text: body === '' ? `${neo}\n` : `${neo}\n${body}` };
}
