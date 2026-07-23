#!/usr/bin/env node
/**
 * yarn linear:movement-audit — офлайн-зуб прыжков Backlog→Done (#1000 / ADR-0017).
 *
 *   yarn linear:movement-audit
 *   yarn linear:movement-audit --file docs/tasks/snapshots/linear-snapshot-live-ref.json
 *
 * По умолчанию читает snapshotRef из docs/tasks/movement-mode.json.
 * Сеть запрещена. Exit: 0 ок · 10 брак файла · 20 jump-ratio сигнал (не ошибка гейта).
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadMovementMode } from './lib/movement-mode.mjs';
import { auditMovementSnapshot } from './lib/linear-movement-audit.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string[]} argv
 */
export function parseAuditArgs(argv) {
  /** @type {{ file: string|null, help: boolean }} */
  const out = { file: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      out.help = true;
      continue;
    }
    if (a === '--file' || a.startsWith('--file=')) {
      out.file = a.includes('=') ? a.split('=').slice(1).join('=') : argv[++i];
      continue;
    }
  }
  return out;
}

/**
 * @param {string} repoRoot
 * @param {{ file?: string|null }} opts
 */
export function resolveAuditFile(repoRoot, opts = {}) {
  if (opts.file) return resolve(repoRoot, opts.file);
  const mode = loadMovementMode(repoRoot);
  if (!mode.snapshotRef) {
    return null;
  }
  return resolve(repoRoot, mode.snapshotRef);
}

/**
 * @param {string} repoRoot
 * @param {string[]} argv
 */
export function runLinearMovementAudit(repoRoot, argv = []) {
  const cli = parseAuditArgs(argv);
  if (cli.help) {
    return {
      exitCode: 0,
      out: {
        usage:
          'yarn linear:movement-audit [--file path/to/linear-snapshot.json]\n' +
          'Offline audit: jump = completed ∧ ¬startedAt (board mirror claim).',
      },
    };
  }
  const file = resolveAuditFile(repoRoot, cli);
  if (!file) {
    return {
      exitCode: 10,
      out: { ok: false, problem: 'нет --file и snapshotRef в movement-mode.json' },
    };
  }
  if (!existsSync(file)) {
    return { exitCode: 10, out: { ok: false, problem: `файл не найден: ${file}`, file } };
  }
  let snapshot;
  try {
    snapshot = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    return {
      exitCode: 10,
      out: {
        ok: false,
        problem: `JSON parse: ${err instanceof Error ? err.message : String(err)}`,
        file,
      },
    };
  }
  const result = auditMovementSnapshot(snapshot);
  if (!result.ok) {
    return { exitCode: 10, out: { ok: false, problem: result.problem, file } };
  }
  const audit = result.audit;
  return {
    exitCode: audit?.boardIsMirrorClaim ? 20 : 0,
    out: {
      ok: true,
      file,
      capturedAt: result.header?.capturedAt ?? null,
      recordCount: result.header?.recordCount ?? null,
      audit,
      note:
        'Доска Linear = зеркало GitHub; слой движения = снимок (ADR-0017 DRAFT до LGTM).',
    },
  };
}

const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('/linear-movement-audit.mjs');
if (isMain) {
  const { exitCode, out } = runLinearMovementAudit(root, process.argv.slice(2));
  console.log(JSON.stringify(out, null, 2));
  process.exitCode = exitCode;
}
