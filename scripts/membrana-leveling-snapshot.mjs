#!/usr/bin/env node
/**
 * yarn membrana-leveling:snapshot — dirty git → JSON для --snapshot workspace-level.
 *
 * @see scripts/lib/membrana-leveling-snapshot.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { snapshotWorkspace } from './lib/membrana-leveling-snapshot.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string[]} argv
 */
export function parseSnapshotArgs(argv) {
  /** @type {{
   *   help: boolean,
   *   out: string | null,
   *   ctx: string | null,
   *   session: string[],
   *   registered: string[],
   *   leadStamp: string[],
   * }} */
  const out = {
    help: false,
    out: null,
    ctx: null,
    session: [],
    registered: [],
    leadStamp: [],
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--out') {
      const next = argv[++i];
      if (!next) throw new Error('--out требует путь');
      out.out = next;
    } else if (a === '--ctx') {
      const next = argv[++i];
      if (!next) throw new Error('--ctx требует путь');
      out.ctx = next;
    } else if (a === '--session') {
      const next = argv[++i];
      if (!next) throw new Error('--session требует csv путей');
      out.session = next.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (a === '--registered') {
      const next = argv[++i];
      if (!next) throw new Error('--registered требует csv путей');
      out.registered = next.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (a === '--lead-stamp') {
      const next = argv[++i];
      if (!next) throw new Error('--lead-stamp требует csv путей');
      out.leadStamp = next.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (a.startsWith('-')) throw new Error(`неизвестный флаг: ${a}`);
    else throw new Error(`лишний аргумент: ${a}`);
  }
  return out;
}

function printUsage() {
  console.log(`Usage: yarn membrana-leveling:snapshot [--out snap.json] [--ctx overlay.json]
                           [--session a,b] [--registered a,b] [--lead-stamp a,b]

  Без --out печатает JSON в stdout.
  Overlay/флаги — единственный источник registered / inActiveSession / leadStamp.
`);
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string }} [deps]
 * @returns {number}
 */
export function runSnapshotCli(argv, deps = {}) {
  const cwd = deps.cwd ?? root;
  let args;
  try {
    args = parseSnapshotArgs(argv);
  } catch (err) {
    console.error(`snapshot: ${err instanceof Error ? err.message : err}`);
    printUsage();
    return 2;
  }
  if (args.help) {
    printUsage();
    return 0;
  }

  let snap;
  try {
    snap = snapshotWorkspace(cwd, {
      overlayPath: args.ctx,
      sessionPaths: args.session,
      registeredPaths: args.registered,
      leadStampPaths: args.leadStamp,
    });
  } catch (err) {
    console.error(`snapshot: ${err instanceof Error ? err.message : err}`);
    return 1;
  }

  const json = `${JSON.stringify(snap, null, 2)}\n`;
  if (args.out) {
    const abs = join(cwd, args.out);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, json, 'utf8');
    console.error(`snapshot: wrote ${args.out} (${snap.items.length} items)`);
  } else {
    process.stdout.write(json);
  }
  return 0;
}

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('/membrana-leveling-snapshot.mjs')) {
  try {
    process.exitCode = runSnapshotCli(process.argv.slice(2));
  } catch (err) {
    console.error(`snapshot: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  }
}
