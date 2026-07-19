#!/usr/bin/env node
/**
 * insight-drift — thin compatibility adapter к insight lifecycle verify (C6).
 *
 * Исторически (ti-2 #433) сканировал registry×tasks с mention/archive inference.
 * После insight-archive-lifecycle C1–C7 CLI больше не читает legacy registry/meta
 * как authority и не выводит L/O из archived/task/mention.
 *
 * `yarn insight:drift` ≡ read-only `yarn insight verify` diagnostics.
 * Exit: 0 — ok; 1 — ошибка IO/replay; 3 — verify diagnostics (finding для ritual).
 *
 * Экспорт `diffRegistries` оставлен для unit-тестов legacy helper; CLI его не зовёт.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { verifyInsightLifecycle } from './lib/insight-lifecycle.mjs';
import { loadLifecycleStore } from './lib/insight-lifecycle-store.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

/** Детерминированное сравнение по code-point (не localeCompare — урок hermes-brief). */
export function byCodePoint(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** @deprecated Legacy helper for unit tests only — not authority, not used by CLI. */
export function tasksForInsight(tasks, insightId) {
  return tasks.filter(
    (t) => t && (t.insightId === insightId || String(t.notes ?? '').includes(insightId)),
  );
}

/**
 * @deprecated Legacy registry×task scan — kept for unit tests; CLI uses verify.
 * @returns {Array<{insightId:string,kind:string,detail:string}>}
 */
export function diffRegistries(insights, tasks) {
  const drifts = [];
  const taskIds = new Set(tasks.map((t) => t.id));

  for (const ins of insights) {
    const linked = tasksForInsight(tasks, ins.id);
    const phase = ins.sprintPhase ?? null;
    const phaseLinked = phase !== null && linked.some((t) => t.id === phase);

    if (phase !== null && !taskIds.has(phase)) {
      drifts.push({
        insightId: ins.id,
        kind: 'phase-missing',
        detail: `sprintPhase "${phase}" не найден в реестре задач`,
      });
    }

    if (linked.length === 0) continue;

    const active = linked.filter((t) => t.status === 'active');
    const archived = linked.filter((t) => t.status === 'archived');

    if (!phaseLinked) {
      if (active.length > 0) {
        drifts.push({
          insightId: ins.id,
          kind: 'active-no-phase',
          detail: `активные задачи без sprintPhase-связи: ${active.map((t) => t.id).sort(byCodePoint).join(', ')}`,
        });
      } else if (archived.length > 0) {
        drifts.push({
          insightId: ins.id,
          kind: 'archived-no-phase',
          detail: `реализован (archived: ${archived.map((t) => t.id).sort(byCodePoint).join(', ')}), sprintPhase пуст`,
        });
      }
    }

    if ((ins.status === 'deferred' || ins.status === 'rejected') && active.length > 0) {
      drifts.push({
        insightId: ins.id,
        kind: 'deferred-active',
        detail: `status "${ins.status}" при активных задачах: ${active.map((t) => t.id).sort(byCodePoint).join(', ')}`,
      });
    }
  }

  drifts.sort((a, b) => byCodePoint(a.insightId, b.insightId) || byCodePoint(a.kind, b.kind));
  return drifts;
}

/** Чистый рендер таблицы: статус словом, моноширинное выравнивание. */
export function renderDriftReport(drifts) {
  if (drifts.length === 0) {
    return '[ok] insight-drift: lifecycle verify без diagnostics (расхождений: 0)';
  }
  const idW = Math.max(...drifts.map((d) => d.insightId.length), 'инсайт'.length);
  const kindW = Math.max(...drifts.map((d) => d.kind.length), 'дрейф'.length);
  const L = [];
  L.push(`[drift] insight-drift: diagnostics ${drifts.length}`);
  L.push('');
  L.push(`${'инсайт'.padEnd(idW)} | ${'дрейф'.padEnd(kindW)} | детали`);
  L.push(`${'-'.repeat(idW)}-+-${'-'.repeat(kindW)}-+-${'-'.repeat(6)}`);
  for (const d of drifts) {
    L.push(`${d.insightId.padEnd(idW)} | ${d.kind.padEnd(kindW)} | ${d.detail}`);
  }
  L.push('');
  L.push('Лечение: yarn insight verify / reconcile / visibility (не rewrite registry/meta).');
  return L.join('\n');
}

/** Map verify diagnostics → drift rows for ritual-compatible table/exit 3. */
export function diagnosticsToDrifts(diagnostics) {
  return (diagnostics ?? []).map((item, index) => ({
    insightId: String(item.subjectRef ?? item.eventId ?? 'lifecycle'),
    kind: String(item.code ?? `diagnostic-${index}`),
    detail: String(item.message ?? JSON.stringify(item)),
  })).sort((a, b) => byCodePoint(a.insightId, b.insightId) || byCodePoint(a.kind, b.kind));
}

function main() {
  const quiet = process.argv.includes('--quiet');
  let result;
  try {
    const store = loadLifecycleStore(REPO_ROOT);
    result = verifyInsightLifecycle({
      baseContext: store.baseContext,
      eventLog: store.eventLog,
      projection: store.projection ?? undefined,
    });
  } catch (e) {
    console.error(`[fail] insight-drift: verify failed — ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  const drifts = diagnosticsToDrifts(result.diagnostics);
  if (quiet) {
    console.log(
      drifts.length === 0 && result.ok
        ? '[ok] insight-drift: 0'
        : `[drift] insight-drift: ${drifts.length} (запусти yarn insight:drift для таблицы)`,
    );
  } else {
    console.log(renderDriftReport(drifts));
  }
  process.exit(result.ok && drifts.length === 0 ? 0 : 3);
}

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
