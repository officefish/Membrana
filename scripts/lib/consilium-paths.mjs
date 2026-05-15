/**
 * Пути и имена файлов консилиума (тестируемые без API).
 */
export const SEANSES_DIR = 'docs/seanses';
export const CONSILIUM_PROMPT_FILE = 'docs/prompts/CONSILIUM_PROMPT.md';

/** Порядок ролей по умолчанию (метки в протоколе). */
export const CONSILIUM_ROLES = [
  { key: 'teamlead', label: 'Teamlead', tag: '[Teamlead]' },
  { key: 'structurer', label: 'Структурщик', tag: '[Структурщик]' },
  { key: 'mathematician', label: 'Математик', tag: '[Математик]' },
  { key: 'musician', label: 'Музыкант', tag: '[Музыкант]' },
  { key: 'layout', label: 'Верстальщик', tag: '[Верстальщик]' },
];

/**
 * Детерминированный PRNG (mulberry32) для --seed.
 * @param {number} seed
 */
export function createRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates; при seed — воспроизводимый порядок. */
export function shuffleRoles(roles, seed) {
  const arr = [...roles];
  const rng = seed === undefined ? Math.random : createRng(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** slug для имени файла: латиница/кириллица/цифры, дефисы. */
export function slugify(text, maxLen = 48) {
  const base = String(text)
    .trim()
    .slice(0, maxLen)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'consilium';
}

/** `brandbook` + `2026-05-15` → `docs/seanses/brandbook-2026-05-15.md` */
export function resolveSeansePath({ cwd, saveAs, question, date = new Date() }) {
  const day = date.toISOString().slice(0, 10);
  const slug = saveAs ? slugify(saveAs, 64) : slugify(question, 48);
  return `${SEANSES_DIR}/${slug}-${day}.md`;
}

export function formatRoleOrderLine(orderedRoles) {
  return orderedRoles.map((r) => r.label).join(' → ');
}
