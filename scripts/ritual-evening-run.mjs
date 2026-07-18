#!/usr/bin/env node
/**
 * ritual-evening-run — исполнение вечерней цепочки ПО МАНИФЕСТУ (узлы S+F вердикта
 * scripts-boundary M0, спринт ritual-step-manifest-sf). Симметричен утреннему
 * `morning-ritual-run.mjs` (#605): там манифест ведёт барьер гейтов, здесь — семантику
 * отказа и гейт свежести.
 *
 * ЗАЧЕМ НЕ ШЕЛЛ-ЦЕПОЧКА. В `a && b && c` критичность выражается только через `|| true`,
 * а он означает сразу две несовместимые вещи: «шаг некритичен» и «не роняй ритуал».
 * Снять `|| true` с code-review в линейной цепочке нельзя: его падение убьёт хвост, а
 * там team-evening-feedback и партнёрский дайджест — а канон говорит прямо
 * «Run even if code-review step failed — feedback is independent» (.claude/CLAUDE.md).
 *
 * ОТСЮДА МОДЕЛЬ: критичность ≠ «рвёт цепочку». Критичность = «падает громко и
 * блокирует ЗАВИСИМЫХ». Кто от кого зависит — объявлено в манифесте (consumesFrom),
 * а не выведено из порядка строк. Независимые шаги идут дальше; прогон в целом
 * отдаёт не-ноль, если упал хоть один критичный. Молчания нет ни в одной ветке.
 *
 * Usage:
 *   node scripts/ritual-evening-run.mjs          — исполнить цепочку
 *   node scripts/ritual-evening-run.mjs --dry    — план без исполнения (репетиция)
 *   node scripts/ritual-evening-run.mjs --json   — итог машинно
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { blockedInputs, explainStatus, isBlocking, stepStatus } from './lib/step-status.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_REL = 'docs/tasks/evening-ritual-steps.json';

function readManifest() {
  const abs = resolve(root, MANIFEST_REL);
  if (!existsSync(abs)) {
    console.error(`✗ Манифест не найден: ${MANIFEST_REL} — исполнять нечего, порядок шагов не выдумывается`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(abs, 'utf8'));
}

/** `scripts/truth.mjs cool` → ['scripts/truth.mjs', 'cool'] */
function splitCommand(script) {
  const [file, ...args] = String(script).trim().split(/\s+/u);
  return { file, args };
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage: node scripts/ritual-evening-run.mjs [--dry] [--json]');
    process.exit(0);
  }
  const dry = argv.includes('--dry');
  const asJson = argv.includes('--json');

  const manifest = readManifest();
  const steps = manifest.steps ?? [];
  /** @type {Record<string, 'ok'|'failed-critical'|'skipped-noncritical'>} */
  const statuses = {};
  const report = [];

  for (const step of steps) {
    const blocked = blockedInputs(step, statuses);

    if (blocked.length > 0) {
      // Шаг НЕ запускается: его объявленный вход испорчен выше по цепочке.
      const status = stepStatus(step, { ran: false });
      statuses[step.id] = status;
      for (const b of blocked) {
        console.error(`  ↳ вход «${b.artifact}» испорчен: шаг-производитель «${b.producer}» — ${b.status}`);
      }
      console.error(explainStatus(step, status, { ran: false }));
      report.push({ id: step.id, status, ran: false, blockedBy: blocked.map((b) => b.producer) });
      continue;
    }

    if (dry) {
      console.log(`· ${step.id}: запустился бы «${step.script}» (${step.criticality})`);
      statuses[step.id] = 'ok';
      report.push({ id: step.id, status: 'ok', ran: false, dry: true });
      continue;
    }

    const { file, args } = splitCommand(step.script);
    console.error(`\n=== ritual:evening → ${step.id} (${step.criticality}) ===`);
    const res = spawnSync('node', [file, ...args], { cwd: root, stdio: 'inherit', env: process.env });

    const status = stepStatus(step, { exitCode: res.status ?? 1, ran: true });
    statuses[step.id] = status;
    console.error(explainStatus(step, status, { exitCode: res.status ?? 1 }));
    report.push({ id: step.id, status, ran: true, exitCode: res.status ?? null });
  }

  const failed = report.filter((r) => isBlocking(r.status));

  if (asJson) {
    console.log(JSON.stringify({ chain: manifest.chain, dry, steps: report, failedCritical: failed.map((f) => f.id) }, null, 2));
  } else {
    console.error('\n──── итог вечерней цепочки ────');
    for (const r of report) console.error(`  ${r.status.padEnd(20)} ${r.id}`);
    if (failed.length > 0) {
      console.error(`\n✗ Критичных отказов: ${failed.length} (${failed.map((f) => f.id).join(', ')})`);
      console.error('  Независимые шаги отработали — обязательства перед союзниками не заложники ревью.');
    } else {
      console.error('\n✓ Критичных отказов нет');
    }
  }

  // Прогон честен: не-ноль, если упал критичный. Но упал он ПОСЛЕ того, как
  // независимые шаги отработали — в этом вся разница с `&&`-цепочкой.
  process.exit(failed.length > 0 ? 1 : 0);
}

main();
