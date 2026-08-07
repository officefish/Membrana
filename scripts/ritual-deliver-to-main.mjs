#!/usr/bin/env node
/**
 * yarn ritual:deliver-to-main — финальный кадр ритуала: документы на origin/main.
 *
 * По умолчанию verify-only (exit 2 если не на main). `--execute` доводит доставку до конца
 * через `pr:ship` — долг `#shown-is-not-delivered`, слово владельца 07.08.
 *
 * Почему исполнитель, а не только детектор. Детектор был и был строгим: кадр стоит последним
 * звеном обеих цепочек, `criticality: critical`, и честно отдаёт exit 2. Но дальше он лишь
 * ПЕЧАТАЛ план, и каждый стоп доводился руками — утро 07.08 и вечер 06.08 подряд. Норма без
 * исполнителя и есть «показал, но не доставил», только на уровень выше: инструмент показал
 * план вместо того, чтобы доставить.
 *
 * Гейт исполнителя — САМ вызов `--execute` (решение владельца 07.08): цепочка ритуала
 * останавливается планом, доводит человек одной командой. Автодоставки в конце цепочки нет
 * намеренно — это был бы пуш в ствол без присмотра, тот же класс, ради которого
 * `night:land-reports --execute` стоит в deny-списке профиля always-yes.
 *
 * Две защиты исполнителя, обе про «не подмести чужое»:
 *   1. доставляются ТОЛЬКО пути, объявленные манифестом ритуала;
 *   2. отказ, если в индексе лежит что-то ещё — иначе чужая проиндексированная работа
 *      уехала бы в ствол под именем артефакта ритуала.
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  guardDeliver,
  planExecute,
  ritualConfig,
  runDeliverGate,
  shipArgsFor,
  verifyDeliverOnMain,
} from './lib/ritual-deliver-to-main.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string[]} argv
 */
export function parseDeliverArgs(argv) {
  /** @type {{ help: boolean, json: boolean, execute: boolean, noFetch: boolean, ritual: string }} */
  const out = { help: false, json: false, execute: false, noFetch: false, ritual: 'day' };
  let expectRitual = false;
  for (const a of argv) {
    if (expectRitual) { out.ritual = a; expectRitual = false; }
    else if (a === '--ritual') expectRitual = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--json') out.json = true;
    else if (a === '--execute') out.execute = true;
    else if (a === '--no-fetch') out.noFetch = true;
    else if (a.startsWith('-')) throw new Error(`неизвестный флаг: ${a}`);
    else throw new Error(`лишний аргумент: ${a}`);
  }
  // Флаг без значения — ошибка входа, а не тихий откат на утро: молчание здесь дало бы
  // проверку УТРЕННИХ артефактов под именем вечера (та же ложная зелёнка, что и внутри движка).
  if (expectRitual) throw new Error('--ritual требует значения (day | evening)');
  return out;
}

function gitShowMain(rel) {
  return execFileSync('git', ['show', `origin/main:${rel}`], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

function maybeFetch() {
  execFileSync('git', ['fetch', 'origin', 'main'], { cwd: repoRoot, stdio: 'pipe' });
}

function printUsage() {
  console.log(`Usage: yarn ritual:deliver-to-main [--ritual day|evening] [--execute] [--json] [--no-fetch]

  Проверяет артефакты ритуала на origin/main (факт, не заявление).
  Exit 0 — всё на main; exit 2 — STOP (ритуал не завершён для соседей).

  --ritual   day (умолчание) | evening
  --execute  довести доставку до конца через pr:ship: ветка → commit → PR → merge → ff-sync.
             Доставляются только объявленные манифестом пути; отказ, если в индексе есть
             что-то ещё. Артефакты, которых нет на диске или которые не сегодняшние, доставкой
             не лечатся — их чинит шаг-производитель.
  --no-fetch — не вызывать git fetch (тесты/offline).
`);
}

/** Проиндексированные пути — читатель защиты «не подмести чужое». */
function stagedPaths(root) {
  return execFileSync('git', ['diff', '--cached', '--name-only'], { cwd: root, encoding: 'utf8' })
    .split(/\r?\n/u)
    .filter(Boolean);
}

/**
 * Исполнитель кадра: доводит доставку до ствола. Чистое решение — в `planExecute`; здесь
 * git, pr:ship и код возврата.
 *
 * Вердикт считается ЗАНОВО после доставки, а не выводится из успеха команд: «pr:ship отработал»
 * и «ствол получил артефакты» — разные утверждения, и путать их значило бы повторять сам долг.
 *
 * @param {string} root
 * @param {{ readRemote: (rel: string) => string|null, ritual: string, today?: string }} opts
 * @returns {number}
 */
function runDeliverExecute(root, opts) {
  const { ritual } = opts;
  const code = runDeliverGate(root, opts);
  if (code === 0) return 0;

  const v = verifyDeliverOnMain(root, opts);
  const plan = planExecute(v.reports, ritual);
  if (plan.action !== 'deliver') {
    console.log(`→ доставка не запускается: ${plan.reason}`);
    return code;
  }

  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const guard = guardDeliver({
    paths: plan.paths,
    declared: ritualConfig(ritual).artifacts(today, { repoRoot: root }).map((a) => a.rel),
    staged: stagedPaths(root),
  });
  if (!guard.ok) {
    console.error(`✗ доставка отказана: ${guard.refusal} (${guard.offenders.length})`);
    console.error(`  ${guard.offenders.slice(0, 5).join(', ')}`);
    return 1;
  }

  execFileSync('git', ['add', '--', ...plan.paths], { cwd: root, stdio: 'pipe' });
  // Пусто после `add` — артефакты уже закоммичены локально, не доставлены. Тогда pr:ship
  // обязан идти БЕЗ шага commit: иначе он падает на «nothing to commit» вхолостую.
  const staged = stagedPaths(root).filter((p) => plan.paths.includes(p));
  const shipArgs = shipArgsFor({
    ritual,
    today,
    branch: plan.branchHint,
    hasStaged: staged.length > 0,
  });

  console.log(`→ доставка: ${plan.reason}${staged.length ? '' : ' (уже закоммичено локально — без шага commit)'}`);
  try {
    execFileSync(process.execPath, shipArgs, { cwd: root, stdio: 'inherit' });
  } catch (e) {
    console.error(`✗ pr:ship не довёл доставку: ${e instanceof Error ? e.message : String(e)}`);
    // Не возвращаем «ок» по коду команды — пересчёт ниже скажет о стволе правду.
  }

  try {
    maybeFetch();
  } catch {
    console.warn('  fetch после доставки не удался — вердикт считается по прежнему снимку ствола');
  }
  console.log('→ пересчёт кадра после доставки');
  return runDeliverGate(root, opts);
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string }} [deps]
 * @returns {number}
 */
export function main(argv = process.argv.slice(2), deps = {}) {
  const root = deps.cwd ?? repoRoot;
  const args = parseDeliverArgs(argv);
  if (args.help) {
    printUsage();
    return 0;
  }
  if (!args.noFetch) {
    try {
      maybeFetch();
    } catch (e) {
      console.error(`ritual:deliver-to-main: fetch origin/main failed: ${e instanceof Error ? e.message : e}`);
      return 2;
    }
  }
  const readRemote = (rel) => {
    try {
      return gitShowMain(rel);
    } catch {
      return null;
    }
  };
  if (args.json) {
    // `ritual` передаётся и здесь: без него `--json --ritual evening` проверял УТРЕННИЕ
    // артефакты и звал это вердиктом вечера — ровно та ложная зелёнка, от которой
    // предостерегает разбор флагов выше.
    const v = verifyDeliverOnMain(root, { readRemote, ritual: args.ritual });
    console.log(JSON.stringify(v, null, 2));
    return v.ok ? 0 : 2;
  }
  if (args.execute) {
    return runDeliverExecute(root, { readRemote, ritual: args.ritual });
  }
  return runDeliverGate(root, { readRemote, ritual: args.ritual });
}

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('/ritual-deliver-to-main.mjs')) {
  try {
    process.exitCode = main();
  } catch (err) {
    console.error(`ritual:deliver-to-main: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 2;
  }
}
