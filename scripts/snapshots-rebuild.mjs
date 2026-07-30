#!/usr/bin/env node
/**
 * yarn snapshots:rebuild [--check] — производные снимки одной командой
 * (Ф1 санитарного пакета 30.07; ретроспектива tooling-needs, фрикция №1).
 *
 * Эпизод: 29.07 трижды отказ за отставший снимок — реестр прецедентов, каталог
 * кейсов и индекс вещдоков (последний уже на CI последнего PR дня). Общего
 * пересборщика не было, каждый раз восемь минут прогона.
 *
 * Пары «источник → снимок» — декларация `docs/tooling-atlas/snapshots.json`.
 *
 *   yarn snapshots:rebuild            пересобрать все объявленные снимки
 *   yarn snapshots:rebuild --check    только проверить дрейф (зуб для pre-push/CI)
 *   yarn snapshots:rebuild --list     перечислить пары, ничего не делая
 *
 * Exit: 0 — чисто/пересобрано; 1 — находки (дрейф или форма); 2 — инструментальная.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkable, declarationFindings, rebuildPlan, resultFindings, stepOutcome } from './lib/snapshots-plan.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DECLARATION = 'docs/tooling-atlas/snapshots.json';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);

function run(cmd) {
  const [bin, ...args] = cmd;
  const r = spawnSync(bin, args, { cwd: repoRoot, encoding: 'utf8', timeout: 300_000 });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
  return { ok: r.status === 0, out };
}

function main() {
  const declaration = JSON.parse(readFileSync(join(repoRoot, DECLARATION), 'utf8'));

  const shape = declarationFindings(declaration);
  if (shape.length > 0) {
    console.error(`snapshots — форма декларации: находок ${shape.length}`);
    for (const f of shape) console.error(`  ✖ [${f.toothId}] ${f.where} — ${f.reason}`);
    return 1;
  }

  if (has('--list')) {
    console.log(`snapshots — объявлено ${declaration.snapshots.length}:`);
    for (const s of declaration.snapshots) {
      console.log(`  ${s.id.padEnd(14)} ${s.snapshot}`);
      console.log(`  ${''.padEnd(14)} ← ${s.source}${s.checkCmd ? '' : '  (проверки нет: ' + s.checkNote + ')'}`);
    }
    return 0;
  }

  if (has('--check')) {
    const list = checkable(declaration);
    const skipped = declaration.snapshots.length - list.length;
    const results = list.map((s) => {
      const { ok, out } = run(s.checkCmd);
      return { id: s.id, ok, detail: ok ? '' : out.split('\n').slice(-2).join(' ') };
    });
    const findings = resultFindings(results);

    console.log(`snapshots --check — проверено ${list.length}, без проверки ${skipped} (легальное «нет»)`);
    if (findings.length === 0) {
      console.log('snapshots --check — снимки не отстали');
      return 0;
    }
    console.error(`\nsnapshots --check — находок ${findings.length}`);
    for (const f of findings) console.error(`  ✖ [${f.toothId}] ${f.where} — ${f.reason}`);
    console.error('\nПересобрать: yarn snapshots:rebuild');
    return 1;
  }

  const plan = rebuildPlan(declaration);
  let failed = 0;
  let withFindings = 0;
  for (const step of plan) {
    const { ok, out } = run(step.cmd);
    const names = step.ids.join(', ');
    const tail = out.split('\n').slice(-2).join(' ');
    switch (stepOutcome(step, ok, out)) {
      case 'rebuilt':
        console.log(`  ✓ ${names}`);
        break;
      case 'rebuilt_with_findings':
        // Находка — не отказ: снимок пересобран, инструмент назвал дефекты источника.
        console.log(`  ⚑ ${names} — пересобрано С НАХОДКАМИ: ${tail}`);
        withFindings += 1;
        break;
      default:
        console.error(`  ✖ ${names} — команда не отработала: ${tail}`);
        failed += 1;
    }
  }
  console.log(
    `\nsnapshots:rebuild — проходов ${plan.length}, снимков ${declaration.snapshots.length}, ` +
      `отказов ${failed}, с находками ${withFindings}`,
  );
  if (withFindings > 0) {
    console.log('Находки — не отказ: снимки пересобраны, дефекты источника названы выше.');
  }
  return failed > 0 ? 1 : 0;
}

if (process.argv[1]?.endsWith('snapshots-rebuild.mjs')) {
  try {
    process.exit(main());
  } catch (e) {
    console.error(`snapshots — инструментальная ошибка: ${e.message}`);
    process.exit(2);
  }
}
