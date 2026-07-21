#!/usr/bin/env node
/**
 * yarn scripts:registry — derived-реестр состава scripts/ (S1 #793).
 *
 * Пишет scripts/registry/SCRIPTS_LIST.md. Сырой tooling:overview — только в cache/
 * по флагу --cache-overview.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
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
 * @param {string} relBase posix-ish from repo root
 * @param {string[]} out
 */
function walkCodeFiles(dirAbs, relBase, out) {
  if (!existsSync(dirAbs)) return;
  for (const ent of readdirSync(dirAbs, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    if (ent.isDirectory()) {
      if (SCRIPT_SKIP_DIRS.has(ent.name)) continue;
      walkCodeFiles(join(dirAbs, ent.name), `${relBase}/${ent.name}`, out);
      continue;
    }
    const rel = `${relBase}/${ent.name}`.replace(/\\/g, '/');
    if (isScriptCodePath(rel)) out.push(rel);
  }
}

function headSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', cwd: repoRoot }).trim();
  } catch {
    return 'n/a';
  }
}

function main() {
  const cli = parseScriptsRegistryCli(process.argv.slice(2));
  if (cli.help) {
    console.log(SCRIPTS_REGISTRY_HELP);
    return;
  }

  const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
  const files = [];
  walkCodeFiles(join(repoRoot, 'scripts'), 'scripts', files);

  const inventory = buildScriptsInventory({
    yarnScripts: pkg.scripts ?? {},
    files,
  });

  const date = new Date().toISOString().slice(0, 10);
  const meta = {
    Date: date,
    'Head SHA': headSha(),
    Source: 'yarn scripts:registry --report',
    'SoT': 'scripts/** (code) + package.json#scripts',
  };

  if (cli.cacheOverview) {
    const cacheDir = join(repoRoot, 'scripts', 'cache');
    mkdirSync(cacheDir, { recursive: true });
    const overview = execFileSync('yarn', ['tooling:overview', '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
      shell: true,
    });
    writeFileSync(join(cacheDir, 'tooling-overview.json'), overview, 'utf8');
    console.log('cache: scripts/cache/tooling-overview.json');
  }

  if (cli.report) {
    const reportAbs = resolve(repoRoot, cli.report);
    mkdirSync(dirname(reportAbs), { recursive: true });
    const md = renderScriptsList(inventory, meta);
    writeFileSync(reportAbs, md, 'utf8');
    console.log(`Реестр: ${relative(repoRoot, reportAbs).replace(/\\/g, '/')}`);

    if (cli.dated) {
      const datedRel = join('scripts', 'registry', `SCRIPTS_LIST-${date}.md`);
      const datedAbs = join(repoRoot, datedRel);
      writeFileSync(datedAbs, md, 'utf8');
      console.log(`Dated: ${datedRel.replace(/\\/g, '/')}`);
    }
  } else if (!cli.json && !cli.cacheOverview) {
    console.log(SCRIPTS_REGISTRY_HELP);
    console.log(
      `(dry summary) files=${inventory.counts.files} yarn→scripts=${inventory.counts.yarnTouching} orphans=${inventory.counts.orphanFiles} broken=${inventory.counts.yarnBroken}`,
    );
    console.log(`Канон: yarn scripts:registry --report`);
  }

  if (cli.json) {
    console.log(JSON.stringify({ meta, counts: inventory.counts }, null, 2));
  } else if (cli.report) {
    console.log(
      `summary: files=${inventory.counts.files} yarn→scripts=${inventory.counts.yarnTouching} orphans=${inventory.counts.orphanFiles} broken=${inventory.counts.yarnBroken}`,
    );
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
