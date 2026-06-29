#!/usr/bin/env node
/**
 * DB3H-S3 ST2-J: verify Membrana Studio offline journal on disk.
 *
 *   yarn studio:journal-fs-check
 *   yarn studio:journal-fs-check --json
 *   yarn studio:journal-fs-check --min-tracks 2 --min-reports 2
 *
 * Run after autonomous Studio smoke (device-board Run ≥3 min).
 * Default path: %APPDATA%/Membrana/journal/items.json (Windows).
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import os from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function defaultJournalPath() {
  const appData = process.env.APPDATA ?? join(os.homedir(), 'AppData', 'Roaming');
  return join(appData, 'Membrana', 'journal', 'items.json');
}

function parseArgs(argv) {
  const json = argv.includes('--json');
  let minTracks = 1;
  let minReports = 1;
  let journalPath = defaultJournalPath();

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--min-tracks' && argv[i + 1]) {
      minTracks = Number(argv[i + 1]);
      i += 1;
    } else if (arg === '--min-reports' && argv[i + 1]) {
      minReports = Number(argv[i + 1]);
      i += 1;
    } else if (arg === '--path' && argv[i + 1]) {
      journalPath = resolve(argv[i + 1]);
      i += 1;
    }
  }

  return { json, minTracks, minReports, journalPath };
}

function classifyItems(items) {
  let tracks = 0;
  let reports = 0;
  let other = 0;

  for (const item of items) {
    const kind = item?.kind ?? item?.entryKind ?? item?.type;
    if (kind === 'track' || item?.track != null) {
      tracks += 1;
    } else if (kind === 'report' || item?.report != null) {
      reports += 1;
    } else {
      other += 1;
    }
  }

  return { tracks, reports, other, total: items.length };
}

function runCheck(options) {
  const { minTracks, minReports, journalPath } = options;
  const mediaLibraryDir = join(dirname(journalPath), '..', 'media-library');

  if (!existsSync(journalPath)) {
    return {
      ok: false,
      journalPath,
      error: 'journal file missing',
      tracks: 0,
      reports: 0,
      total: 0,
      mediaLibraryExists: existsSync(mediaLibraryDir),
    };
  }

  let items = [];
  try {
    const raw = readFileSync(journalPath, 'utf8');
    const parsed = JSON.parse(raw);
    items = Array.isArray(parsed) ? parsed : (parsed?.items ?? []);
  } catch (err) {
    return {
      ok: false,
      journalPath,
      error: err instanceof Error ? err.message : String(err),
      tracks: 0,
      reports: 0,
      total: 0,
      mediaLibraryExists: existsSync(mediaLibraryDir),
    };
  }

  const counts = classifyItems(items);
  const ok = counts.tracks >= minTracks && counts.reports >= minReports;
  const stat = statSync(journalPath);

  return {
    ok,
    journalPath,
    ...counts,
    minTracks,
    minReports,
    mediaLibraryExists: existsSync(mediaLibraryDir),
    modifiedIso: stat.mtime.toISOString(),
    sizeBytes: stat.size,
  };
}

function main() {
  const options = parseArgs(process.argv);
  const result = runCheck(options);

  if (options.json) {
    console.log(JSON.stringify({ ...result, repoRoot: root }, null, 2));
  } else {
    console.log(`Journal: ${result.journalPath}`);
    if (result.error) {
      console.log(`ERROR: ${result.error}`);
    } else {
      console.log(
        `items: total=${result.total} tracks=${result.tracks} reports=${result.reports} other=${result.other ?? 0}`,
      );
      console.log(`media-library dir: ${result.mediaLibraryExists ? 'yes' : 'no'}`);
      console.log(`modified: ${result.modifiedIso} (${result.sizeBytes} bytes)`);
      console.log(`threshold: tracks≥${result.minTracks} reports≥${result.minReports}`);
    }
    console.log(result.ok ? 'PASS offline journal FS check' : 'FAIL offline journal FS check');
  }

  process.exit(result.ok ? 0 : 1);
}

if (pathToFileURL(process.argv[1] ?? '').href === import.meta.url) {
  main();
}

export { runCheck, defaultJournalPath };
