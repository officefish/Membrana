/**
 * Night Triage — LLM-нарратив (NT3).
 *
 * Детерминированные таблицы (NT1/NT2) — источник истины и НЕ меняются LLM.
 * Здесь только: (1) чистый билдер промпта из среза, (2) вставка прозаического
 * раздела-комментария в отчёт. Сам вызов OpenRouter — в сервисе (NT4), graceful:
 * нет ключа/ошибка → отчёт остаётся детерминированным без раздела.
 */

import type { TriageFinding, TriageSnapshot } from './night-triage-core';

const SECTION_HEADING = '## Обзор (LLM-нарратив)';

function ghostClusters(ghosts: readonly TriageFinding[]): string {
  const byIssue = new Map<number, string[]>();
  for (const g of ghosts) {
    if (g.issue === null) continue;
    const arr = byIssue.get(g.issue) ?? [];
    arr.push(g.id);
    byIssue.set(g.issue, arr);
  }
  return [...byIssue.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([issue, ids]) => `#${issue}: ${ids.length} задач (${ids.slice(0, 4).join(', ')}${ids.length > 4 ? ', …' : ''})`)
    .join('; ');
}

function topStale(stale: readonly TriageFinding[], n = 5): string {
  return [...stale]
    .sort((a, b) => (b.dwellDays ?? 0) - (a.dwellDays ?? 0))
    .slice(0, n)
    .map((s) => `${s.id} (${s.dwellDays ?? '?'}д)`)
    .join(', ');
}

/**
 * Детерминированный промпт: LLM интерпретирует ГОТОВЫЙ срез, не выдумывая id/issue
 * и не меняя рекомендаций. Просим краткую прозу (RU) с приоритетом внимания.
 */
export function buildNarrativePrompt(snapshot: TriageSnapshot): string {
  const { ghost, orphan, stale } = snapshot.counts;
  const orphanSample = snapshot.orphans.slice(0, 8).map((o) => o.id).join(', ');
  return [
    'Ты — аналитик технического долга реестра задач Membrana. Ниже — ДЕТЕРМИНИРОВАННЫЙ срез',
    'ночного триажа (уже посчитан кодом). Напиши краткий обзор на русском: 3–5 предложений.',
    '',
    'ЖЁСТКИЕ правила:',
    '- НЕ выдумывай id задач, номера issue или числа — используй только данные ниже.',
    '- НЕ меняй рекомендации (close/relink/re-scope) — они уже назначены.',
    '- Не приводи таблиц, только связная проза: что бросается в глаза, где кластеры, куда смотреть первым.',
    '- Это комментарий, не действие: исполняет человек.',
    '',
    `Счётчики: ghost ${ghost}, orphan ${orphan}, stale ${stale} (порог ${snapshot.staleThresholdDays} дн).`,
    `Ghost-кластеры по issue: ${ghostClusters(snapshot.ghosts) || 'нет'}.`,
    `Примеры orphan (из ${orphan}): ${orphanSample || 'нет'}.`,
    `Самые залежавшиеся stale: ${topStale(snapshot.stale) || 'нет'}.`,
  ].join('\n');
}

/** Вставляет раздел нарратива перед первой таблицей. Пустой нарратив → отчёт без изменений. */
export function insertNarrative(reportMd: string, narrative: string | null | undefined): string {
  const trimmed = narrative?.trim();
  if (!trimmed) return reportMd;
  const section = `${SECTION_HEADING}\n\n> _Сгенерировано LLM поверх детерминированного среза; таблицы ниже — источник истины._\n\n${trimmed}\n\n`;
  const marker = '\n## ';
  const idx = reportMd.indexOf(marker);
  if (idx === -1) {
    return `${reportMd.replace(/\n+$/, '\n')}\n${section}`.replace(/\n+$/, '\n');
  }
  return reportMd.slice(0, idx + 1) + section + reportMd.slice(idx + 1);
}
