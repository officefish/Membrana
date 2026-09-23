#!/usr/bin/env node
/**
 * `procedure-run:friction` — дозапись корня шероховатости в журнал прогонов (сессия E, 23.09).
 *
 * ЗАЧЕМ. Фаза `friction-amend` живёт в библиотеке журнала с рождения
 * (`scripts/lib/procedure-run-journal.mjs`: `RUN_PHASES`, `appendFrictionAmend`), а команды,
 * которая её пишет, в `scripts/` не было: `grep friction-amend scripts/*.mjs` находил только
 * библиотеку и её тесты. Корень трения оставался в голове того, кто его понял, а лента дня
 * несла один симптом — или `"friction": []` при реальном сбое.
 *
 * ЧТО ЭТО ЗА ЗАПИСЬ. Амандмент, не мутация: лента append-only, прежние строки не правятся.
 * Читатель видит обе версии по времени — симптом в момент прогона, корень когда его вправду
 * узнали. Поэтому у команды есть целевая шероховатость: амандмент ссылается на
 * `{runId, sequence, frictionIndex}` уже записанного трения.
 *
 * ЧЕГО КОМАНДА НЕ ДЕЛАЕТ. Не заводит новое трение. Симптом в ленту кладёт закрытие прогона
 * (`close`, поле `friction`); если у прогона `"friction": []`, дозаписывать нечего — команда
 * отказывает словами «амандмент в пустоту», а не выдумывает шероховатость задним числом.
 * Это граница контракта журнала, а не ограничение команды.
 *
 * Usage:
 *   node scripts/procedure-run-friction.mjs --run <runId> --symptom "часть симптома" \
 *     --root "корень" [--fix "…"] [--prevention "…"] --evidence <путь|команда> [--evidence …] \
 *     [--date YYYY-MM-DD] [--trail <путь ленты>] [--dry-run]
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  appendFrictionAmend,
  buildProcedureRunRecord,
  defaultTrailPath,
  nextSequenceOf,
  readProcedureRunTrail,
} from './lib/procedure-run-journal.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Доводы командной строки. `--evidence` накапливается: вещдоков у корня может быть несколько. */
export function parseFrictionArgs(argv) {
  const out = { evidence: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const [rawKey, inlineValue] = arg.slice(2).split('=');
    if (rawKey === 'dry-run') {
      out.dryRun = true;
      continue;
    }
    const value = inlineValue ?? argv[++i];
    if (rawKey === 'evidence') out.evidence.push(value);
    else if (rawKey === 'run' || rawKey === 'run-id') out.run = value;
    else out[rawKey] = value;
  }
  return out;
}

/**
 * Найти целевую шероховатость по части симптома.
 *
 * Поиск по подстроке, без учёта регистра: симптом в ленте — живая фраза прогона, набирать
 * её целиком означало бы переписывать её руками и ошибаться. Две подходящие — отказ:
 * догадка о том, к какому трению относится корень, испортила бы обе записи.
 */
export function selectFrictionTarget(records, { run, symptom }) {
  const ofRun = records.filter((r) => r?.runId === run);
  if (ofRun.length === 0) {
    const known = [...new Set(records.map((r) => r?.runId).filter(Boolean))];
    throw new Error(`прогон «${run}» в ленте не найден; есть: ${known.join(', ') || '(лента пуста)'}`);
  }

  const needle = String(symptom ?? '').trim().toLowerCase();
  if (needle === '') throw new Error('--symptom обязателен: он выбирает, к какой шероховатости пишется корень');

  const candidates = [];
  for (const record of ofRun) {
    if (!Array.isArray(record.friction)) continue;
    record.friction.forEach((f, frictionIndex) => {
      if (String(f?.symptom ?? '').toLowerCase().includes(needle)) {
        candidates.push({ runId: record.runId, sequence: record.sequence, frictionIndex, symptom: f.symptom });
      }
    });
  }

  if (candidates.length === 1) return candidates[0];

  const all = ofRun.flatMap((r) => (Array.isArray(r.friction) ? r.friction.map((f) => `«${f.symptom}»`) : []));
  if (candidates.length === 0) {
    if (all.length === 0) {
      throw new Error(
        `амандмент в пустоту: у прогона «${run}» ни одной шероховатости не записано ` +
          '(симптом кладёт закрытие прогона полем friction; задним числом трение не заводится)',
      );
    }
    throw new Error(`симптом «${symptom}» не найден у прогона «${run}»; записаны: ${all.join(', ')}`);
  }
  throw new Error(
    `симптом «${symptom}» неоднозначен у прогона «${run}» — подходит ${candidates.length}: ` +
      `${candidates.map((c) => `#${c.sequence}[${c.frictionIndex}] «${c.symptom}»`).join(', ')}`,
  );
}

/** Путь ленты: явный `--trail`, иначе лента дня. */
export function resolveTrailPath(args, today) {
  return args.trail || defaultTrailPath(args.date || today);
}

/**
 * Дозаписать корень/фикс/профилактику к шероховатости.
 *
 * Отказы — до записи: лента не должна нести половину намерения. Сухой прогон строит ту же
 * запись теми же правилами и ничего не пишет.
 */
export function runFrictionAmend({ repoRoot: root, trail, args, nowIso }) {
  const records = readProcedureRunTrail(root, trail);
  const target = selectFrictionTarget(records, args);

  const evidence = Array.isArray(args.evidence) ? args.evidence.filter((e) => String(e ?? '').trim() !== '') : [];
  if (evidence.length === 0) {
    throw new Error('friction-amend без evidence — дозаписанный корень доказывается разбором, не словом');
  }
  const hasContent = ['root', 'fix', 'prevention'].some((k) => String(args[k] ?? '').trim() !== '');
  if (!hasContent) {
    throw new Error('friction-amend без содержания — нужно хотя бы одно из --root / --fix / --prevention');
  }

  const input = {
    runId: target.runId,
    sequence: target.sequence,
    frictionIndex: target.frictionIndex,
    root: args.root,
    fix: args.fix,
    prevention: args.prevention,
    at: nowIso,
    evidence,
    subject: `поправка к трению: ${target.symptom}`,
  };

  if (args.dryRun) {
    // Та же сборка, что у записи, но без строки в ленте: сухой прогон обязан падать там же,
    // где упала бы запись, иначе он обещает больше, чем проверил.
    const source = records.find((r) => r.runId === target.runId && r.sequence === target.sequence);
    return buildProcedureRunRecord({
      procedureId: source.procedureId,
      runId: input.runId,
      sequence: nextSequenceOf(records, input.runId),
      status: 'pass',
      runPhase: 'friction-amend',
      subject: input.subject,
      at: input.at,
      evidence: input.evidence,
      amends: { runId: input.runId, sequence: input.sequence, frictionIndex: input.frictionIndex },
      root: input.root,
      fix: input.fix,
      prevention: input.prevention,
    });
  }

  return appendFrictionAmend(root, trail, input);
}

function usage() {
  console.error(`Usage:
  node scripts/procedure-run-friction.mjs --run <runId> --symptom "часть симптома" \\
    --root "корень" [--fix "…"] [--prevention "…"] --evidence <путь|команда> [--evidence …] \\
    [--date YYYY-MM-DD] [--trail <путь ленты>] [--dry-run]

  Дозаписывает корень к УЖЕ записанной шероховатости (фаза friction-amend, append-only).
  Новое трение командой не заводится: симптом кладёт закрытие прогона полем friction.`);
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    usage();
    process.exitCode = argv.length === 0 ? 2 : 0;
    return;
  }
  const args = parseFrictionArgs(argv);
  if (!args.run) {
    console.error('--run <runId> обязателен');
    process.exitCode = 2;
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const trail = resolveTrailPath(args, today);

  try {
    const record = runFrictionAmend({ repoRoot, trail, args, nowIso: new Date().toISOString() });
    if (args.dryRun) {
      console.log(`[dry-run] в ${trail} была бы дописана строка:`);
      console.log(JSON.stringify(record));
      return;
    }
    console.log(`${trail}: дописан амандмент ${record.runId}#${record.sequence} → friction[${record.amends.frictionIndex}]`);
    console.log(JSON.stringify(record));
  } catch (e) {
    console.error(`[fail] ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main();
}
