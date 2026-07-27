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
 * ЧИСЛЕННЫЕ ссылки без адреса (хотфикс 27.07, кейс 26.07): «задачи 1298, 1303» —
 * число читается как Issue/PR, но не несёт ни `#`, ни URL: телеграм не сделает его
 * ссылкой, а `--check` по `#N` его не видел — зелёный гейт не доказывал кликабельность.
 *
 * Ловим ТОЛЬКО при контекст-слове в той же строке (задач/изменени/эпик/тикет/Issue/PR/№),
 * иначе шумели бы на годах и портах. Годы 20xx исключены явно; код-заборы пропускаются.
 *
 * @param {string} text
 * @returns {{ n: number, raw: string, line: number }[]}
 */
export function findNakedNumbers(text) {
  /** @type {{ n: number, raw: string, line: number }[]} */
  const hits = [];
  const CONTEXT = /(задач|изменени|эпик|тикет|issue|\bpr\b|№)/iu;
  const lines = String(text ?? '').split('\n');
  let fenced = false;
  lines.forEach((line, i) => {
    if (/^```/u.test(line)) { fenced = !fenced; return; }
    if (fenced || !CONTEXT.test(line)) return;
    for (const m of line.matchAll(/(?<![#\w/.])(\d{3,5})\b/gu)) {
      const n = Number(m[1]);
      if (n >= 2000 && n <= 2099) continue; // годы
      if (isInsideMarkdownLink(line, m.index ?? 0, m[1].length)) continue;
      if (/https?:\/\/\S*$/u.test(line.slice(0, m.index))) continue; // внутри URL
      hits.push({ n, raw: m[1], line: i + 1 });
    }
  });
  return hits;
}

/**
 * Проверка: остались ли голые refs (для гейта перед ласточкой).
 * Два класса находок: `bare` — `#N` без ссылки (чинит expand), `naked` — число без
 * адреса вовсе (чинит автор: полный URL или `#N`).
 *
 * @param {string} text
 * @returns {{ok: boolean, bare: ReturnType<typeof findBareRefs>, naked: ReturnType<typeof findNakedNumbers>}}
 */
export function checkLiveLinks(text) {
  const bare = findBareRefs(text);
  const naked = findNakedNumbers(text);
  return { ok: bare.length === 0 && naked.length === 0, bare, naked };
}
