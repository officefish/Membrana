#!/usr/bin/env node
/**
 * yarn one-shot:rank [cardId…] [--json] [--history <path>] [--no-trail] [--override-one-shot-limit]
 *
 * Ранжирование кандидатов one-shot (M5A / #1064) — не вердикт.
 * Trail / анти-дробление (M5B / #1065): docs/audit/one-shot-trail.jsonl.
 * Чистая функция: scripts/lib/one-shot-rank.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadRegistry } from './lib/task-registry.mjs';
import { rankOneShotCandidates } from './lib/one-shot-rank.mjs';
import { TRAIL_REL, readTrailFile } from './lib/one-shot-trail.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string[]} argv
 */
export function parseOneShotRankArgs(argv) {
  /** @type {{
   *   ids: string[],
   *   json: boolean,
   *   help: boolean,
   *   history: string | null,
   *   all: boolean,
   *   noTrail: boolean,
   *   trail: string | null,
   *   riskOverride: boolean,
   * }} */
  const out = {
    ids: [],
    json: false,
    help: false,
    history: null,
    all: false,
    noTrail: false,
    trail: null,
    riskOverride: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--json') out.json = true;
    else if (a === '--all') out.all = true;
    else if (a === '--no-trail') out.noTrail = true;
    else if (a === '--override-one-shot-limit' || a === '--risk-override') out.riskOverride = true;
    else if (a === '--history') {
      const next = argv[++i];
      if (!next) throw new Error('--history требует путь');
      out.history = next;
    } else if (a === '--trail') {
      const next = argv[++i];
      if (!next) throw new Error('--trail требует путь');
      out.trail = next;
    } else if (a.startsWith('-')) throw new Error(`неизвестный флаг: ${a}`);
    else out.ids.push(a);
  }
  return out;
}

function printUsage() {
  console.log(`Usage: yarn one-shot:rank [cardId…] [--json] [--all] [--history path]
                    [--trail path] [--no-trail] [--override-one-shot-limit]

  Ранжированный список кандидатов one-shot (не вердикт допуска).
  Без cardId — active size=S из registry (или --all для всех active).
  --history JSON: { "<lemma>": { "successRate": 0..1, "shots": N } }
  По умолчанию читает ${TRAIL_REL} (история + штраф цепочки LCP≥2 / 7д).
  --override-one-shot-limit — без штрафа, маркер [risk-override] в reasoning.

  Exit: 0 всегда при успешном прогоне; 2 — ошибка CLI.
`);
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string, load?: typeof loadRegistry }} [deps]
 * @returns {number}
 */
export function runOneShotRank(argv, deps = {}) {
  const cwd = deps.cwd ?? root;
  const load = deps.load ?? loadRegistry;

  let args;
  try {
    args = parseOneShotRankArgs(argv);
  } catch (err) {
    console.error(`one-shot:rank: ${err instanceof Error ? err.message : err}`);
    printUsage();
    return 2;
  }

  if (args.help) {
    printUsage();
    return 0;
  }

  const registry = load(cwd);
  let cards = Array.isArray(registry?.tasks) ? registry.tasks : [];

  try {
    if (args.ids.length) {
      cards = args.ids.map((id) => {
        const card = cards.find((t) => t.id === id);
        if (!card) throw new Error(`карточка «${id}» не найдена`);
        return card;
      });
    } else if (args.all) {
      cards = cards.filter((t) => t.status === 'active');
    } else {
      cards = cards.filter((t) => t.status === 'active' && t.size === 'S');
    }
  } catch (err) {
    console.error(`one-shot:rank: ${err instanceof Error ? err.message : err}`);
    return 2;
  }

  /** @type {Record<string, { successRate?: number, shots?: number }> | null | undefined} */
  let history = undefined;
  if (args.history) {
    try {
      history = JSON.parse(readFileSync(join(cwd, args.history), 'utf8'));
    } catch (err) {
      console.error(
        `one-shot:rank: не прочитать history: ${err instanceof Error ? err.message : err}`,
      );
      return 2;
    }
  }

  /** @type {object[] | undefined} */
  let trailRecords;
  if (!args.noTrail) {
    const rel = args.trail ?? TRAIL_REL;
    if (existsSync(join(cwd, rel))) {
      trailRecords = readTrailFile(cwd, rel);
    } else if (args.trail) {
      console.error(`one-shot:rank: нет trail-файла ${rel}`);
      return 2;
    }
  }

  let result;
  try {
    result = rankOneShotCandidates(cards, {
      ...(history !== undefined ? { history } : {}),
      ...(trailRecords !== undefined ? { trailRecords } : {}),
      riskOverride: args.riskOverride,
    });
  } catch (err) {
    // Бизнес-код не должен бросать; если бросил — CLI честно падает.
    console.error(`one-shot:rank: ${err instanceof Error ? err.message : err}`);
    return 2;
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  console.log(`one-shot:rank — кандидатов ${result.candidates.length}, исключено ${result.excluded.length}`);
  console.log('(не вердикт: штамп S — у тимлида)\n');
  for (const c of result.candidates) {
    console.log(`  ${c.score.toFixed(3)}  ${c.cardId}  [${c.serverImpactClue}]`);
    console.log(`         ${c.reasoning}`);
  }
  if (result.excluded.length) {
    console.log('\nисключены:');
    for (const e of result.excluded.slice(0, 30)) {
      console.log(`  - ${e.cardId}: ${e.reasons.join('; ')}`);
    }
    if (result.excluded.length > 30) {
      console.log(`  … ещё ${result.excluded.length - 30}`);
    }
  }
  return 0;
}

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('/one-shot-rank.mjs')) {
  try {
    process.exitCode = runOneShotRank(process.argv.slice(2));
  } catch (err) {
    console.error(`one-shot:rank: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 2;
  }
}
