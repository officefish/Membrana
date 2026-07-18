/**
 * day-work-diff — дифф РАБОТЫ ДНЯ для daily code-review (rt-8, #539).
 *
 * Расследование `code-review-honesty-report-2026-07-16`: вечернее ревью смотрело на
 * `collectRepositoryContext` (снимок рабочего дерева) и оценивало ОСТАТОК дерева, а
 * не работу дня. 15.07 день крупных слияний получил вердикт «T0 docs-only, Runtime
 * не затронут» — потому что вечером всё уже смёржено и в дереве остались только docs.
 *
 * Консилиум `code-review-honesty-refactor-2026-07-16` (Вариант A): daily ревьюит
 * дифф коммитов дня. Deep research (Q2) подтвердил: подают дифф main утром-vs-вечером
 * или squash-коммиты, а не сырое дерево.
 *
 * ОТКЛОНЕНИЕ ОТ БУКВЫ КОНСИЛИУМА (проверено на живом репо 16.07): фолбэк «git log
 * --merges» нашёл бы НОЛЬ — squash-мёрж это ОБЫЧНЫЙ коммит на main, не merge-коммит.
 * Правильный механизм — диапазон `git log --since` (как в `todaysCommits`), где
 * каждый коммит дня = один PR. Поэтому источник границ один и офлайновый, а не
 * двухуровневый gh→git; PR-номер тянем из темы `(#N)` без сети.
 *
 * Q2 (сегментация): день Membrana часто >> 400 строк (16.07: 4535). Ревьюим ПО
 * КОММИТАМ — каждый squash-мёрж уже PR-размера; oversized помечаем, НЕ обрезаем молча.
 */
import { execFileSync } from 'node:child_process';

/** Порог «oversized» — ориентир ревью из research и из PR-режима (target ≤400). */
export const OVERSIZED_CHANGED_LINES = 400;

/**
 * Разобрать вывод `git log --format=%H %s` (SHA пробел subject, по строке на коммит).
 * SHA — 40 hex без пробелов, поэтому делим по ПЕРВОМУ пробелу: subject сохраняется.
 *
 * @param {string} logText
 * @returns {readonly {sha: string, subject: string, pr: number|null}[]} oldest-first
 */
export function parseDayCommits(logText) {
  const lines = String(logText ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line) => {
    const sep = line.indexOf(' ');
    const sha = sep === -1 ? line : line.slice(0, sep);
    const subject = sep === -1 ? '' : line.slice(sep + 1);
    const m = subject.match(/\(#(\d+)\)/u);
    return { sha, subject, pr: m ? Number(m[1]) : null };
  });
}

/**
 * Границы периода из коммитов дня (oldest-first).
 *
 * base = родитель самого раннего коммита дня (`<sha>^`) — состояние main ДО работы
 * дня; head = самый поздний коммит. Пусто → null (нечего ревьюить, не ошибка).
 *
 * @param {readonly {sha: string}[]} commits oldest-first
 * @returns {{ base: string, head: string, count: number } | null}
 */
export function dayPeriodRange(commits) {
  const list = commits ?? [];
  if (list.length === 0) return null;
  const oldest = list[0].sha;
  const newest = list[list.length - 1].sha;
  return { base: `${oldest}^`, head: newest, count: list.length };
}

/** Сумма изменённых строк из `git diff --shortstat` (`N insertions, M deletions`). */
export function changedLinesFromShortstat(shortstat) {
  const text = String(shortstat ?? '');
  const ins = Number(text.match(/(\d+)\s+insertion/u)?.[1] ?? 0);
  const del = Number(text.match(/(\d+)\s+deletion/u)?.[1] ?? 0);
  return ins + del;
}

/** Oversized ли сегмент по числу изменённых строк. */
export function isSegmentOversized(changedLines) {
  return Number(changedLines) > OVERSIZED_CHANGED_LINES;
}

const DEFAULT_RUN = (args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    return '';
  }
};

/**
 * Собрать дифф работы дня, сегментированный по коммитам.
 *
 * `run` — шов для тестов (детерминизм без git/сети). Возвращает stdout `git`.
 *
 * @param {{ since?: string, run?: (args: string[]) => string }} [opts]
 * @returns {{
 *   mode: 'работа дня' | 'нет коммитов за период',
 *   precision: 'exact',
 *   period: { base: string, head: string, count: number } | null,
 *   commits: readonly {sha: string, subject: string, pr: number|null}[],
 *   segments: readonly {sha: string, subject: string, pr: number|null,
 *     changedLines: number, oversized: boolean, diff: string}[],
 * }}
 */
export function collectDayWorkDiff(opts = {}) {
  const run = opts.run ?? DEFAULT_RUN;
  const since = opts.since ?? 'midnight';
  const logText = run(['log', `--since=${since}`, '--reverse', '--format=%H %s']);
  const commits = parseDayCommits(logText);
  const period = dayPeriodRange(commits);

  if (period === null) {
    return { mode: 'нет коммитов за период', precision: 'exact', period: null, commits: [], segments: [] };
  }

  const segments = commits.map((c) => {
    const shortstat = run(['diff', '--shortstat', `${c.sha}^..${c.sha}`]);
    const changedLines = changedLinesFromShortstat(shortstat);
    const oversized = isSegmentOversized(changedLines);
    // oversized — помечаем и НЕ тянем гигантский дифф в контекст: обрезка молчаливая
    // (MAX_DIFF_CHARS) — тот же класс тихого сбоя, что и слепота. Пусть ревьюер видит
    // пометку и решит, а не получит обрезок, выглядящий как целое.
    const diff = oversized ? '' : run(['diff', `${c.sha}^..${c.sha}`]);
    return { sha: c.sha, subject: c.subject, pr: c.pr, changedLines, oversized, diff };
  });

  return { mode: 'работа дня', precision: 'exact', period, commits, segments };
}

/**
 * Честная шапка артефакта: режим / precision / период / посегментная сводка.
 *
 * Конец молчаливому «Runtime не затронут»: режим и границы — в тексте, не только в
 * тоне вердикта. Oversized-сегменты названы явно, а не выпадают.
 */
export function formatDayReviewHeader(result) {
  const lines = [`Режим: ${result.mode}`, `Precision: ${result.precision}`];
  if (result.period === null) {
    lines.push('Период: — (за сегодня коммитов нет — ревьюить нечего)');
    return lines.join('\n');
  }
  const { base, head, count } = result.period;
  lines.push(`Период: ${base}..${head} (${count} коммит(ов))`);
  const oversized = result.segments.filter((s) => s.oversized);
  if (oversized.length > 0) {
    lines.push(
      `⚠ Oversized (>${OVERSIZED_CHANGED_LINES} строк, дифф не развёрнут — ревьюить отдельно): ` +
        oversized.map((s) => `${s.sha.slice(0, 8)}${s.pr ? ` #${s.pr}` : ''} (${s.changedLines})`).join(', '),
    );
  }
  return lines.join('\n');
}

/** Контекст для LLM: шапка + посегментные диффы (oversized — пометкой, без тела). */
export function formatDayWorkContext(result) {
  const parts = [formatDayReviewHeader(result), ''];
  for (const s of result.segments) {
    const head = `### ${s.sha.slice(0, 8)}${s.pr ? ` (#${s.pr})` : ''} — ${s.subject} [${s.changedLines} строк]`;
    if (s.oversized) {
      parts.push(head, `(oversized — дифф не развёрнут, ревьюить как отдельный PR)`, '');
    } else {
      parts.push(head, '```diff', s.diff.trimEnd(), '```', '');
    }
  }
  return parts.join('\n');
}
