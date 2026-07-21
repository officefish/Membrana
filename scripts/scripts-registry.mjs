#!/usr/bin/env node
/**
 * yarn scripts:registry — derived-реестр состава scripts/ (S1 #793 / S2 #794).
 *
 * Пишет scripts/registry/SCRIPTS_LIST.md. Сырой tooling:overview — только в cache/
 * по флагу --cache-overview.
 *
 * Экспорт `writeScriptsRegistryReport` — общая запись для `tooling:overview --report`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_SCRIPTS_REPORT,
  SCRIPT_SKIP_DIRS,
  buildScriptsInventory,
  isScriptCodePath,
  parseScriptsRegistryCli,
  renderScriptsList,
  SCRIPTS_REGISTRY_HELP,
} from './lib/scripts-inventory.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string} dirAbs
 * @param {string} relBase
 * @param {string[]} out
 */
export function walkScriptCodeFiles(dirAbs, relBase, out) {
  if (!existsSync(dirAbs)) return;
  for (const ent of readdirSync(dirAbs, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    if (ent.isDirectory()) {
      if (SCRIPT_SKIP_DIRS.has(ent.name)) continue;
      walkScriptCodeFiles(join(dirAbs, ent.name), `${relBase}/${ent.name}`, out);
      continue;
    }
    const rel = `${relBase}/${ent.name}`.replace(/\\/g, '/');
    if (isScriptCodePath(rel)) out.push(rel);
  }
}

function headSha(cwd) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'n/a';
  }
}

/**
 * Записать канонический SCRIPTS_LIST.md (и опционально dated).
 *
 * @param {string} root
 * @param {{
 *   report?: string,
 *   source?: string,
 *   dated?: boolean,
 *   date?: string,
 * }} [opts]
 */
export function writeScriptsRegistryReport(root, opts = {}) {
  const reportRel = opts.report ?? DEFAULT_SCRIPTS_REPORT;
  const source = opts.source ?? 'yarn scripts:registry --report';
  const date = opts.date ?? new Date().toISOString().slice(0, 10);

  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const files = [];
  walkScriptCodeFiles(join(root, 'scripts'), 'scripts', files);

  const inventory = buildScriptsInventory({
    yarnScripts: pkg.scripts ?? {},
    files,
  });

  const meta = {
    Date: date,
    'Head SHA': headSha(root),
    Source: source,
    SoT: 'scripts/** (code) + package.json#scripts',
  };

  const reportAbs = resolve(root, reportRel);
  mkdirSync(dirname(reportAbs), { recursive: true });
  const md = renderScriptsList(inventory, meta);
  writeFileSync(reportAbs, md, 'utf8');

  /** @type {string | null} */
  let datedRel = null;
  if (opts.dated) {
    datedRel = join('scripts', 'registry', `SCRIPTS_LIST-${date}.md`).replace(/\\/g, '/');
    writeFileSync(join(root, datedRel), md, 'utf8');
  }

  return {
    reportRel: relative(root, reportAbs).replace(/\\/g, '/'),
    datedRel,
    meta,
    counts: inventory.counts,
    inventory,
  };
}

function main() {
  const cli = parseScriptsRegistryCli(process.argv.slice(2));
  if (cli.help) {
    console.log(SCRIPTS_REGISTRY_HELP);
    return;
  }

  if (cli.cacheOverview) {
    const cacheDir = join(repoRoot, 'scripts', 'cache');
    mkdirSync(cacheDir, { recursive: true });
    const overview = execFileSync(process.execPath, [join(repoRoot, 'scripts/tooling-overview.mjs'), '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    writeFileSync(join(cacheDir, 'tooling-overview.json'), overview, 'utf8');
    console.log('cache: scripts/cache/tooling-overview.json');
  }

  if (cli.report) {
    const written = writeScriptsRegistryReport(repoRoot, {
      report: cli.report,
      dated: cli.dated,
      source: 'yarn scripts:registry --report',
    });
    console.log(`Реестр: ${written.reportRel}`);
    if (written.datedRel) console.log(`Dated: ${written.datedRel}`);
    console.log(
      `summary: files=${written.counts.files} yarn→scripts=${written.counts.yarnTouching} orphans=${written.counts.orphanFiles} broken=${written.counts.yarnBroken}`,
    );
    if (cli.json) {
      console.log(JSON.stringify({ meta: written.meta, counts: written.counts }, null, 2));
    }
    return;
  }

  if (cli.json) {
    const files = [];
    walkScriptCodeFiles(join(repoRoot, 'scripts'), 'scripts', files);
    const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
    const inventory = buildScriptsInventory({ yarnScripts: pkg.scripts ?? {}, files });
    const meta = {
      Date: new Date().toISOString().slice(0, 10),
      'Head SHA': headSha(repoRoot),
      Source: 'yarn scripts:registry --json',
      SoT: 'scripts/** (code) + package.json#scripts',
    };
    console.log(JSON.stringify({ meta, counts: inventory.counts }, null, 2));
    return;
  }

  if (!cli.cacheOverview) {
    console.log(SCRIPTS_REGISTRY_HELP);
    const files = [];
    walkScriptCodeFiles(join(repoRoot, 'scripts'), 'scripts', files);
    const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
    const inventory = buildScriptsInventory({ yarnScripts: pkg.scripts ?? {}, files });
    console.log(
      `(dry summary) files=${inventory.counts.files} yarn→scripts=${inventory.counts.yarnTouching} orphans=${inventory.counts.orphanFiles} broken=${inventory.counts.yarnBroken}`,
    );
    console.log(`Канон: yarn scripts:registry --report`);
    console.log(`Эквивалент: yarn tooling:overview --report`);
  }
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('scripts-registry.mjs') || process.argv[1].endsWith('scripts-registry.js'));
if (isMain) {
  try {
    main();
  } catch (e) {
    console.error('scripts:registry ERR:', e?.message ?? e);
    process.exitCode = 1;
  }
}
