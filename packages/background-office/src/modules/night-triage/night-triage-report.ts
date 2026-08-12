/**
 * Night Triage — детерминированный рендер отчёта (NT2).
 *
 * Формат консилиума `docs/seanses/night-triage-routine-2026-07-10.md`:
 * сводка первой строкой; по таблице на категорию (id · ссылка · действие);
 * high/low визуально разделены (low — отдельной таблицей «требует проверки»);
 * для stale — колонка dwell-time; сортировка по id (уже в снапшоте).
 * Чистая функция от TriageSnapshot — без Date.now/IO, два прогона совпадают.
 */

import { snapshotFingerprint, type TriageFinding, type TriageSnapshot } from './night-triage-core';
import type { PromoteCandidate } from './night-triage-promote';

export interface RenderOptions {
  /** Дата среза YYYY-MM-DD (для заголовка). */
  readonly date: string;
  /** owner/repo для ссылок на issue. */
  readonly repoSlug?: string;
  /**
   * Витрина промоута (#1445, п.6 — Родченко): пустоту НЕ прячем. Отсутствие
   * поля = старый вызов, секции промоута не рендерятся (обратная совместимость);
   * присутствие с cards: [] рендерит честный `cards: 0` с причиной тишины.
   */
  readonly promote?: {
    readonly cards: readonly PromoteCandidate[];
    /** Строки стыка с магистралью дня (п.5) — одна на пункт среза. */
    readonly focus: readonly string[];
    /** insight_yield словом (метрика v0, Дынин). */
    readonly yieldText: string;
    /** Черновиков закрыто этим тактом (шапка counters). */
    readonly draftsClosed: number;
  };
}

const DEFAULT_REPO = 'officefish/Membrana';

/** Начало маркера отпечатка. Отдельной константой: его читает порог публикации. */
export const FINGERPRINT_MARKER = '<!-- night-triage:fingerprint';

/**
 * Достать отпечаток из посаженного отчёта. `null` — отчёт старее маркера (посажен до
 * 07.08) либо маркера в нём нет: это «основания для сравнения нет», а НЕ «дельта нулевая».
 * Разница несущая — на `null` порог обязан пропускать, иначе первый же прогон онемеет.
 */
export function extractFingerprint(report: string): string | null {
  const m = new RegExp(`${FINGERPRINT_MARKER} ([0-9a-f]{64}) -->`).exec(report);
  return m?.[1] ?? null;
}

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

/**
 * Секции промоута (#1445): кандидаты со scorecard и стык с магистралью дня.
 * `cards: 0` — честной строкой с причиной, не молчанием (п.6).
 */
function promoteSections(promote: NonNullable<RenderOptions['promote']>): string[] {
  const lines: string[] = ['## Кандидаты в карточку инсайта', ''];
  if (promote.cards.length === 0) {
    lines.push(
      '_cards: 0 — наблюдений, достойных карточки, срез не дал; счётчики кандидатами не являются._',
      '',
    );
  } else {
    lines.push(
      '| id | причина | gap | cost | reversible |',
      '| --- | --- | --- | --- | --- |',
      ...promote.cards.map(
        (c) => `| \`${c.id}\` | ${c.reason} | ${c.scorecard.gap} | ${c.scorecard.cost} | ${c.scorecard.reversible} |`,
      ),
      '',
    );
  }
  lines.push('## Стык с магистралью дня', '', ...promote.focus.map((f) => `- ${f}`), '');
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
    // Отпечаток состава — основание порога публикации (`#night-triage-yield-zero`).
    // Живёт в ПОСАЖЕННОМ отчёте, потому что сравнивать надо с тем, что ствол получил,
    // а не с тем, что механизм когда-то предлагал. Комментарий, а не таблица: он для
    // машины, и читателю отчёта в глаза не лезет.
    `${FINGERPRINT_MARKER} ${snapshotFingerprint(snapshot)} -->`,
    '',
    clean
      ? '**Сводка:** реестр чист — расхождений не найдено.'
      : `**Сводка:** ghost ${ghost} · orphan ${orphan} · stale ${stale}.`,
    ...(opts.promote
      ? ['', `**cards: ${opts.promote.cards.length} · drafts_closed: ${opts.promote.draftsClosed}** · ${opts.promote.yieldText}`]
      : []),
    '',
    `> Производный артефакт (sink not source): рекомендации, не действия — исполняет человек. ` +
      `Порог stale ${snapshot.staleThresholdDays} дн. Сгенерирован ${snapshot.generatedAt}.`,
    '',
    ...(opts.promote ? promoteSections(opts.promote) : []),
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
