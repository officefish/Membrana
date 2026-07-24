#!/usr/bin/env node
/**
 * yarn closure:acceptance-audit — офлайн-зуб приёмки day-sprint CLOSURE (#1001).
 *
 *   yarn closure:acceptance-audit
 *   yarn closure:acceptance-audit --dir docs/day-sprint
 *   yarn closure:acceptance-audit --file docs/day-sprint/<id>/CLOSURE.md --mode soft|hard
 *
 * Сеть запрещена. Exit:
 *   0  — каталог: confirmed-доля ≥ 50%; single: pass или soft-замечание
 *   12 — ACCEPTANCE_UNCONFIRMED (single --file, mode=hard)
 *   20 — gateClaim на каталоге (confirmed < 50%) — сигнал, не hard-отказ CI
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkAcceptance } from './lib/trace-acceptance.mjs';
import {
  auditClosureFiles,
  parseClosureAcceptance,
  toAcceptanceArtifact,
} from './lib/closure-acceptance-audit.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string[]} argv
 */
export function parseClosureAuditArgs(argv) {
  /** @type {{ dir: string|null, file: string|null, mode: 'soft'|'hard', help: boolean }} */
  const out = { dir: null, file: null, mode: 'soft', help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      out.help = true;
      continue;
    }
    if (a === '--dir' || a.startsWith('--dir=')) {
      out.dir = a.includes('=') ? a.split('=').slice(1).join('=') : argv[++i];
      continue;
    }
    if (a === '--file' || a.startsWith('--file=')) {
      out.file = a.includes('=') ? a.split('=').slice(1).join('=') : argv[++i];
      continue;
    }
    if (a === '--mode' || a.startsWith('--mode=')) {
      const m = a.includes('=') ? a.split('=').slice(1).join('=') : argv[++i];
      out.mode = m === 'hard' ? 'hard' : 'soft';
      continue;
    }
  }
  return out;
}

/**
 * @param {string} dir абсолютный каталог обхода
 * @param {string} repoRoot корень репо (для относительных path в отчёте)
 * @returns {{ path: string, text: string }[]}
 */
export function collectClosureFiles(dir, repoRoot) {
  /** @type {{ path: string, text: string }[]} */
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      out.push(...collectClosureFiles(full, repoRoot));
      continue;
    }
    if (name === 'CLOSURE.md') {
      out.push({
        path: relative(repoRoot, full).replace(/\\/g, '/'),
        text: readFileSync(full, 'utf8'),
      });
    }
  }
  return out;
}

/**
 * @param {string} repoRoot
 * @param {string[]} argv
 */
export function runClosureAcceptanceAudit(repoRoot, argv = []) {
  const cli = parseClosureAuditArgs(argv);
  if (cli.help) {
    return {
      exitCode: 0,
      out: {
        usage:
          'yarn closure:acceptance-audit [--dir docs/day-sprint] [--file path/CLOSURE.md] [--mode soft|hard]\n' +
          'confirmed = acceptedBy + headRev; narrative = LGTM without revision; absent = no acceptance.',
      },
    };
  }

  if (cli.file) {
    const abs = resolve(repoRoot, cli.file);
    if (!existsSync(abs)) {
      return { exitCode: 10, out: { ok: false, problem: `файл не найден: ${abs}` } };
    }
    const text = readFileSync(abs, 'utf8');
    const parsed = parseClosureAcceptance(text);
    const artifact = toAcceptanceArtifact(cli.file, parsed);
    const gate = checkAcceptance(artifact, { mode: cli.mode });
    const hardFail = cli.mode === 'hard' && gate.verdict !== 'pass';
    return {
      exitCode: hardFail ? 12 : 0,
      out: {
        ok: gate.verdict === 'pass',
        file: relative(repoRoot, abs).replace(/\\/g, '/'),
        parsed,
        gate: { verdict: gate.verdict, reason: gate.reason, code: gate.code },
        note:
          'Канон: CLOSURE обязан нести acceptedBy + headRev (LINEAR_TASKS_GEAR §4 / #1001).',
      },
    };
  }

  const dirRel = cli.dir ?? 'docs/day-sprint';
  const dirAbs = resolve(repoRoot, dirRel);
  if (!existsSync(dirAbs)) {
    return { exitCode: 10, out: { ok: false, problem: `каталог не найден: ${dirAbs}` } };
  }
  const files = collectClosureFiles(dirAbs, repoRoot);
  const audit = auditClosureFiles(files);
  return {
    exitCode: audit.gateClaim ? 20 : 0,
    out: {
      ok: !audit.gateClaim,
      dir: dirRel,
      audit: {
        total: audit.total,
        confirmed: audit.confirmed,
        narrative: audit.narrative,
        absent: audit.absent,
        confirmedRatio: audit.confirmedRatio,
        anyAcceptanceRatio: audit.anyAcceptanceRatio,
        gateClaim: audit.gateClaim,
        sampleAbsent: audit.sampleAbsent,
        sampleNarrative: audit.sampleNarrative,
      },
      note:
        'confirmed = принявший+ревизия; narrative ≈ вещдок «LGTM без headRev»; Linear Done ≠ приёмка (ADR-0017).',
    },
  };
}

const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('/closure-acceptance-audit.mjs');
if (isMain) {
  const { exitCode, out } = runClosureAcceptanceAudit(root, process.argv.slice(2));
  console.log(JSON.stringify(out, null, 2));
  process.exitCode = exitCode;
}
