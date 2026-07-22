#!/usr/bin/env node
/**
 * yarn procedures:workshop — мастерская процедурного дома (три глагола, спринт procedural-workshop).
 *
 *   --audit               инвентарь: сверка реестра с реальностью + validateProcedure (зуб)
 *   --decompose [--by holder|status|kit]   раскладка процедур по правилу
 *   --inspect <id>        рассмотрение одной процедуры вглубь (второе измерение)
 *
 * Осмотр/декомпозиция/рассмотрение — чтение, идемпотентны. audit роняет прогон (exit 1)
 * при дрейфе реестр↔реальность. Канон: docs/patterns/HOME_WORKSHOP.md.
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { auditProcedures, decomposeProcedures, inspectProcedure } from './lib/procedural-workshop.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const val = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null; };

function runAudit() {
  const rows = auditProcedures(repoRoot);
  const drift = rows.filter((r) => r.state.startsWith('drift'));
  console.log(`procedures:workshop --audit · процедур: ${rows.length}\n`);
  const mark = { 'built-valid': '✓', 'declared-not-built': '·', 'built-invalid': '✗', 'drift-declared-missing': '✗', 'drift-built-undeclared': '✗' };
  for (const r of rows) {
    console.log(`${mark[r.state] ?? '?'} ${r.id}  [${r.holder}]  ${r.state}`);
    for (const p of r.problems) console.log(`    ✗ ${p}`);
  }
  const built = rows.filter((r) => r.state === 'built-valid').length;
  const declared = rows.filter((r) => r.state === 'declared-not-built').length;
  console.log(`\nПостроено-валидно: ${built} · объявлено-не-построено: ${declared} · дрейф: ${drift.length}`);
  if (drift.length > 0) { console.error(`procedures:workshop: ДРЕЙФ реестр↔реальность — ${drift.length}.`); process.exit(1); }
  console.log('procedures:workshop --audit: OK (дрейфа нет; объявленные-не-построенные — легальный бэклог).');
}

function runDecompose() {
  const by = val('by') ?? 'holder';
  const rows = auditProcedures(repoRoot);
  const groups = decomposeProcedures(rows, by, repoRoot);
  console.log(`procedures:workshop --decompose --by ${by} · процедур: ${rows.length}\n`);
  console.log('| Категория | Процедур | Список |');
  console.log('|-----------|----------|--------|');
  for (const [k, ids] of [...groups].sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1))) {
    console.log(`| ${k} | ${ids.length} | ${ids.join(', ')} |`);
  }
}

function runInspect(id) {
  const r = inspectProcedure(repoRoot, id);
  console.log(`procedures:workshop --inspect ${id}\n`);
  if (!r.built) { console.log(`· ${r.note}`); return; }
  console.log(`holder: ${r.leadPersona ?? '—'} · README: ${r.readmePresent ? '✓' : '✗'} · kitVersion: ${r.kitVersion ?? 'null'}`);
  console.log(`второе измерение (подграф манифеста): engines ${r.secondDimension.enginesCount}, precedents ${r.secondDimension.precedentsCount}`);
  if (r.engines.length) console.log(`  engines:\n${r.engines.map((e) => `    · ${e}`).join('\n')}`);
  if (r.precedents.length) console.log(`  precedents:\n${r.precedents.map((e) => `    · ${e}`).join('\n')}`);
  if (r.note) console.log(`  ⚠ ${r.note}`);
  console.log('\n(полиморфная рекурсия по frames[] — ждёт #900; здесь второе измерение = подграф манифеста.)');
}

if (has('audit')) runAudit();
else if (has('decompose')) runDecompose();
else if (has('inspect')) {
  const id = val('inspect');
  if (!id) { console.error('procedures:workshop --inspect требует <id>'); process.exit(2); }
  runInspect(id);
} else {
  console.log('Usage: yarn procedures:workshop --audit | --decompose [--by holder|status|kit] | --inspect <id>');
  process.exit(2);
}
