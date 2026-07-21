#!/usr/bin/env node
/**
 * yarn day:report — доклад по задачам (главный продукт утра, Ф1 спринта #788).
 *
 * Порядок T7: доклад собирается ПОСЛЕ чеканки магистрали (касание 1 закрыто).
 * Вход: свежий docs/MAIN_DAY_ISSUE.md + снимок реестра + best-effort статусы Issue
 * (сеть недоступна → честное «не проверено», не пропуск). Выход: docs/DAY_REPORT.md,
 * автор vesnin, провенанс штампом. Гейт зеркала — с диагнозом (T11), файл при
 * провале не пишется.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildDayReport, extractIssueRefs, missingReportSlots, parsePlanSlots } from './lib/day-report.mjs';
import { provenanceLine } from './lib/artifact-freshness.mjs';
import { readDated } from './lib/read-dated.mjs';
import { magistralChosen } from './lib/morning-gates.mjs';
import { loadRegistry, listActive } from './lib/task-registry.mjs';
import { MAIN_DAY_ISSUE_REL } from './lib/main-day-issue-paths.mjs';

const OUT_REL = 'docs/DAY_REPORT.md';
const GATES_REL = 'docs/tasks/morning-gates-state.json';

const today = new Date().toISOString().slice(0, 10);

// Гейт порядка (T7): без owner-choice магистрали доклад не собирается — иначе он
// зеркалил бы канон, который владелец ещё не чеканил.
const gatesAbs = resolve(process.cwd(), GATES_REL);
const gates = existsSync(gatesAbs) ? JSON.parse(readFileSync(gatesAbs, 'utf8')) : {};
if (!magistralChosen(gates)) {
  console.error('✖ day:report: магистраль не чеканена владельцем (morning:gate magistral) — доклад после касания 1, не до.');
  process.exit(3);
}

// Вход: сегодняшний канон дня (доклад читает СВЕЖИЙ план, не вчерашний).
const plan = readDated(MAIN_DAY_ISSUE_REL, { today, maxAgeDays: 0, label: 'MAIN_DAY_ISSUE' });
if (!plan.ok) {
  console.error(`✖ day:report: ${plan.why}`);
  process.exit(2);
}

const slots = parsePlanSlots(plan.content);
const registryTasks = listActive(loadRegistry()).map((t) => ({
  id: t.id,
  leadPersona: t.leadPersona ?? null,
  status: t.status,
}));

// Best-effort статусы Issue: одна пачка через gh; сеть упала → все «не проверено».
const issueStatuses = {};
const allIssues = [...new Set(slots.flatMap((s) => extractIssueRefs(s.body)))];
for (const n of allIssues) {
  try {
    const out = execFileSync('gh', ['issue', 'view', String(n), '--json', 'state', '--jq', '.state'], {
      encoding: 'utf8',
      timeout: 15_000,
    }).trim();
    if (out) issueStatuses[n] = out;
  } catch {
    // честное «не проверено» — статус просто не заполняем
  }
}

const body = buildDayReport({ dayKey: today, slots, registryTasks, issueStatuses });

const missing = missingReportSlots(body);
if (missing.length > 0) {
  console.error(`✖ day:report: зеркало разбито — потеряны слоты: ${missing.join(', ')}. Поправка: проверь заголовки слотов в ${MAIN_DAY_ISSUE_REL} и перезапусти.`);
  process.exit(22);
}

const outAbs = resolve(process.cwd(), OUT_REL);
const stamped = `${provenanceLine({ tool: 'yarn day:report; vesnin', now: new Date() })}\n\n${body}`;
writeFileSync(outAbs, stamped, 'utf8');
console.log(body);
console.error(`Записано: ${outAbs}`);
