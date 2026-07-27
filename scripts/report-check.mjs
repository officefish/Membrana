#!/usr/bin/env node
/**
 * yarn report:check — зуб формата доклада капитану (хотфикс 27.07).
 * Канон: docs/virtual-team/angelina/MORNING_REPORT_FORMAT.md. Детерминирован:
 * ни сети, ни LLM — формат держит код, не модель.
 *
 * Usage: node scripts/report-check.mjs --file <report.md>
 * Exit: 0 — канон соблюдён · 1 — находки (печатаются по именам)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { reportFormatProblems } from './lib/report-format-check.mjs';

const i = process.argv.indexOf('--file');
const file = i > -1 ? process.argv[i + 1] : null;
if (!file) {
  console.error('usage: yarn report:check --file <report.md>');
  process.exit(1);
}

let text;
try {
  text = readFileSync(resolve(process.cwd(), file), 'utf8');
} catch (e) {
  console.error(`report:check — файл не читается: ${e.message}`);
  process.exit(1);
}

const { ok, problems } = reportFormatProblems(text);
if (ok) {
  console.log('report:check — OK: структура канона и чистота тела соблюдены');
  process.exit(0);
}
console.error(`report:check — находки (${problems.length}):`);
for (const p of problems) console.error(`  ✗ [${p.rule}] ${p.message}`);
console.error('  канон: docs/virtual-team/angelina/MORNING_REPORT_FORMAT.md');
process.exit(1);
