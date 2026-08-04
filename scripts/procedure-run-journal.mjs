#!/usr/bin/env node
/**
 * procedure-run:journal — append/check/report local procedure execution trail.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  appendProcedureRunRecord,
  buildProcedureRunRecord,
  defaultTrailPath,
  readProcedureRunTrail,
  summarizeProcedureRunTrail,
  validateProcedureRunRecord,
  validateProcedureRunTrail,
} from './lib/procedure-run-journal.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      out._.push(arg);
      continue;
    }
    const [rawKey, rawValue] = arg.slice(2).split('=');
    const key = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = rawValue ?? argv[++i];
    if (['evidence', 'gap'].includes(rawKey)) {
      out[key] ??= [];
      out[key].push(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function usage() {
  console.error(`Usage:
  node scripts/procedure-run-journal.mjs append --procedure <id> --run-id <id> --status pass|fail|blocked|skipped --subject "..." --evidence <path> [--gap "..."]
  node scripts/procedure-run-journal.mjs check [--trail docs/procedure-runs/trail/YYYY-MM-DD.jsonl]
  node scripts/procedure-run-journal.mjs report [--trail docs/procedure-runs/trail/YYYY-MM-DD.jsonl]`);
}

function writeStdout(line = '') {
  process.stdout.write(`${line}\n`);
}

function resolveTrail(args) {
  return args.trail || defaultTrailPath(args.date || todayIso());
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  const trail = resolveTrail(args);

  try {
    if (cmd === 'append') {
      const records = readProcedureRunTrail(repoRoot, trail);
      const record = buildProcedureRunRecord(
        {
          procedureId: args.procedure || args.procedureId,
          runId: args.runId,
          frameId: args.frameId,
          stepId: args.stepId,
          status: args.status,
          subject: args.subject,
          evidence: args.evidence,
          gaps: args.gap,
          note: args.note,
        },
        { nowIso: new Date().toISOString(), sequence: records.length + 1 },
      );
      appendProcedureRunRecord(repoRoot, trail, record);
      writeStdout(`procedure-run:journal append ${trail}#${record.sequence} ${record.status} ${record.runId}`);
      return;
    }

    if (cmd === 'check') {
      const records = readProcedureRunTrail(repoRoot, trail);
      const problems = records.flatMap((record, index) =>
        validateProcedureRunRecord(record).map((p) => `${trail}:${index + 1}: ${p}`),
      );
      // Суд ленты (#1683): монотонность sequence внутри runId — уровень, которого
      // не видит по-записный валидатор.
      for (const f of validateProcedureRunTrail(records)) {
        problems.push(
          `${trail}:${f.line}: ${f.problem} — runId ${f.runId}: sequence ${f.sequence} после ${f.prevSequence} (строка ${f.prevLine})`,
        );
      }
      if (problems.length > 0) {
        for (const p of problems) console.error(`✖ ${p}`);
        process.exitCode = 1;
        return;
      }
      writeStdout(`procedure-run:journal ok ${trail} (${records.length} records)`);
      return;
    }

    if (cmd === 'report') {
      const records = readProcedureRunTrail(repoRoot, trail);
      const summary = summarizeProcedureRunTrail(records);
      writeStdout(`# procedure-run journal report`);
      writeStdout(`trail: ${trail}`);
      writeStdout(`total: ${summary.total}`);
      writeStdout(`pass: ${summary.pass}`);
      writeStdout(`fail: ${summary.fail}`);
      writeStdout(`blocked: ${summary.blocked}`);
      writeStdout(`skipped: ${summary.skipped}`);
      writeStdout(`gaps:`);
      if (summary.gaps.length === 0) writeStdout(`- (empty)`);
      for (const g of summary.gaps) writeStdout(`- ${g.procedureId}/${g.runId}: ${g.gap}`);
      return;
    }
  } catch (e) {
    console.error(`procedure-run:journal: ${e.message}`);
    process.exitCode = 1;
    return;
  }

  usage();
  process.exitCode = 1;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/procedure-run-journal.mjs')) main();
