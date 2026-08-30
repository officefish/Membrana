#!/usr/bin/env node
/**
 * ritual-night-run — дверь НОЧИ. Исполнение по манифесту, симметрично утру и вечеру.
 *
 *   yarn ritual:night              — исполнить цепочку (что положено по ритму сегодня)
 *   yarn ritual:night --dry        — план без исполнения
 *   yarn ritual:night --all        — все шаги, невзирая на ритм
 *   yarn ritual:night --only a,b   — только эти
 *   yarn ritual:night --json       — итог машинно
 *
 * ЗАЧЕМ ДВЕРЬ, ЕСЛИ МЕХАНИЗМЫ УЖЕ ЕСТЬ. Их было пять, и они жили РОССЫПЬЮ РАСПИСАНИЙ: шесть
 * отдельных cron, ни одного общего входа, ни одного общего читателя. Механизмы исправны — умирал
 * результат: никто не звал их целиком и никто не читал итог.
 *
 * PREFLIGHT — ГЕЙТ, А НЕ ПЕРВЫЙ ШАГ. Красный preflight означает «ночь не начиналась», и это
 * ДРУГОЕ событие, чем «ночь прошла и всё упало». Ни один шаг не запускается: ключа нет — работать
 * нечем, и час полного корпуса тестов сгорает впустую.
 *
 * ЗАМЕРЕНО, а не пересказано: последние 20 прогонов `weekly-strategic-plan` дали 17 failure против
 * 1 success. Семнадцать понедельников подряд на «секрет не задан», и ни одного громкого слова.
 *
 * `--dry` НИЧЕГО НЕ ИСПОЛНЯЕТ — это план, а не проверка. Урок вечерней цепочки 11.08 и мой
 * собственный вчерашний: неизвестный флаг — отказ ДО работы, а не молчаливое «исполняю всё».
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { unknownArgsOf } from './lib/night-preflight.mjs';
import { nightVerdict, nightWords, planNight } from './lib/ritual-night.mjs';
import { explainStatus, stepStatus } from './lib/step-status.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const NIGHT_STEPS_REL = 'docs/tasks/night-ritual-steps.json';

function readSteps() {
  const abs = resolve(root, NIGHT_STEPS_REL);
  if (!existsSync(abs)) {
    console.error(`✗ манифест шагов не найден: ${NIGHT_STEPS_REL} — исполнять нечего, порядок не выдумывается`);
    process.exit(1);
  }
  const doc = JSON.parse(readFileSync(abs, 'utf8'));
  if (!Array.isArray(doc.steps) || doc.steps.length === 0) {
    console.error(`✗ ${NIGHT_STEPS_REL}: массив steps пуст`);
    process.exit(1);
  }
  return doc.steps;
}

/** Гейт проводов. Отдельной функцией — чтобы зуб мог подменить и не запускать процесс. */
export function runPreflight(spawn = spawnSync) {
  const r = spawn(process.execPath, [resolve(root, 'scripts/night-preflight.mjs')], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  return r.status === 0;
}

function runStep(step) {
  const cmd = String(step.command ?? '').trim();
  if (cmd === '') return { ran: false, exitCode: null };
  const [file, ...args] = cmd.split(/\s+/u);
  const r = spawnSync(file, args, { cwd: root, encoding: 'utf8', stdio: 'inherit', shell: true });
  return { ran: true, exitCode: r.status };
}

function main(argv) {
  const KNOWN = new Set(['--dry', '--json', '--only', '--all']);
  const unknown = unknownArgsOf(argv, KNOWN);
  if (unknown.length > 0) {
    console.error(`✗ неизвестные аргументы: ${unknown.join(', ')}`);
    console.error('Usage: node scripts/ritual-night-run.mjs [--dry] [--json] [--all] [--only a,b]');
    return 2;
  }
  const dry = argv.includes('--dry');
  const asJson = argv.includes('--json');
  const all = argv.includes('--all');
  const onlyIdx = argv.indexOf('--only');
  const only = onlyIdx >= 0
    ? new Set(String(argv[onlyIdx + 1] ?? '').split(',').map((s) => s.trim()).filter(Boolean))
    : null;

  const steps = readSteps();
  const plan = planNight(steps, { weekday: new Date().getUTCDay(), only, all });

  if (dry) {
    for (const p of plan) console.log(p.run ? `→ ${p.step.id} — ${p.step.label ?? ''}` : `· ${p.step.id} — ${p.why}`);
    console.log('\n(--dry: не исполнено ничего; это план, а не проверка)');
    return 0;
  }

  // ГЕЙТ. Красный — ни один шаг не запускается, и это говорится словами.
  if (!runPreflight()) {
    const verdict = nightVerdict({ preflightOk: false });
    console.error(`\n${nightWords(verdict)}`);
    if (asJson) console.log(JSON.stringify({ ...verdict, plan: plan.map((p) => p.step.id) }, null, 2));
    return verdict.exitCode;
  }

  const statuses = [];
  for (const p of plan) {
    if (!p.run) {
      // Отложенное ритмом НЕ прячется: сводка обязана отличать «не сегодня» от «упал».
      statuses.push({ id: p.step.id, status: 'not-due', words: `· ${p.step.id} — ${p.why}` });
      continue;
    }
    const outcome = runStep(p.step);
    const status = stepStatus(p.step, outcome);
    statuses.push({ id: p.step.id, status, words: explainStatus(p.step, status, outcome) });
  }

  const verdict = nightVerdict({ preflightOk: true, statuses });
  if (asJson) {
    console.log(JSON.stringify({ ...verdict, statuses }, null, 2));
  } else {
    for (const s of statuses) console.log(s.words);
    console.log(`\n${nightWords(verdict)}`);
  }
  return verdict.exitCode;
}

if (process.argv[1]?.endsWith('ritual-night-run.mjs')) {
  process.exit(main(process.argv.slice(2)));
}

export { main };
