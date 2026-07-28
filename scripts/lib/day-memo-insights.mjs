/**
 * day-memo-insights — слой «Инсайты» DAY_MEMO (вердикт Q1/Q2 консилиума
 * day-memo-evening-2026-07-27, ратифицирован магистралью 28.07).
 *
 * v1 — ЦИТАТНЫЙ путь, без LLM (законный канал, не фолбэк-обман): выводы дня
 * собираются из уже написанных артефактов —
 *   · строки «Итогового решения» консилиумов дня (docs/seanses/*-<date>.md);
 *   · хайлайты вечернего фидбека (сводка предложений), если протокол уже есть;
 *   · Conclusion кейсов, тронутых коммитами этого дня (git-факт, не mtime).
 * Каждый вывод — цитата с УКАЗАТЕЛЕМ (файл · секция) и тегом [Q: <источник>] (Q1).
 * Цитата без указателя не выходит наружу — это problem, не строка.
 *
 * Точка расширения (Q2): SCRIBE_CONTRACT — контракт будущего LLM-scribe под
 * оркестрацией Ангелины; сигнатура buildInsightsLayer при его появлении не меняется.
 *
 * Чистый модуль: файлов НЕ пишет; чтение — через инъекцию deps (тестируется на
 * фикстурах без ФС). Контракт стыка: buildInsightsLayer(repoRoot, date) →
 * {markdown, stats, problems[]} — сигнатура неизменна.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Контракт будущего LLM-scribe (Q2). Экспорт — описание, не вызов: LLM здесь не зовут. */
export const SCRIBE_CONTRACT = Object.freeze({
  role: 'scribe (субагент под оркестрацией Ангелины; вечерняя цепочка, фаза 2)',
  input: 'материал дня: цитатный слой v1 (этот модуль), конспекты/протоколы дня, факты day:memo:facts',
  output: '3–7 выводов дня; КАЖДЫЙ с провенансом {файл · секция | sessionId · uuid} и тегом [Q: scribe]',
  laws: [
    'вывод без провенанса не существует (закон Raw)',
    'цитатный слой v1 остаётся в документе рядом — scribe дополняет, не замещает',
    'отсутствие scribe ⇒ слой v1 самодостаточен (не фолбэк, а канал)',
  ],
});

const trim = (s, n = 220) => {
  const t = String(s ?? '').replace(/\s+/gu, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/** @typedef {{quote: string, pointer: string, q: string}} InsightEntry */

/**
 * Строки «Итогового решения» одного протокола → выводы.
 * @param {string} content @param {string} relPath
 * @returns {InsightEntry[]}
 */
export function insightsFromVerdict(content, relPath) {
  const out = [];
  const m = /##\s*Итоговое решение[^\n]*\n([\s\S]*?)(?:\n##[^#]|\n---|$)/u.exec(content ?? '');
  if (!m) return out;
  const slug = relPath.split('/').pop().replace(/\.md$/u, '');
  for (const line of m[1].split('\n')) {
    const row = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/u.exec(line);
    if (!row || /^-+$/u.test(row[1]) || /^Вопрос$/iu.test(row[1])) continue;
    out.push({
      quote: `${trim(row[1], 60)}: ${trim(row[2])}`,
      pointer: `${relPath} · Итоговое решение`,
      q: `консилиум ${slug}`,
    });
  }
  return out;
}

/**
 * Хайлайты фидбека: пункты «Сводки предложений на завтра».
 * @param {string|null} content @param {string} relPath
 * @returns {InsightEntry[]}
 */
export function insightsFromFeedback(content, relPath) {
  if (!content) return [];
  const m = /###\s*Сводка предложений[^\n]*\n([\s\S]*?)(?:\n###|\n##[^#]|$)/u.exec(content);
  if (!m) return [];
  return m[1]
    .split('\n')
    .filter((l) => /^\s*[-*\d]/u.test(l))
    .map((l) => ({
      quote: trim(l.replace(/^\s*[-*]\s*|^\s*\d+[.)]\s*/u, '')),
      pointer: `${relPath} · Сводка предложений на завтра`,
      q: 'вечерний фидбек',
    }))
    .filter((e) => e.quote.length > 0);
}

/**
 * Conclusion кейса → вывод. Кейс без Conclusion — problem у вызывающего.
 * @param {string} content @param {string} relPath
 * @returns {InsightEntry|null}
 */
export function insightFromCase(content, relPath) {
  const m = /##\s*Conclusion\s*\n([\s\S]*?)(?:\n##|$)/u.exec(content ?? '');
  if (!m) return null;
  const id = relPath.split('/').pop().replace(/\.md$/u, '');
  return { quote: trim(m[1], 260), pointer: `${relPath} · Conclusion`, q: `кейс ${id}` };
}

/**
 * Вёрстка слоя. ЗАКОН: запись без указателя не выходит — уходит в problems.
 * @param {InsightEntry[]} entries
 * @returns {{markdown: string, kept: InsightEntry[], problems: string[]}}
 */
export function renderInsights(entries) {
  const problems = [];
  const kept = [];
  for (const e of entries ?? []) {
    if (!e || !String(e.pointer ?? '').trim()) {
      problems.push(`инсайт без указателя не публикуется: «${trim(e?.quote, 60)}» — закон Raw`);
      continue;
    }
    kept.push(e);
  }
  const lines = ['## Инсайты', ''];
  if (kept.length === 0) lines.push('_выводов дня нет — честная пустота, не сбой_');
  for (const e of kept) lines.push(`- «${e.quote}» — [Q: ${e.q}] (${e.pointer})`);
  return { markdown: `${lines.join('\n')}\n`, kept, problems };
}

/** Кейсы, тронутые коммитами даты (git-факт дня; mtime не доказательство). */
function casesTouchedOn(repoRoot, date, run) {
  try {
    const out = String(run('git', [
      'log', `--since=${date} 00:00`, `--until=${date} 23:59`, '--name-only', '--format=',
      '--', 'docs/meeting/bridge-command-post/cases',
    ], { cwd: repoRoot, encoding: 'utf8', timeout: 30_000 }));
    return [...new Set(out.split(/\r?\n/u).filter((l) => l.endsWith('.md')))];
  } catch {
    return [];
  }
}

/**
 * КОНТРАКТ СТЫКА (сигнатура неизменна): buildInsightsLayer(repoRoot, date).
 * @param {string} repoRoot @param {string} date YYYY-MM-DD
 * @param {{readFile?: Function, exists?: Function, listDir?: Function, run?: Function}} [deps] — инъекция для зубов
 * @returns {{markdown: string, stats: object, problems: string[]}}
 */
export function buildInsightsLayer(repoRoot, date, deps = {}) {
  const readFile = deps.readFile ?? ((p) => readFileSync(join(repoRoot, p), 'utf8'));
  const exists = deps.exists ?? ((p) => existsSync(join(repoRoot, p)));
  const listDir = deps.listDir ?? ((p) => (existsSync(join(repoRoot, p)) ? readdirSync(join(repoRoot, p)) : []));
  const run = deps.run ?? execFileSync;

  const problems = [];
  const entries = [];

  for (const name of listDir('docs/seanses')) {
    if (!name.endsWith(`-${date}.md`)) continue;
    const rel = `docs/seanses/${name}`;
    entries.push(...insightsFromVerdict(readFile(rel), rel));
  }

  const feedbackRel = `docs/seanses/team-evening-feedback-${date}.md`;
  if (exists(feedbackRel)) entries.push(...insightsFromFeedback(readFile(feedbackRel), feedbackRel));

  for (const rel of deps.touchedCases ?? casesTouchedOn(repoRoot, date, run)) {
    const e = insightFromCase(readFile(rel), rel);
    if (e) entries.push(e);
    else problems.push(`кейс ${rel} без секции Conclusion — вывод не извлечён`);
  }

  const { markdown, kept, problems: renderProblems } = renderInsights(entries);
  return {
    markdown,
    stats: {
      total: kept.length,
      byQ: kept.reduce((acc, e) => {
        const k = e.q.split(' ')[0];
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {}),
      scribe: 'v1: цитатный канал; scribe — фаза 2 (SCRIBE_CONTRACT)',
    },
    problems: [...problems, ...renderProblems],
  };
}
