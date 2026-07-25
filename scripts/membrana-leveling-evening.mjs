#!/usr/bin/env node
/**
 * Вечерний soft-шаг leveling-workspace (ritual:evening).
 *
 * snapshot → gate (plan-only main-fill) → отчёт на диск.
 * Не вызывает pr:ship. STOP → exit 3 (finding); ошибка скрипта → 1.
 *
 * @see docs/tasks/evening-ritual-steps.json
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runLevelingGate } from './lib/membrana-leveling-gate.mjs';
import { planMainFill } from './lib/membrana-leveling-main-fill.mjs';
import { buildWorkspaceLevelReport } from './lib/membrana-leveling-report.mjs';
import { assertNoWipSnapshotInRepo, createScratchRoot, cleanupScratchRoot } from './lib/membrana-leveling-scratch.mjs';
import { snapshotWorkspace } from './lib/membrana-leveling-snapshot.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string[]} argv
 */
export function parseEveningArgs(argv) {
  /** @type {{ help: boolean, ctx: string | null, out: string | null, date: string | null, json: boolean }} */
  const out = { help: false, ctx: null, out: null, date: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--json') out.json = true;
    else if (a === '--ctx') {
      const next = argv[++i];
      if (!next) throw new Error('--ctx требует путь');
      out.ctx = next;
    } else if (a === '--out') {
      const next = argv[++i];
      if (!next) throw new Error('--out требует путь');
      out.out = next;
    } else if (a === '--date') {
      const next = argv[++i];
      if (!next) throw new Error('--date требует YYYY-MM-DD');
      out.date = next;
    } else if (a.startsWith('-')) throw new Error(`неизвестный флаг: ${a}`);
    else throw new Error(`лишний аргумент: ${a}`);
  }
  return out;
}

/**
 * @param {import('./lib/membrana-leveling-gate.mjs').GateItem[]} items
 */
function readyUnitsFromItems(items) {
  /** @type {Map<string, string[]>} */
  const byUnit = new Map();
  for (const item of items) {
    const c = item.ctx ?? {};
    const isReady =
      c.registered &&
      c.ciGreen &&
      c.prApproved &&
      c.leadStamp &&
      !c.inActiveSession &&
      !c.conflictsMain;
    if (!isReady) continue;
    const id =
      (typeof item.unitId === 'string' && item.unitId) ||
      (c.unitOf != null ? String(c.unitOf) : item.path);
    if (!byUnit.has(id)) byUnit.set(id, []);
    byUnit.get(id)?.push(item.path);
  }
  return [...byUnit.entries()].map(([id, paths]) => ({ id, paths }));
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string, now?: Date }} [deps]
 * @returns {number}
 */
export function runLevelingEveningCli(argv, deps = {}) {
  const cwd = deps.cwd ?? root;
  let args;
  try {
    args = parseEveningArgs(argv);
  } catch (err) {
    console.error(`leveling-evening: ${err instanceof Error ? err.message : err}`);
    return 2;
  }
  if (args.help) {
    console.log(
      'Usage: node scripts/membrana-leveling-evening.mjs [--ctx overlay.json] [--out path.md] [--date YYYY-MM-DD] [--json]',
    );
    return 0;
  }

  const today = args.date ?? (deps.now ?? new Date()).toISOString().slice(0, 10);
  const scratch = createScratchRoot();
  try {
    const snap = snapshotWorkspace(cwd, { overlayPath: args.ctx });
    const paths = snap.items.map((i) => i.path);
    const wip = assertNoWipSnapshotInRepo(paths);
    if (!wip.ok) {
      console.error(`leveling-evening: T13 WIP в repo: ${wip.offenders.join(', ')}`);
      return 1;
    }

    const readyUnits = readyUnitsFromItems(snap.items);
    const plan = planMainFill(readyUnits);
    const injectStatus = plan.queue.length > 0 ? 'pending' : 'noop';

    const gate = runLevelingGate({
      items: snap.items,
      namedTrash: snap.namedTrash,
      unfinishedCards: snap.unfinishedCards,
      mainFill: { injectStatus },
    });

    const report = buildWorkspaceLevelReport(gate, {
      builtAt: new Date().toISOString(),
      gateArtifactRef: 'evening-snapshot',
    });

    const planBlock = [
      '',
      '## План main-fill (ритуал — без ship)',
      '',
      plan.queue.length === 0
        ? '_ready-очередь пуста — inject noop_'
        : [
            'Ожидает слова владельца (`membrana-leveling` skill + `--ship-ok` / main-fill execute):',
            '',
            ...plan.queue.map((u) => `- \`${u.id}\` (${u.paths.length} path(s))`),
          ].join('\n'),
      '',
      '## HANDOFF',
      '',
      'Шов соседям: [`docs/HANDOFF.md`](../HANDOFF.md) · процедура [`membrana-leveling`](../procedures/membrana-leveling/README.md).',
      '',
    ].join('\n');

    const markdown = `${report.markdown.trimEnd()}\n${planBlock}`;

    const defaultOut = join(cwd, 'docs', 'seanses', `workspace-level-${today}.md`);
    const outPath = args.out ? join(cwd, args.out) : defaultOut;
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, markdown, 'utf8');

    const archiveDir = join(cwd, 'docs', 'archive', 'daily-day', today);
    if (existsSync(archiveDir)) {
      writeFileSync(join(archiveDir, `workspace-level-${today}.md`), markdown, 'utf8');
    }

    if (args.json) {
      console.log(
        JSON.stringify(
          {
            gate: { status: gate.status, reason: gate.reason, mainFill: gate.mainFill },
            plan: plan.queue,
            out: outPath,
          },
          null,
          2,
        ),
      );
    } else {
      console.log(markdown);
      console.error(`leveling-evening: wrote ${outPath} gate=${gate.status}`);
    }

    if (gate.status === 'pass') return 0;
    // STOP = finding (soft), не роняет team-evening-feedback
    return 3;
  } catch (err) {
    console.error(`leveling-evening: ${err instanceof Error ? err.message : err}`);
    return 1;
  } finally {
    cleanupScratchRoot(scratch);
  }
}

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('/membrana-leveling-evening.mjs')) {
  try {
    process.exitCode = runLevelingEveningCli(process.argv.slice(2));
  } catch (err) {
    console.error(`leveling-evening: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  }
}
