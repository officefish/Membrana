#!/usr/bin/env node
/**
 * Collect Membrana desktop support diagnostics (Studio / Device).
 *
 *   yarn desktop:support-collect
 *   yarn desktop:support-collect -- --out %TEMP%/membrana-support
 *   yarn desktop:support-collect -- --json
 *
 * Canon: docs/DESKTOP_APP_LOGGING_POLICY.md
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { STUDIO_APPDATA_LOG_RELATIVE } from './lib/client-logs-parser.mjs';
import { runCheck as runJournalCheck } from './studio-offline-journal-check.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function appDataRoot() {
  return process.env.APPDATA ?? join(os.homedir(), 'AppData', 'Roaming');
}

function readStudioVersion() {
  try {
    const pkg = JSON.parse(
      readFileSync(join(root, 'apps/membrana-studio/package.json'), 'utf8'),
    );
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

function parseArgs(argv) {
  const json = argv.includes('--json');
  let outDir = join(
    os.tmpdir(),
    `membrana-support-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
  );
  let product = 'studio';

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out' && argv[i + 1]) {
      outDir = resolve(argv[i + 1]);
      i += 1;
    } else if (arg === '--product' && argv[i + 1]) {
      product = argv[i + 1];
      i += 1;
    }
  }

  return { json, outDir, product };
}

function findTraceSources() {
  const base = appDataRoot();
  /** @type {{ label: string, absolute: string, mtimeMs: number }[]} */
  const found = [];

  for (const rel of STUDIO_APPDATA_LOG_RELATIVE) {
    const absolute = join(base, rel);
    if (existsSync(absolute)) {
      const stat = statSync(absolute);
      found.push({ label: rel, absolute, mtimeMs: stat.mtimeMs });
    }
  }

  found.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return found;
}

function findShellLogSources() {
  const logsDir = join(appDataRoot(), 'Membrana', 'logs');
  if (!existsSync(logsDir)) {
    return [];
  }

  /** @type {{ label: string, absolute: string, mtimeMs: number }[]} */
  const found = [];

  for (const name of readdirSync(logsDir)) {
    if (!name.startsWith('shell-') || !name.endsWith('.log')) {
      continue;
    }
    const absolute = join(logsDir, name);
    const stat = statSync(absolute);
    found.push({ label: `Membrana/logs/${name}`, absolute, mtimeMs: stat.mtimeMs });
  }

  found.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return found;
}

function main() {
  const options = parseArgs(process.argv);
  const appData = appDataRoot();
  const userData = join(appData, 'Membrana');
  const logsDir = join(userData, 'logs');
  const journalPath = join(userData, 'journal', 'items.json');

  mkdirSync(options.outDir, { recursive: true });
  mkdirSync(join(options.outDir, 'logs'), { recursive: true });

  const traceSources = findTraceSources();
  const shellSources = findShellLogSources();
  /** @type {string[]} */
  const copied = [];
  /** @type {string[]} */
  const copiedShell = [];

  if (traceSources.length > 0) {
    const primary = traceSources[0];
    const dest = join(options.outDir, 'logs', 'device-board-trace-latest.txt');
    copyFileSync(primary.absolute, dest);
    copied.push(dest);
  }

  for (const source of traceSources.slice(1)) {
    const baseName = source.label.split('/').pop() ?? 'trace.txt';
    const dest = join(options.outDir, 'logs', `copy-${baseName}`);
    copyFileSync(source.absolute, dest);
    copied.push(dest);
  }

  for (const source of shellSources) {
    const baseName = source.label.split('/').pop() ?? 'shell.log';
    const dest = join(options.outDir, 'logs', baseName);
    copyFileSync(source.absolute, dest);
    copiedShell.push(dest);
  }

  const journalSummary = existsSync(journalPath)
    ? runJournalCheck({ minTracks: 0, minReports: 0, journalPath })
    : { ok: false, error: 'journal file missing', journalPath, tracks: 0, reports: 0, total: 0 };

  const manifest = {
    collectedAt: new Date().toISOString(),
    product: options.product,
    studioVersion: readStudioVersion(),
    platform: process.platform,
    appDataRoot: appData,
    userDataRoot: userData,
    logsDir,
    journalPath,
    traceSources: traceSources.map((s) => ({ label: s.label, path: s.absolute })),
    shellSources: shellSources.map((s) => ({ label: s.label, path: s.absolute })),
    copiedFiles: copied,
    copiedShellFiles: copiedShell,
    journal: {
      exists: existsSync(journalPath),
      total: journalSummary.total ?? 0,
      tracks: journalSummary.tracks ?? 0,
      reports: journalSummary.reports ?? 0,
    },
    parseHints: [
      'yarn logs:parse -- --file <path-to>/logs/device-board-trace-latest.txt',
      `yarn studio:journal-fs-check --path "${journalPath}"`,
    ],
    policy: 'docs/DESKTOP_APP_LOGGING_POLICY.md',
  };

  const manifestPath = join(options.outDir, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  const result = {
    ok: copied.length > 0 || copiedShell.length > 0 || journalSummary.total > 0,
    outDir: options.outDir,
    manifestPath,
    traceFound: copied.length > 0,
    shellFound: copiedShell.length > 0,
    journalFound: existsSync(journalPath),
    manifest,
  };

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Membrana desktop support collect`);
    console.log(`  product: ${options.product}`);
    console.log(`  output:  ${options.outDir}`);
    console.log(`  manifest: ${manifestPath}`);
    if (copied.length > 0) {
      console.log(`  trace:   ${copied[0]}`);
    } else {
      console.log(`  trace:   NOT FOUND — save Download trace to:`);
      console.log(`           ${join(logsDir, 'device-board-trace-latest.txt')}`);
    }
    if (copiedShell.length > 0) {
      console.log(`  shell:   ${copiedShell[0]}`);
    } else {
      console.log(`  shell:   NOT FOUND — run Studio to create shell-YYYY-MM-DD.log`);
    }
    console.log(`  journal: ${existsSync(journalPath) ? `tracks=${manifest.journal.tracks} reports=${manifest.journal.reports}` : 'missing'}`);
    console.log('');
    console.log('Next (from repo clone):');
    for (const hint of manifest.parseHints) {
      console.log(`  ${hint.replace('<path-to>', options.outDir)}`);
    }
    if (process.platform === 'win32') {
      console.log('');
      console.log(`Zip (PowerShell): Compress-Archive -Path "${options.outDir}\\*" -DestinationPath "${options.outDir}.zip"`);
    }
  }

  process.exit(result.ok ? 0 : 1);
}

if (pathToFileURL(process.argv[1] ?? '').href === import.meta.url) {
  main();
}

export { appDataRoot, findTraceSources, findShellLogSources };
