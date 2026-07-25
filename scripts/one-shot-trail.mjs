#!/usr/bin/env node
/**
 * yarn one-shot:trail check|record|ensure …
 *
 * Журнал анти-дробления (M5B / #1065 / EPIC V9).
 * Чистые функции: scripts/lib/one-shot-trail.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  TRAIL_REL,
  checkShotHistory,
  ensureTrailFile,
  recordOneShot,
  trailPath,
} from './lib/one-shot-trail.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string[]} argv
 */
export function parseOneShotTrailArgs(argv) {
  /** @type {{
   *   cmd: 'check' | 'record' | 'ensure' | '',
   *   help: boolean,
   *   path: string | null,
   *   slug: string,
   *   headRev: string | null,
   *   status: 'merged' | 'cancelled',
   *   trail: string | null,
   * }} */
  const out = {
    cmd: '',
    help: false,
    path: null,
    slug: '',
    headRev: null,
    status: 'merged',
    trail: null,
  };
  const rest = [...argv];
  if (rest[0] && !rest[0].startsWith('-')) {
    out.cmd = /** @type {'check'|'record'|'ensure'} */ (rest.shift());
  }
  for (let i = 0; i < rest.length; i += 1) {
    const a = rest[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--path') {
      const next = rest[++i];
      if (!next) throw new Error('--path требует значение');
      out.path = next;
    } else if (a === '--slug') {
      const next = rest[++i];
      if (!next) throw new Error('--slug требует значение');
      out.slug = next;
    } else if (a === '--head-rev') {
      const next = rest[++i];
      if (!next) throw new Error('--head-rev требует значение');
      out.headRev = next;
    } else if (a === '--status') {
      const next = rest[++i];
      if (next !== 'merged' && next !== 'cancelled') {
        throw new Error('--status: merged|cancelled');
      }
      out.status = next;
    } else if (a === '--trail') {
      const next = rest[++i];
      if (!next) throw new Error('--trail требует путь');
      out.trail = next;
    } else if (a.startsWith('-')) throw new Error(`неизвестный флаг: ${a}`);
    else throw new Error(`лишний аргумент: ${a}`);
  }
  return out;
}

function printUsage() {
  console.log(`Usage:
  yarn one-shot:trail check [--trail path]
  yarn one-shot:trail ensure [--trail path]
  yarn one-shot:trail record --path <repoPath> --head-rev <sha> [--slug s] [--status merged|cancelled]

  Журнал: ${TRAIL_REL} (независим от registry.json).
  check — CI-гейт JSONL + non-decreasing timestamps (exit 1 при ошибке).
  record — идемпотентная строка (path|slug|headRev).
`);
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string }} [deps]
 * @returns {number}
 */
export function runOneShotTrail(argv, deps = {}) {
  const cwd = deps.cwd ?? root;
  let args;
  try {
    args = parseOneShotTrailArgs(argv);
  } catch (err) {
    console.error(`one-shot:trail: ${err instanceof Error ? err.message : err}`);
    printUsage();
    return 2;
  }

  if (args.help || !args.cmd) {
    printUsage();
    return args.help ? 0 : 2;
  }

  const rel = args.trail ?? TRAIL_REL;

  if (args.cmd === 'ensure') {
    const abs = join(cwd, rel);
    mkdirSync(dirname(abs), { recursive: true });
    if (!existsSync(abs)) {
      if (rel === TRAIL_REL) ensureTrailFile(cwd);
      else writeFileSync(abs, '# one-shot-trail\n', 'utf8');
    }
    console.log(`one-shot:trail: ensure ${abs}`);
    return 0;
  }

  if (args.cmd === 'check') {
    const abs = trailPath(cwd, rel);
    let text = '';
    try {
      text = readFileSync(abs, 'utf8');
    } catch (err) {
      console.error(
        `one-shot:trail:check: нет файла ${rel}: ${err instanceof Error ? err.message : err}`,
      );
      return 1;
    }
    const result = checkShotHistory(text);
    if (!result.ok) {
      console.error(`one-shot:trail:check FAIL (${result.errors.length})`);
      for (const e of result.errors.slice(0, 20)) console.error(`  - ${e}`);
      return 1;
    }
    console.log(`one-shot:trail:check OK — ${result.records.length} records`);
    return 0;
  }

  if (args.cmd === 'record') {
    if (!args.path || !args.headRev) {
      console.error('one-shot:trail:record: нужны --path и --head-rev');
      printUsage();
      return 2;
    }
    const { appended, record, path: abs } = recordOneShot(
      cwd,
      {
        path: args.path,
        slug: args.slug,
        headRev: args.headRev,
        status: args.status,
      },
      { rel },
    );
    console.log(
      `one-shot:trail:record ${appended ? 'appended' : 'idempotent-skip'} ${record.path} @ ${record.headRev}`,
    );
    console.log(`  → ${abs}`);
    return 0;
  }

  console.error(`one-shot:trail: неизвестная команда «${args.cmd}»`);
  printUsage();
  return 2;
}

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('/one-shot-trail.mjs')) {
  try {
    process.exitCode = runOneShotTrail(process.argv.slice(2));
  } catch (err) {
    console.error(`one-shot:trail: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 2;
  }
}
