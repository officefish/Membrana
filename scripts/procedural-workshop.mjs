#!/usr/bin/env node
/**
 * yarn procedures:workshop — мастерская процедурного дома (три глагола, спринт procedural-workshop).
 *
 *   --audit               инвентарь: сверка реестра с реальностью + validateProcedure (зуб)
 *   --decompose [--by holder|status|kit|portfolio]   раскладка процедур по правилу
 *   --inspect <id>        рассмотрение одной процедуры вглубь (второе измерение)
 *
 * Осмотр/декомпозиция/рассмотрение — чтение, идемпотентны. audit роняет прогон (exit 1)
 * при дрейфе реестр↔реальность. Канон: docs/patterns/HOME_WORKSHOP.md.
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { auditProcedures, decomposeProcedures, FAILING_STATES, inspectProcedure } from './lib/procedural-workshop.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const val = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null; };

function runAudit() {
  let rows;
  try {
    rows = auditProcedures(repoRoot);
  } catch (e) {
    console.error(`procedures:workshop: инструментальная ошибка — ${e.message}`);
    process.exit(2);
  }
  const failing = rows.filter((r) => FAILING_STATES.has(r.state));
  console.log(`procedures:workshop --audit · процедур: ${rows.length}\n`);
  const mark = { 'built-valid': '✓', 'built-external-home': '✓', 'declared-not-built': '·', 'built-invalid': '✗', 'drift-declared-missing': '✗', 'drift-built-undeclared': '✗', 'invalid-entry': '✗' };
  for (const r of rows) {
    const portfolio = r.portfolio?.status === 'present' ? `portfolio:✓ ${r.portfolio.count}` : 'portfolio:—';
    console.log(`${mark[r.state] ?? '?'} ${r.id}  [${r.holder}]  ${r.state}  ${portfolio}`);
    for (const p of r.problems) console.log(`    ✗ ${p}`);
  }
  const built = rows.filter((r) => r.state === 'built-valid').length;
  const declared = rows.filter((r) => r.state === 'declared-not-built').length;
  const withPortfolio = rows.filter((r) => r.portfolio?.status === 'present').length;
  const withoutPortfolio = rows.length - withPortfolio;
  console.log(`\nПостроено-валидно: ${built} · объявлено-не-построено: ${declared} · портфолио есть: ${withPortfolio} · портфолио нет: ${withoutPortfolio} · дефектов: ${failing.length}`);
  if (failing.length > 0) { console.error(`procedures:workshop: ДЕФЕКТ реестр↔реальность — ${failing.length} (built-invalid/дрейф/битая запись).`); process.exit(1); }
  console.log('procedures:workshop --audit: OK (дефектов нет; объявленные-не-построенные — легальный бэклог).');
}

function runDecompose() {
  const by = val('by') ?? 'holder';
  let rows;
  try { rows = auditProcedures(repoRoot); }
  catch (e) { console.error(`procedures:workshop: инструментальная ошибка — ${e.message}`); process.exit(2); }
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
  console.log(`portfolio: ${r.portfolio.status === 'present' ? `✓ ${r.portfolio.count}` : '—'}`);
  console.log(`цепочка кадров: ${r.secondDimension.frameCount} · подграф манифеста: engines ${r.secondDimension.enginesCount}, precedents ${r.secondDimension.precedentsCount}\n`);
  renderLane('preflight', 'гейт до цепочки', r.queue.preflight);
  renderLane('frames', 'автоцепочка', r.queue.frames);
  renderLane('post', 'ручной хвост', r.queue.post);
  if (r.engines.length) console.log(`\n  engines:\n${r.engines.map((e) => `    · ${e}`).join('\n')}`);
  if (r.precedents.length) console.log(`  precedents:\n${r.precedents.map((e) => `    · ${e}`).join('\n')}`);
  if (r.portfolio.status === 'present') console.log(`  portfolio:\n${r.portfolio.items.map((e) => `    · ${e.id} [${e.kind}] ${e.path}`).join('\n')}`);
  if (r.note) console.log(`  ⚠ ${r.note}`);
}

/**
 * Полоса очереди на холст. Пустая полоса печатается ЯВНО («— кадров нет —»),
 * а не пропускается: honest empty-state, читатель не гадает.
 */
function renderLane(name, hint, lane) {
  console.log(`  ${name} (${hint}): ${lane.length}`);
  if (!lane.length) { console.log('    — кадров нет —'); return; }
  lane.forEach((f, i) => {
    const pins = Array.isArray(f.pins) ? f.pins.length : 0;
    const arrow = name === 'frames' && i < lane.length - 1 ? ' →' : '';
    console.log(`    ${i + 1}. ${f.id} [${f.holder}]${pins ? ` · пинов: ${pins}` : ''}${arrow}`);
  });
}

if (has('audit')) runAudit();
else if (has('decompose')) runDecompose();
else if (has('inspect')) {
  const id = val('inspect');
  if (!id) { console.error('procedures:workshop --inspect требует <id>'); process.exit(2); }
  runInspect(id);
} else {
  console.log('Usage: yarn procedures:workshop --audit | --decompose [--by holder|status|kit|portfolio] | --inspect <id>');
  process.exit(2);
}
