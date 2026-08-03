#!/usr/bin/env node
/**
 * procedure-run-record — CLI журнала прогонов процедур (блок run-record-cli, 03.08).
 *
 * Три команды — ровно три события журнала, ничего сверх:
 *   open   --procedure <id> [--run <runId>] [--subject <s>] --evidence <ref> [...]
 *          [--at <ISO>] [--note <n>] [--days N]
 *   close  --procedure <id> --status <pass|fail|blocked|skipped> [--run <runId>]
 *          [--subject <s>] [--evidence <ref> ...] [--gap <g> ...] [--friction <симптом> ...]
 *          [--at <ISO>] [--days N]
 *   amend  --run <runId> --sequence <N> --friction-index <N>
 *          [--root <r>] [--fix <f>] [--prevention <p>] --evidence <ref> [...] [--at <ISO>] [--days N]
 *
 * Статусы, инварианты и leafHash — ТОЛЬКО библиотекой (`procedure-run-journal.mjs`):
 * CLI не заводит ни одного собственного значения и не выдумывает времени — `--at`
 * по умолчанию это системные часы В МОМЕНТ вызова (замер события, не подстановка);
 * чужое время возможно только явным `--at`, ответственность на передавшем.
 *
 * Лента дневная, а обрыв должен ловиться «со следующего утра» — следующий open живёт
 * уже в ДРУГОМ файле, и внутрифайловое ленивое закрытие его не увидит. Поэтому open
 * прометает ленты за --days (7) суток назад: незакрытые прогоны той же процедуры
 * закрываются fail/orphaned В СВОЁМ файле (день файла — день открытия прогона,
 * событие закрытия датировано честно). Названный долг: структурного orphanedBy у
 * кросс-файлового закрытия нет (`closeProcedureRun` поле не проносит, библиотека вне
 * зоны блока) — ссылка на вытеснившую запись едет строкой в evidence; кандидат в ADR.
 *
 * close ищет открытый прогон ПО ПРОЦЕДУРЕ (цепочка вечера не обязана помнить
 * утренний runId) с даты события назад; несколько открытых — отказ с перечнем,
 * молча не выбирается (`--run` адресует).
 *
 * Exit: 0 — записано · 1 — честный отказ (закрыть нечего / несколько) · 2 — ошибка входа.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  appendFrictionAmend,
  closeProcedureRun,
  defaultTrailPath,
  findUnclosedRuns,
  openProcedureRun,
  readProcedureRunTrail,
} from './lib/procedure-run-journal.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_SWEEP_DAYS = 7;

/** Даты назад от dateIso (сама дата не входит), формой YYYY-MM-DD. */
export function datesBack(dateIso, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) throw new Error(`dateIso must be YYYY-MM-DD: ${dateIso}`);
  const t = Date.UTC(+dateIso.slice(0, 4), +dateIso.slice(5, 7) - 1, +dateIso.slice(8, 10));
  return Array.from({ length: days }, (_, k) => new Date(t - (k + 1) * 86_400_000).toISOString().slice(0, 10));
}

/**
 * Открытые прогоны процедуры в лентах [дата события .. days суток назад].
 * @returns {Array<{trailRel: string, open: Record<string, any>}>}
 */
export function findOpenRunsAround(root, procedureId, dateIso, days = DEFAULT_SWEEP_DAYS) {
  const found = [];
  for (const d of [dateIso, ...datesBack(dateIso, days)]) {
    const trailRel = defaultTrailPath(d);
    for (const open of findUnclosedRuns(readProcedureRunTrail(root, trailRel), procedureId)) {
      found.push({ trailRel, open });
    }
  }
  return found;
}

/**
 * @param {string} root
 * @param {{procedureId: string, runId?: string, subject?: string, at: string, evidence: string[], note?: string, days?: number}} input
 */
export function cmdOpen(root, input) {
  const date = input.at.slice(0, 10);
  const targetRel = defaultTrailPath(date);
  const runId = input.runId ?? `${input.procedureId}-${date}`;
  // Кросс-файловая часть ленивого закрытия; сирот ТЕКУЩЕГО файла закроет openProcedureRun.
  const crossFileOrphans = [];
  for (const { trailRel, open } of findOpenRunsAround(root, input.procedureId, date, input.days)) {
    if (trailRel === targetRel) continue;
    crossFileOrphans.push(
      closeProcedureRun(root, trailRel, {
        runId: open.runId,
        status: 'fail',
        subject: `прогон оборван: open ${open.at} не был закрыт — закрыт лениво следующим прогоном процедуры`,
        at: input.at,
        evidence: [`вытеснившая запись: ${runId} (${targetRel})`],
        gaps: ['orphaned'],
      }),
    );
  }
  const { record, orphansClosed } = openProcedureRun(root, targetRel, {
    procedureId: input.procedureId,
    runId,
    subject: input.subject ?? `прогон ${input.procedureId}`,
    at: input.at,
    evidence: input.evidence,
    note: input.note,
  });
  return { record, trailRel: targetRel, orphansClosed: [...crossFileOrphans, ...orphansClosed] };
}

/** Ошибка честного отказа — различима от ошибки входа кодом возврата CLI. */
export class RefusalError extends Error {}

/**
 * @param {string} root
 * @param {{procedureId: string, status: string, runId?: string, subject?: string, at: string, evidence?: string[], gaps?: string[], friction?: string[], days?: number}} input
 */
export function cmdClose(root, input) {
  const date = input.at.slice(0, 10);
  let found = findOpenRunsAround(root, input.procedureId, date, input.days);
  if (input.runId) found = found.filter((f) => f.open.runId === input.runId);
  if (found.length === 0) {
    throw new RefusalError(
      `закрыть нечего: открытых прогонов «${input.procedureId}»${input.runId ? ` c runId «${input.runId}»` : ''} в лентах ${(input.days ?? DEFAULT_SWEEP_DAYS) + 1} суток нет`,
    );
  }
  if (found.length > 1) {
    const list = found.map((f) => `${f.open.runId} (${f.trailRel})`).join(', ');
    throw new RefusalError(`открытых прогонов несколько: ${list} — CLI молча не выбирает, адресуйте --run`);
  }
  const { trailRel, open } = found[0];
  const record = closeProcedureRun(root, trailRel, {
    runId: open.runId,
    status: input.status,
    subject: input.subject ?? `прогон ${input.procedureId} закрыт: ${input.status}`,
    at: input.at,
    evidence: input.evidence,
    gaps: input.gaps,
    friction: input.friction?.map((symptom) => ({ symptom })),
  });
  return { record, trailRel };
}

/**
 * @param {string} root
 * @param {{runId: string, sequence: number, frictionIndex: number, root?: string, fix?: string, prevention?: string, at: string, evidence: string[], days?: number}} input
 */
export function cmdAmend(root, input) {
  const date = input.at.slice(0, 10);
  for (const d of [date, ...datesBack(date, input.days ?? DEFAULT_SWEEP_DAYS)]) {
    const trailRel = defaultTrailPath(d);
    const records = readProcedureRunTrail(root, trailRel);
    if (records.some((r) => r?.runId === input.runId && r?.sequence === input.sequence)) {
      const record = appendFrictionAmend(root, trailRel, input);
      return { record, trailRel };
    }
  }
  throw new RefusalError(
    `амандмент в пустоту: записи ${input.runId}#${input.sequence} в лентах ${(input.days ?? DEFAULT_SWEEP_DAYS) + 1} суток нет`,
  );
}

const REPEATABLE = new Set(['evidence', 'gap', 'friction']);
const KNOWN = new Set([
  'procedure', 'run', 'status', 'subject', 'at', 'note', 'days',
  'sequence', 'friction-index', 'root', 'fix', 'prevention', ...REPEATABLE,
]);

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!['open', 'close', 'amend'].includes(command ?? '')) {
    throw new Error(`команда «${command ?? '—'}» вне {open|close|amend}`);
  }
  /** @type {Record<string, any>} */
  const out = { command, evidence: [], gap: [], friction: [] };
  for (let i = 0; i < rest.length; i += 1) {
    const a = rest[i];
    if (!a.startsWith('--')) throw new Error(`неожиданный аргумент «${a}»`);
    const key = a.slice(2);
    if (!KNOWN.has(key)) throw new Error(`неизвестный флаг «${a}»`);
    const value = rest[++i];
    if (value === undefined) throw new Error(`флаг «${a}» без значения`);
    if (REPEATABLE.has(key)) out[key].push(value);
    else out[key] = value;
  }
  return out;
}

function main(argv) {
  const args = parseArgs(argv);
  const at = args.at ?? new Date().toISOString();
  const days = args.days === undefined ? undefined : Number(args.days);
  let res;
  if (args.command === 'open') {
    if (!args.procedure) throw new Error('open: нужен --procedure');
    res = cmdOpen(repoRoot, {
      procedureId: args.procedure, runId: args.run, subject: args.subject,
      at, evidence: args.evidence, note: args.note, days,
    });
    for (const o of res.orphansClosed) {
      console.log(`журнал: сирота закрыта лениво — ${o.runId} (fail/orphaned)`);
    }
  } else if (args.command === 'close') {
    if (!args.procedure || !args.status) throw new Error('close: нужны --procedure и --status');
    res = cmdClose(repoRoot, {
      procedureId: args.procedure, status: args.status, runId: args.run, subject: args.subject,
      at, evidence: args.evidence, gaps: args.gap, friction: args.friction, days,
    });
  } else {
    res = cmdAmend(repoRoot, {
      runId: args.run, sequence: Number(args.sequence), frictionIndex: Number(args['friction-index']),
      root: args.root, fix: args.fix, prevention: args.prevention, at, evidence: args.evidence, days,
    });
  }
  const r = res.record;
  console.log(
    `журнал: ${args.command} записан — ${r.runId}#${r.sequence} · ${r.status} · ${res.trailRel} · leafHash ${r.ledger.leafHash.slice(0, 12)}…`,
  );
  return 0;
}

if (process.argv[1]?.endsWith('procedure-run-record.mjs')) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (e) {
    if (e instanceof RefusalError) {
      console.error(`procedure-run-record — отказ: ${e.message}`);
      process.exit(1);
    }
    console.error(`procedure-run-record — ошибка входа: ${e.message}`);
    process.exit(2);
  }
}
