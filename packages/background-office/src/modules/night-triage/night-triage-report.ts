/**
 * Night Triage — детерминированный рендер отчёта (NT2).
 *
 * Формат консилиума `docs/seanses/night-triage-routine-2026-07-10.md`:
 * сводка первой строкой; по таблице на категорию (id · ссылка · действие);
 * high/low визуально разделены (low — отдельной таблицей «требует проверки»);
 * для stale — колонка dwell-time; сортировка по id (уже в снапшоте).
 * Чистая функция от TriageSnapshot — без Date.now/IO, два прогона совпадают.
 */

import type { TriageFinding, TriageSnapshot } from './night-triage-core';

export interface RenderOptions {
  /** Дата среза YYYY-MM-DD (для заголовка). */
  readonly date: string;
  /** owner/repo для ссылок на issue. */
  readonly repoSlug?: string;
}

const DEFAULT_REPO = 'officefish/Membrana';

function issueLink(issue: number | null, repoSlug: string): string {
  return issue === null ? '—' : `[#${issue}](https://github.com/${repoSlug}/issues/${issue})`;
}

function splitByConfidence(findings: readonly TriageFinding[]): {
  high: TriageFinding[];
  low: TriageFinding[];
} {
  const high = findings.filter((f) => f.confidence === 'high');
  const low = findings.filter((f) => f.confidence === 'low');
  return { high, low };
}

function ghostRow(f: TriageFinding, repo: string): string {
  return `| \`${f.id}\` | ${issueLink(f.issue, repo)} | ${f.action} |`;
}
function orphanRow(f: TriageFinding): string {
  return `| \`${f.id}\` | ${f.action} |`;
}
function staleRow(f: TriageFinding, repo: string): string {
  return `| \`${f.id}\` | ${issueLink(f.issue, repo)} | ${f.dwellDays ?? '—'} | ${f.action} |`;
}

function section(
  title: string,
  findings: readonly TriageFinding[],
  header: string,
  rowFn: (f: TriageFinding) => string,
): string[] {
  const lines: string[] = [`## ${title} (${findings.length})`, ''];
  if (findings.length === 0) {
    lines.push('_нет находок_', '');
    return lines;
  }
  const { high, low } = splitByConfidence(findings);
  const cols = header.split('|').slice(1, -1).length;
  const separator = `|${' --- |'.repeat(cols)}`;
  const table = (rows: readonly TriageFinding[]): string[] => [
    header,
    separator,
    ...rows.map(rowFn),
    '',
  ];
  if (high.length > 0) {
    lines.push(...table(high));
  }
  if (low.length > 0) {
    lines.push('**Требует проверки (низкая уверенность)**', '', ...table(low));
  }
  return lines;
}

/** Рендерит детерминированный markdown-отчёт из среза триажа. */
export function renderTriageReport(snapshot: TriageSnapshot, opts: RenderOptions): string {
  const repo = opts.repoSlug ?? DEFAULT_REPO;
  const { ghost, orphan, stale } = snapshot.counts;
  const clean = ghost + orphan + stale === 0;

  const lines: string[] = [
    `# Night Triage ${opts.date}`,
    '',
    clean
      ? '**Сводка:** реестр чист — расхождений не найдено.'
      : `**Сводка:** ghost ${ghost} · orphan ${orphan} · stale ${stale}.`,
    '',
    `> Производный артефакт (sink not source): рекомендации, не действия — исполняет человек. ` +
      `Порог stale ${snapshot.staleThresholdDays} дн. Сгенерирован ${snapshot.generatedAt}.`,
    '',
    ...section('Ghost', snapshot.ghosts, '| id | issue | действие |', (f) => ghostRow(f, repo)),
    ...section('Orphan', snapshot.orphans, '| id | действие |', orphanRow),
    ...section(
      'Stale',
      snapshot.stale,
      '| id | issue | dwell (дн) | действие |',
      (f) => staleRow(f, repo),
    ),
  ];
  return lines.join('\n').replace(/\n+$/, '\n');
}
