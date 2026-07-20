/**
 * Живые ссылки — превратить голые упоминания PR/Issue в markdown-ссылки GitHub.
 *
 * Не про тон текста (это линза Ожегова) и не про отправку (telegram:swallow).
 * Только разворачивание `PR #N` / `Issue #N` / «PR #N, #M» в кликабельные ссылки.
 * Уже оформленные `[…](url)` не трогает.
 */

/** @typedef {{ owner?: string, repo?: string }} LiveLinksRepo */

const DEFAULT_REPO = { owner: 'officefish', repo: 'Membrana' };

/**
 * @param {LiveLinksRepo} [repo]
 * @returns {{owner: string, repo: string, base: string}}
 */
export function resolveRepo(repo = {}) {
  const owner = repo.owner ?? DEFAULT_REPO.owner;
  const name = repo.repo ?? DEFAULT_REPO.repo;
  return { owner, repo: name, base: `https://github.com/${owner}/${name}` };
}

/**
 * Найти голые (ещё не обёрнутые в markdown-link) упоминания PR/Issue.
 *
 * @param {string} text
 * @returns {{kind: 'pr'|'issue', n: number, raw: string, index: number}[]}
 */
export function findBareRefs(text) {
  const src = String(text ?? '');
  /** @type {{kind: 'pr'|'issue', n: number, raw: string, index: number}[]} */
  const hits = [];
  // `\b` перед `#` в JS не работает (# — не word-char). Lookbehind отсекает пути URL.
  const re = /(?<![\w/])(?:(PR|Issue)\s+)?#(\d+)\b/giu;
  let m;
  while ((m = re.exec(src)) !== null) {
    const n = Number(m[2]);
    if (!Number.isFinite(n) || n <= 0) continue;
    const start = m.index;
    // Уже внутри markdown-ссылки `[label](url)` — не трогаем.
    if (isInsideMarkdownLink(src, start, m[0].length)) continue;
    const kindLabel = (m[1] ?? '').toLowerCase();
    const kind = kindLabel === 'issue' ? 'issue' : 'pr';
    hits.push({ kind, n, raw: m[0], index: start });
  }
  return hits;
}

/**
 * @param {string} src
 * @param {number} start
 * @param {number} len
 */
function isInsideMarkdownLink(src, start, len) {
  const end = start + len;
  // Паттерн: [...](https://...) — если сразу после match идёт `](`, это label ссылки.
  if (src.slice(end, end + 2) === '](') return true;
  // Уже полный URL github.com/.../pull|issues/N
  const before = src.slice(Math.max(0, start - 80), start);
  if (/https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/(?:pull|issues)\/?$/iu.test(before)) {
    return true;
  }
  return false;
}

/**
 * Развернуть голые ссылки в markdown.
 *
 * @param {string} text
 * @param {LiveLinksRepo} [repo]
 * @returns {{text: string, expanded: number, skipped: number}}
 */
export function expandLiveLinks(text, repo) {
  const { base } = resolveRepo(repo);
  const src = String(text ?? '');
  const hits = findBareRefs(src);
  if (hits.length === 0) return { text: src, expanded: 0, skipped: 0 };

  // С конца, чтобы индексы не плыли.
  let out = src;
  let expanded = 0;
  for (const h of [...hits].sort((a, b) => b.index - a.index)) {
    const path = h.kind === 'issue' ? 'issues' : 'pull';
    const label = h.kind === 'issue' ? `Issue #${h.n}` : `PR #${h.n}`;
    // Если raw уже «PR #N» / «Issue #N» — label = raw (сохраняем регистр слова).
    const display = /^(PR|Issue)\b/iu.test(h.raw) ? h.raw.replace(/\s+/gu, ' ').trim() : label;
    const md = `[${display}](${base}/${path}/${h.n})`;
    out = out.slice(0, h.index) + md + out.slice(h.index + h.raw.length);
    expanded += 1;
  }
  return { text: out, expanded };
}

/**
 * Проверка: остались ли голые refs (для гейта перед ласточкой).
 *
 * @param {string} text
 * @returns {{ok: boolean, bare: ReturnType<typeof findBareRefs>}}
 */
export function checkLiveLinks(text) {
  const bare = findBareRefs(text);
  return { ok: bare.length === 0, bare };
}
