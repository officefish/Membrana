/**
 * day-memo-persona-trace — слой «Персональный след» DAY_MEMO (вердикт Q1/Q2/Q4
 * консилиума day-memo-evening-2026-07-27; требование #569).
 *
 * Восемь блоков `### <персона>` из журналов docs/virtual-team/memory/<persona>.md:
 * записи с датой = date, дословно (никакого PII и оценок сверх уже записанного).
 * Плюс строка вытеснений из team-memory-report-<date>.md, если он существует, —
 * готовый инструмент потребляется, не переизобретается.
 *
 * ГЕЙТ #569 — КОНСТРУКТИВНО: в память/наружу идёт только показанное партнёрам.
 * Нет протокола показа (team-evening-feedback-<date>.md) → stats.gated = true +
 * problems-строка. Слой только ДЕКЛАРИРУЕТ гейт; решение не публиковать — на
 * сборщике фазы 2, не здесь.
 *
 * Персона без записей — видимая строка «сегодня без записей» (честная пустота).
 * Чистый модуль: файлов не пишет; ФС — через инъекцию deps (зубы на фикстурах).
 * Контракт стыка: buildPersonaTraceLayer(repoRoot, date) → {markdown, stats, problems[]}.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Канонический состав команды (рефакторинг #1331): восемь голосов с носителями. */
export const PERSONAS = Object.freeze([
  'angelina', 'dynin', 'farrell', 'kuryokhin', 'ozhegov', 'rodchenko', 'tarasov', 'vesnin',
]);

/**
 * Записи журнала персоны за дату: строки `- YYYY-MM-DD · текст` — дословно.
 * @param {string} content @param {string} date
 * @returns {string[]}
 */
export function journalEntriesOn(content, date) {
  const out = [];
  for (const line of String(content ?? '').split(/\r?\n/u)) {
    const m = /^-\s+(\d{4}-\d{2}-\d{2})\s*·\s*(.+)$/u.exec(line.trim());
    if (m && m[1] === date && m[2].trim()) out.push(m[2].trim());
  }
  return out;
}

/**
 * Строка вытеснений персоны из team-memory-report («утонуло в подсознание …»).
 * @param {string|null} reportContent @param {string} persona
 * @returns {string|null}
 */
export function displacementLine(reportContent, persona) {
  if (!reportContent) return null;
  const block = new RegExp(`##\\s*${persona}\\s*\\n([\\s\\S]*?)(?:\\n##\\s|$)`, 'u').exec(reportContent);
  if (!block) return null;
  const line = block[1].split('\n').find((l) => l.includes('утонуло'));
  return line ? line.replace(/^\s*-\s*/u, '').trim() : null;
}

/**
 * Вёрстка слоя: восемь блоков `### <персона>`.
 * @param {{persona: string, entries: string[], displaced: string|null}[]} rows
 */
export function renderPersonaTrace(rows) {
  const lines = ['## Персональный след', ''];
  for (const r of rows) {
    lines.push(`### ${r.persona}`);
    if (r.entries.length === 0) lines.push('- сегодня без записей');
    for (const e of r.entries) lines.push(`- ${e}`);
    if (r.displaced) lines.push(`- ${r.displaced}`);
    lines.push('');
  }
  return `${lines.join('\n')}`;
}

/**
 * КОНТРАКТ СТЫКА (сигнатура неизменна): buildPersonaTraceLayer(repoRoot, date).
 * @param {string} repoRoot @param {string} date YYYY-MM-DD
 * @param {{readFile?: Function, exists?: Function}} [deps] — инъекция для зубов
 * @returns {{markdown: string, stats: object, problems: string[]}}
 */
export function buildPersonaTraceLayer(repoRoot, date, deps = {}) {
  const readFile = deps.readFile ?? ((p) => readFileSync(join(repoRoot, p), 'utf8'));
  const exists = deps.exists ?? ((p) => existsSync(join(repoRoot, p)));

  const problems = [];
  const reportRel = `docs/seanses/team-memory-report-${date}.md`;
  const report = exists(reportRel) ? readFile(reportRel) : null;
  if (!report) problems.push(`team-memory-report-${date}.md отсутствует — строка вытеснений не приложена (инструмент yarn team-memory:report)`);

  const rows = [];
  let withEntries = 0;
  for (const persona of PERSONAS) {
    const rel = `docs/virtual-team/memory/${persona}.md`;
    const entries = exists(rel) ? journalEntriesOn(readFile(rel), date) : [];
    if (!exists(rel)) problems.push(`журнал ${rel} отсутствует — персона без носителя памяти`);
    if (entries.length > 0) withEntries += 1;
    rows.push({ persona, entries, displaced: displacementLine(report, persona) });
  }

  // Гейт #569: показ партнёрам предшествует памяти. Слой декларирует, сборщик решает.
  const shownRel = `docs/seanses/team-evening-feedback-${date}.md`;
  const gated = !exists(shownRel);
  if (gated) {
    problems.push(`#569: протокола показа (${shownRel}) ещё нет — персональный след НЕ публиковать до показа партнёрам (gated=true; решение за сборщиком фазы 2)`);
  }

  return {
    markdown: renderPersonaTrace(rows),
    stats: { personas: PERSONAS.length, withEntries, withoutEntries: PERSONAS.length - withEntries, displacementsAttached: report != null, gated },
    problems,
  };
}
