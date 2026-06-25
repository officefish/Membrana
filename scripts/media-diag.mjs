#!/usr/bin/env node
/**
 * Media server diagnostics: health → quota → ensure-reserved → test WAV upload.
 *
 * Usage:
 *   yarn media:diag --register
 *   yarn media:diag --device-id <uuid> [--base-url URL] [--token TOKEN]
 *   yarn media:diag --json
 *
 * Env: MEDIA_API_URL, API_INTERNAL_TOKEN (packages/background-media/.env loaded if present)
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatDiagLines, runMediaDiag } from './lib/media-diag-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadDotenv() {
  const paths = [join(ROOT, 'packages', 'background-media', '.env'), join(ROOT, '.env')];
  for (const envPath of paths) {
    try {
      const raw = readFileSync(envPath, 'utf8');
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      // optional
    }
  }
}

function parseArgs(argv) {
  const opts = {
    baseUrl: null,
    deviceId: null,
    token: null,
    register: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--register') opts.register = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--base-url') opts.baseUrl = argv[++i] ?? null;
    else if (arg === '--device-id') opts.deviceId = argv[++i] ?? null;
    else if (arg === '--token') opts.token = argv[++i] ?? null;
    else if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: yarn media:diag [--register] [--device-id UUID] [--base-url URL] [--token TOKEN] [--json]',
      );
      process.exit(0);
    }
  }
  return opts;
}

async function main() {
  loadDotenv();
  const opts = parseArgs(process.argv.slice(2));
  const report = await runMediaDiag({
    baseUrl: opts.baseUrl ?? process.env.MEDIA_API_URL,
    deviceId: opts.deviceId,
    token: opts.token,
    register: opts.register,
  });

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    for (const line of formatDiagLines(report)) {
      console.log(line);
    }
    if (report.error) {
      console.log(`  error: ${report.error}`);
    }
  }

  process.exit(report.pass ? 0 : 1);
}

const entry = process.argv[1] ? fileURLToPath(import.meta.url) : '';
if (entry && process.argv[1].replace(/\\/g, '/').endsWith('media-diag.mjs')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
