#!/usr/bin/env node
/**
 * insight-drift — детерминированный крест-скан реестра инсайтов против реестра задач.
 *
 * Спринт agent-tooling-friction ti-2 (#433, консилиум 2026-07-13). Повод: 2026-07-13
 * вручную найдены и починены 3 расхождения (hermes / comms / live-neural) — sprintPhase
 * систематически не бэкфилится, и обзор инсайтов предлагал фаворитом то, что уже в работе.
 *
 * Чистое ядро (паттерн hermes-brief): diff(insights, tasks) → Drift[]; IO только в CLI.
 * Связь инсайт↔задача: tasks[].insightId === id ИЛИ упоминание id в tasks[].notes.
 * Типы дрейфа:
 *   • active-no-phase   — активная задача по инсайту, а sprintPhase пуст/чужой;
 *   • archived-no-phase — задача(и) по инсайту уже archived, sprintPhase пуст (инсайт
 *                         «не знает», что реализован);
 *   • phase-missing     — sprintPhase указывает на несуществующую задачу;
 *   • deferred-active   — status deferred/rejected при АКТИВНОЙ задаче по инсайту.
 *
 * Exit-коды: 0 — дрейфа нет; 3 — дрейф найден (для ritual:evening / tooling-doctor).
 * Вывод — выровненная таблица, статус СЛОВОМ (не только цвет) — ревью Rodchenko.
 *
 *   yarn insight:drift            # скан + таблица + exit-код
 *   yarn insight:drift --quiet    # только exit-код и итоговая строка
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const INSIGHTS_REGISTRY = 'docs/insights/registry.json';
const TASKS_REGISTRY = 'docs/tasks/registry.json';

// ─── чистое ядро (экспортируется для тестов) ─────────────────────────────────────

/** Детерминированное сравнение по code-point (не localeCompare — урок hermes-brief). */
export function byCodePoint(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Задачи, связанные с инсайтом: точный insightId ИЛИ упоминание id в notes. */
export function tasksForInsight(tasks, insightId) {
  return tasks.filter(
    (t) => t && (t.insightId === insightId || String(t.notes ?? '').includes(insightId)),
  );
}

/**
 * Крест-скан. @returns {Array<{insightId:string,kind:string,detail:string}>}
 * Детерминирован: вход одинаков → выход байт-в-байт (сортировка insightId ↑, kind ↑).
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
    return '[ok] insight-drift: реестры инсайтов и задач согласованы (расхождений: 0)';
  }
  const idW = Math.max(...drifts.map((d) => d.insightId.length), 'инсайт'.length);
  const kindW = Math.max(...drifts.map((d) => d.kind.length), 'дрейф'.length);
  const L = [];
  L.push(`[drift] insight-drift: расхождений ${drifts.length}`);
  L.push('');
  L.push(`${'инсайт'.padEnd(idW)} | ${'дрейф'.padEnd(kindW)} | детали`);
  L.push(`${'-'.repeat(idW)}-+-${'-'.repeat(kindW)}-+-${'-'.repeat(6)}`);
  for (const d of drifts) {
    L.push(`${d.insightId.padEnd(idW)} | ${d.kind.padEnd(kindW)} | ${d.detail}`);
  }
  L.push('');
  L.push('Лечение: бэкфилл sprintPhase/status в docs/insights (см. PR #432 как образец).');
  return L.join('\n');
}

// ─── CLI (единственная IO-точка) ─────────────────────────────────────────────────

function loadJson(rel) {
  return JSON.parse(readFileSync(path.join(REPO_ROOT, rel), 'utf8'));
}

function main() {
  const quiet = process.argv.includes('--quiet');
  let insights;
  let tasks;
  try {
    insights = loadJson(INSIGHTS_REGISTRY).insights ?? [];
    tasks = loadJson(TASKS_REGISTRY).tasks ?? [];
  } catch (e) {
    console.error(`[fail] insight-drift: реестр не читается — ${e.message}`);
    process.exit(1);
  }
  const drifts = diffRegistries(insights, tasks);
  if (quiet) {
    console.log(
      drifts.length === 0
        ? '[ok] insight-drift: 0'
        : `[drift] insight-drift: ${drifts.length} (запусти yarn insight:drift для таблицы)`,
    );
  } else {
    console.log(renderDriftReport(drifts));
  }
  process.exit(drifts.length === 0 ? 0 : 3);
}

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
