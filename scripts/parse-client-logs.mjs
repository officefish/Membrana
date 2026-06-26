#!/usr/bin/env node
/**
 * Parse Membrana client device-board console logs (logs_parsing workflow).
 *
 * Usage:
 *   yarn logs:parse
 *   yarn logs:parse -- --file logs/apps/client/logs.txt
 *   yarn logs:parse -- --run-id 7e8a289c --json
 *
 * Canon: docs/device-board-scripts/CLIENT_LOGS_PARSING.md
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import os from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_CLIENT_LOG_PATHS,
  STUDIO_APPDATA_LOG_RELATIVE,
  analyzeClientLogs,
  formatAnalysisReport,
  listRunIds,
  parseLogText,
} from './lib/client-logs-parser.mjs';

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');

function printHelp() {
  console.log(`Usage: yarn logs:parse [options]

Parse device-board client console dump and summarize recording-gate smoke.

Options:
  --file <path>     Log file (repo-relative or absolute; default: newest of repo + %APPDATA%/Membrana/logs/*)
  --run-id <id>     Analyze specific 8-char runId (default: last run in file)
  --json            Machine-readable output
  --list-runs       Print runIds and exit
  -h, --help        This help

Examples:
  yarn logs:parse
  yarn logs:parse -- --file logs/apps/client/logs.txt --run-id 7e8a289c
  yarn logs:parse -- --json > /tmp/parse.json

See docs/device-board-scripts/CLIENT_LOGS_PARSING.md
`);
}

/**
 * @param {string[]} args
 */
function parseArgs(args) {
  /** @type {{ file?: string, runId?: string, json: boolean, listRuns: boolean }} */
  const options = { json: false, listRuns: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json') options.json = true;
    else if (arg === '--list-runs') options.listRuns = true;
    else if (arg === '--file') options.file = args[++i];
    else if (arg === '--run-id') options.runId = args[++i];
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }
  return options;
}

function appDataRoot() {
  return process.env.APPDATA ?? join(os.homedir(), 'AppData', 'Roaming');
}

function defaultLogCandidates() {
  /** @type {{ relative: string, absolute: string }[]} */
  const candidates = [];
  for (const relative of DEFAULT_CLIENT_LOG_PATHS) {
    candidates.push({ relative, absolute: join(repoRoot, relative) });
  }
  for (const relative of STUDIO_APPDATA_LOG_RELATIVE) {
    const absolute = join(appDataRoot(), relative);
    candidates.push({ relative: absolute, absolute });
  }
  return candidates;
}

/**
 * @param {string | undefined} fileArg
 */
function resolveLogFile(fileArg) {
  if (fileArg) {
    const absolute = isAbsolute(fileArg) ? resolve(fileArg) : join(repoRoot, fileArg);
    if (!existsSync(absolute)) {
      console.error(`Log file not found: ${fileArg}`);
      process.exit(1);
    }
    return { path: absolute, relative: fileArg };
  }

  /** @type {{ relative: string, absolute: string, mtimeMs: number }[]} */
  const existing = [];
  for (const { relative, absolute } of defaultLogCandidates()) {
    if (existsSync(absolute)) {
      existing.push({ relative, absolute, mtimeMs: statSync(absolute).mtimeMs });
    }
  }
  if (existing.length > 0) {
    existing.sort((a, b) => b.mtimeMs - a.mtimeMs);
    const picked = existing[0];
    return { path: picked.absolute, relative: picked.relative };
  }

  const hints = [
    ...DEFAULT_CLIENT_LOG_PATHS.map((p) => `  ${p}`),
    ...STUDIO_APPDATA_LOG_RELATIVE.map((p) => `  %APPDATA%/${p}`),
  ];
  console.error(`No log file found. Save trace to one of:\n${hints.join('\n')}`);
  process.exit(1);
}

const options = parseArgs(process.argv.slice(2));
const { path: logPath, relative: logRelative } = resolveLogFile(options.file);
const text = readFileSync(logPath, 'utf8');
const events = parseLogText(text);

if (options.listRuns) {
  const runIds = listRunIds(events);
  if (runIds.length === 0) {
    console.error('No runId found in log file.');
    process.exit(1);
  }
  console.log(runIds.join('\n'));
  process.exit(0);
}

const analysis = analyzeClientLogs(events, { runId: options.runId });

if (analysis.error) {
  console.error(`logs:parse error: ${analysis.error}`);
  process.exit(1);
}

if (options.json) {
  console.log(
    JSON.stringify(
      {
        file: logRelative,
        ...analysis,
      },
      null,
      2,
    ),
  );
} else {
  console.log(`file: ${logRelative}`);
  console.log(formatAnalysisReport(analysis));
}
