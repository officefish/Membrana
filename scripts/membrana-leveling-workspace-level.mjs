#!/usr/bin/env node
/**
 * yarn membrana-leveling:workspace-level — гейт + манифест-отчёт.
 *
 * Вход: JSON-снимок gate input (items, namedTrash, unfinishedCards).
 * main-fill по умолчанию injectStatus=noop|done через флаги; реальный ship — --ship-ok.
 *
 * @see docs/prompts/MEMBRANA_LEVELING_SCRIPTS_PROMPT.md
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runLevelingGate } from './lib/membrana-leveling-gate.mjs';
import { buildWorkspaceLevelReport } from './lib/membrana-leveling-report.mjs';
import { assertNoWipSnapshotInRepo, createScratchRoot, cleanupScratchRoot } from './lib/membrana-leveling-scratch.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string[]} argv
 */
export function parseWorkspaceLevelArgs(argv) {
  /** @type {{
   *   help: boolean,
   *   json: boolean,
   *   snapshot: string | null,
   *   out: string | null,
   *   shipOk: boolean,
   *   shipFail: boolean,
   * }} */
  const out = {
    help: false,
    json: false,
    snapshot: null,
    out: null,
    shipOk: false,
    shipFail: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--json') out.json = true;
    else if (a === '--ship-ok') out.shipOk = true;
    else if (a === '--ship-fail') out.shipFail = true;
    else if (a === '--snapshot') {
      const next = argv[++i];
      if (!next) throw new Error('--snapshot требует путь');
      out.snapshot = next;
    } else if (a === '--out') {
      const next = argv[++i];
      if (!next) throw new Error('--out требует путь');
      out.out = next;
    } else if (a.startsWith('-')) throw new Error(`неизвестный флаг: ${a}`);
    else throw new Error(`лишний аргумент: ${a}`);
  }
  return out;
}

function printUsage() {
  console.log(`Usage: yarn membrana-leveling:workspace-level --snapshot file.json [--out report.md] [--json]
                              [--ship-ok|--ship-fail]

  Snapshot JSON: { items, namedTrash?, unfinishedCards? }
  Без ship-флага: mainFill inject noop если R пуст, иначе требуется --ship-ok/--ship-fail.
`);
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string }} [deps]
 * @returns {number}
 */
export function runWorkspaceLevelCli(argv, deps = {}) {
  const cwd = deps.cwd ?? root;
  let args;
  try {
    args = parseWorkspaceLevelArgs(argv);
  } catch (err) {
    console.error(`workspace-level: ${err instanceof Error ? err.message : err}`);
    printUsage();
    return 2;
  }
  if (args.help) {
    printUsage();
    return 0;
  }
  if (!args.snapshot) {
    console.error('workspace-level: нужен --snapshot');
    printUsage();
    return 2;
  }

  let snap;
  try {
    snap = JSON.parse(readFileSync(resolve(cwd, args.snapshot), 'utf8'));
  } catch (err) {
    console.error(`workspace-level: ${err instanceof Error ? err.message : err}`);
    return 2;
  }

  const paths = (snap.items ?? []).map((/** @type {{ path?: string }} */ i) => i.path).filter(Boolean);
  const wip = assertNoWipSnapshotInRepo(paths);
  if (!wip.ok) {
    console.error(`workspace-level: T13 WIP-снимок в repo: ${wip.offenders.join(', ')}`);
    return 1;
  }

  const scratch = createScratchRoot();
  try {
    /** @type {Parameters<typeof runLevelingGate>[0]['mainFill']} */
    let mainFill;
    const hasReady = (snap.items ?? []).some(
      (/** @type {{ ctx?: { leadStamp?: boolean, registered?: boolean, ciGreen?: boolean, prApproved?: boolean, inActiveSession?: boolean, conflictsMain?: boolean } }} */ i) => {
        const c = i.ctx ?? {};
        return (
          c.registered &&
          c.ciGreen &&
          c.prApproved &&
          c.leadStamp &&
          !c.inActiveSession &&
          !c.conflictsMain
        );
      },
    );
    if (args.shipFail) mainFill = { shipOne: () => ({ ok: false }) };
    else if (args.shipOk) mainFill = { shipOne: () => ({ ok: true }) };
    else if (!hasReady) mainFill = { injectStatus: 'noop' };
    else {
      console.error('workspace-level: есть ready — укажите --ship-ok или --ship-fail (нет silent merge)');
      return 2;
    }

    const gate = runLevelingGate({
      items: snap.items ?? [],
      namedTrash: snap.namedTrash ?? {},
      unfinishedCards: snap.unfinishedCards ?? {},
      mainFill,
    });

    const report = buildWorkspaceLevelReport(gate, {
      builtAt: new Date().toISOString(),
      gateArtifactRef: args.snapshot,
    });

    if (args.out) {
      // resolve, не join (b6 s-queue-2026-08-11): абсолютный путь не клеится к cwd.
      const abs = resolve(cwd, args.out);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, report.markdown, 'utf8');
    }

    if (args.json) {
      console.log(JSON.stringify({ gate, report: { ok: report.ok, sections: report.sections } }, null, 2));
    } else {
      console.log(report.markdown);
      console.log(`workspace-level: gate=${gate.status} mainFill=${gate.mainFill}`);
    }

    return gate.status === 'pass' ? 0 : 1;
  } finally {
    cleanupScratchRoot(scratch);
  }
}

export { runLevelingGate as runWorkspaceLevel };

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('/membrana-leveling-workspace-level.mjs')) {
  try {
    process.exitCode = runWorkspaceLevelCli(process.argv.slice(2));
  } catch (err) {
    console.error(`workspace-level: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 2;
  }
}
