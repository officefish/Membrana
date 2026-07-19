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
 *   node scripts/ritual-evening-run.mjs              — исполнить цепочку
 *   node scripts/ritual-evening-run.mjs --dry        — план без исполнения
 *   node scripts/ritual-evening-run.mjs --only a,b   — исполнить ТОЛЬКО эти шаги
 *   node scripts/ritual-evening-run.mjs --json       — итог машинно
 *
 * `--dry` НЕ исполняет ничего — это план, а не проверка. Чтобы убедиться, что шаг
 * реально запускается, нужен `--only` с безопасным подмножеством.
 *
 * `--only` — инструмент репетиции и починки (перезапустить упавший шаг, не гоняя
 * весь вечер). Цена честности: невыбранный производитель не даёт статуса, значит
 * ребро к его потребителю в этом прогоне НЕ ПРОВЕРЕНО — раннер говорит об этом
 * вслух, чтобы частичный прогон не выглядел полным.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assertDocumentedExitCode,
  loadRitualExitCodesMap,
} from './lib/ritual-exit-codes.mjs';
import { blockedInputs, explainStatus, isBlocking, isFinding, stepStatus } from './lib/step-status.mjs';

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

  const onlyIdx = argv.indexOf('--only');
  const only = onlyIdx >= 0 ? new Set(String(argv[onlyIdx + 1] ?? '').split(',').map((s) => s.trim()).filter(Boolean)) : null;

  const manifest = readManifest();
  const steps = manifest.steps ?? [];
  const exitCodesMap = loadRitualExitCodesMap();

  if (only) {
    const unknown = [...only].filter((id) => !steps.some((s) => s.id === id));
    if (unknown.length > 0) {
      console.error(`✗ --only: неизвестные шаги: ${unknown.join(', ')}`);
      process.exit(1);
    }
    console.error(`⚠ ЧАСТИЧНЫЙ ПРОГОН (--only): ${[...only].join(', ')}`);
    console.error('  Это НЕ полный вечер. Рёбра к невыбранным производителям в этом прогоне не проверены.\n');
  }
  /** @type {Record<string, 'ok'|'failed-critical'|'skipped-noncritical'>} */
  const statuses = {};
  const report = [];

  for (const step of steps) {
    if (only && !only.has(step.id)) {
      // Статус НЕ выставляем: «не выбран» — это не «ok». Иначе частичный прогон
      // выдал бы непроверенное ребро за проверенное.
      report.push({ id: step.id, status: null, ran: false, notSelected: true });
      continue;
    }

    const blocked = blockedInputs(step, statuses);
    for (const [artifact, producer] of Object.entries(step.consumesFrom ?? {})) {
      if (!statuses[producer]) {
        console.error(`  ⚠ ребро «${artifact}» ← «${producer}» не проверено: производитель в этом прогоне не отрабатывал`);
      }
    }

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

    const outcome = { exitCode: res.status ?? 1, ran: true };

    // #622: ненулевой код обязан быть в ritual-exit-codes.json (failure|finding).
    try {
      assertDocumentedExitCode(exitCodesMap, 'evening', step.id, outcome.exitCode);
    } catch (err) {
      if (err && typeof err === 'object' && err.undocumented) {
        console.error(`✗ ${err.message}`);
        statuses[step.id] = 'failed-critical';
        report.push({
          id: step.id,
          status: 'failed-critical',
          ran: true,
          exitCode: outcome.exitCode,
          finding: false,
          undocumentedExit: true,
        });
        continue;
      }
      throw err;
    }

    const status = stepStatus(step, outcome);
    statuses[step.id] = status;
    console.error(explainStatus(step, status, outcome));
    report.push({ id: step.id, status, ran: true, exitCode: outcome.exitCode, finding: isFinding(step, outcome) });
  }

  const failed = report.filter((r) => isBlocking(r.status));
  const findings = report.filter((r) => r.finding);

  if (asJson) {
    console.log(JSON.stringify({ chain: manifest.chain, dry, steps: report, failedCritical: failed.map((f) => f.id) }, null, 2));
  } else {
    console.error('\n──── итог вечерней цепочки ────');
    for (const r of report) console.error(`  ${(r.status ?? 'не выбран').padEnd(20)} ${r.id}`);
    // Находки предъявляются ОТДЕЛЬНО от отказов: репортёр, которому есть что
    // сказать, не должен потеряться среди зелёных галок — иначе он украшение.
    if (findings.length > 0) {
      console.error(`\n⚑ Шаги с находками: ${findings.map((f) => `${f.id} (exit ${f.exitCode})`).join(', ')}`);
      console.error('  Это НЕ отказ — репортёры отработали. Их вывод выше требует чтения.');
    }
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
