/**
 * precedent-store — чистое ядро контейнера прецедентов (спринт precedent-container).
 *
 * Источник истины — сами файлы `docs/precedents/<id>.md` с мета-блоком
 * `<!-- precedent-meta { … } -->`. Реестр — производный снимок. Класс — из
 * `docs/precedents/classes.json` (закрытый enum; свободный текст врёт счётчику рецидива).
 * Счётчик рецидива — детерминированная агрегация по class/canonicalCause, без ML.
 *
 * Канон: docs/precedents/README.md · инсайт insight-precedent-container.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const META_RE = /<!--\s*precedent-meta\s*([\s\S]*?)-->/u;

const REQUIRED = ['id', 'date', 'class', 'symptom', 'rootCause', 'fix'];
const OPTIONAL = ['canonicalCause', 'prevention', 'actionItems', 'related'];
const KNOWN = [...REQUIRED, ...OPTIONAL];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;
const ACTION_STATUSES = ['open', 'done', 'wontfix'];

const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * Прочитать закрытый перечень классов. Отсутствие/битость classes.json — ОШИБКА,
 * а не пустой enum: иначе гейт класса тихо отключается (объявленное ≠ работающее).
 * @returns {Set<string>}
 * @throws Error если classes.json нет или не парсится
 */
export function loadClassKeys(repoRoot) {
  const p = join(repoRoot, 'docs', 'precedents', 'classes.json');
  if (!existsSync(p)) throw new Error('docs/precedents/classes.json отсутствует (enum классов обязателен)');
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    throw new Error('docs/precedents/classes.json — битый JSON');
  }
  return new Set((parsed.classes ?? []).map((c) => c.key));
}

/** Календарная валидность YYYY-MM-DD (2026-13-45 — не дата). */
function isCalendarDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Извлечь мета-блок из markdown прецедента.
 * @param {string} md
 * @returns {{meta: object|null, error: string|null}}
 */
export function parsePrecedent(md) {
  const m = META_RE.exec(md);
  if (!m) return { meta: null, error: 'мета-блок <!-- precedent-meta … --> не найден' };
  try {
    return { meta: JSON.parse(m[1]), error: null };
  } catch {
    return { meta: null, error: 'мета-блок — битый JSON' };
  }
}

/**
 * Проверить мета прецедента.
 * @param {object} meta
 * @param {Set<string>} classKeys закрытый enum классов
 * @param {string} [fileBase] имя файла без .md (id обязан совпасть)
 * @returns {string[]} дефекты
 */
export function validatePrecedentMeta(meta, classKeys, fileBase) {
  const problems = [];
  if (meta === null || typeof meta !== 'object' || Array.isArray(meta)) {
    return ['мета — не объект'];
  }
  const keys = Object.keys(meta);
  for (const k of REQUIRED) if (!keys.includes(k)) problems.push(`нет поля ${k}`);
  for (const k of keys) if (!KNOWN.includes(k)) problems.push(`лишнее поле ${k}`);

  for (const k of ['id', 'symptom', 'rootCause', 'fix']) {
    if (keys.includes(k) && !isNonEmptyString(meta[k])) problems.push(`${k} — не непустая строка`);
  }
  if (keys.includes('id') && fileBase && meta.id !== fileBase) {
    problems.push(`id «${meta.id}» ≠ имени файла «${fileBase}»`);
  }
  if (keys.includes('date') && !isCalendarDate(meta.date)) {
    problems.push('date — не календарная YYYY-MM-DD');
  }
  if (keys.includes('class')) {
    if (!isNonEmptyString(meta.class)) problems.push('class — не непустая строка');
    else if (!classKeys.has(meta.class)) {
      problems.push(`class «${meta.class}» вне закрытого перечня classes.json`);
    }
  }
  for (const k of ['canonicalCause', 'prevention']) {
    if (keys.includes(k) && !isNonEmptyString(meta[k])) problems.push(`${k} — не непустая строка`);
  }
  if (keys.includes('related')) {
    if (!Array.isArray(meta.related) || meta.related.some((r) => !isNonEmptyString(r))) {
      problems.push('related — не массив непустых строк');
    }
  }
  if (keys.includes('actionItems')) {
    if (!Array.isArray(meta.actionItems)) {
      problems.push('actionItems — не массив');
    } else {
      meta.actionItems.forEach((a, i) => {
        if (a === null || typeof a !== 'object' || Array.isArray(a)) {
          problems.push(`actionItems[${i}] — не объект`);
        } else {
          if (!isNonEmptyString(a.text)) problems.push(`actionItems[${i}].text — не непустая строка`);
          if (!isNonEmptyString(a.owner)) problems.push(`actionItems[${i}].owner — не непустая строка`);
          if (!ACTION_STATUSES.includes(a.status)) problems.push(`actionItems[${i}].status — не из ${ACTION_STATUSES.join('|')}`);
        }
      });
    }
  }
  return problems;
}

/**
 * Собрать все прецеденты дома.
 * @param {string} repoRoot
 * @returns {{file: string, id: string, meta: object|null, problems: string[]}[]}
 */
export function listPrecedents(repoRoot) {
  const dir = join(repoRoot, 'docs', 'precedents');
  const classKeys = loadClassKeys(repoRoot);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md') && e.name !== 'README.md')
    .map((e) => {
      const fileBase = e.name.slice(0, -3);
      const { meta, error } = parsePrecedent(readFileSync(join(dir, e.name), 'utf8'));
      const problems = error ? [error] : validatePrecedentMeta(meta, classKeys, fileBase);
      return { file: e.name, id: meta?.id ?? fileBase, meta, problems };
    })
    .sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
}

/**
 * Счётчик по классу.
 * @param {{meta: object|null}[]} precedents
 * @returns {Map<string, number>}
 */
export function countByClass(precedents) {
  const m = new Map();
  for (const p of precedents) {
    const c = p.meta?.class;
    if (isNonEmptyString(c)) m.set(c, (m.get(c) ?? 0) + 1);
  }
  return m;
}

/**
 * Доля рецидива: (всего − различных классов) / всего. Порог-ориентир ≤ 0.15 (research).
 * @param {{meta: object|null}[]} precedents
 * @returns {number} 0..1
 */
export function recurrenceRate(precedents) {
  const classed = precedents.filter((p) => isNonEmptyString(p.meta?.class));
  const total = classed.length;
  if (total === 0) return 0;
  const distinct = countByClass(classed).size;
  return (total - distinct) / total;
}

/**
 * Отрендерить снимок-реестр (детерминированно, дата приходит извне).
 * @param {{file: string, id: string, meta: object|null, problems: string[]}[]} precedents
 * @param {{date: string, sha: string}} meta
 * @returns {string} markdown
 */
export function renderSnapshot(precedents, { date, sha } = {}) {
  const counts = countByClass(precedents);
  const rate = recurrenceRate(precedents);
  const lines = [];
  lines.push('# PRECEDENTS — снимок-реестр (производный, руками не править)');
  lines.push('');
  lines.push(`> Meta · Date: ${date ?? '—'} · SHA: ${sha ?? '—'} · Source: docs/precedents/*.md`);
  lines.push('> Пересобрать: `yarn precedent:register --rebuild`. Источник истины — файлы прецедентов.');
  lines.push('');
  lines.push(`Всего прецедентов: **${precedents.length}** · различных классов: **${counts.size}** · доля рецидива: **${(rate * 100).toFixed(0)}%** (ориентир ≤15%).`);
  lines.push('');
  lines.push('## Рецидив по классам');
  lines.push('');
  lines.push('| Класс | Прецедентов |');
  lines.push('|-------|-------------|');
  for (const [c, n] of [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))) {
    lines.push(`| ${c} | ${n}${n > 1 ? ' ⚠ рецидив' : ''} |`);
  }
  lines.push('');
  lines.push('## Прецеденты');
  lines.push('');
  lines.push('| Дата | Класс | Прецедент | Корень |');
  lines.push('|------|-------|-----------|--------|');
  const cell = (v) => String(v ?? '—').replace(/[|\r\n]+/gu, ' ').trim();
  for (const p of precedents) {
    const m = p.meta ?? {};
    const root = isNonEmptyString(m.canonicalCause) ? m.canonicalCause : (m.rootCause ?? '—');
    const flag = p.problems.length ? ' ✗' : '';
    lines.push(`| ${cell(m.date)} | ${cell(m.class)} | [${cell(p.id)}](../${p.file})${flag} | ${cell(root).slice(0, 80)} |`);
  }
  lines.push('');
  return lines.join('\n');
}
