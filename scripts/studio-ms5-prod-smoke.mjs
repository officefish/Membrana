#!/usr/bin/env node
/**
 * MS5: Membrana Studio prod smoke — artifacts + cabinet health + MP7 WS.
 *
 *   yarn studio:ms5-smoke              — local checks + MP7 (needs .env VPS creds)
 *   yarn studio:ms5-smoke --no-mp7     — artifacts + cabinet health only
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { runStudioMs5ProdSmoke } from './lib/studio-ms5-prod-smoke.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function hasVpsCreds() {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return false;
  const envText = readFileSync(envPath, 'utf8');
  const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
  return Boolean(get('BACKGROUND_MEDIA_IPV4') && get('BACKGROUND_MEDIA_PASSWORD'));
}

async function main() {
  const noMp7 = process.argv.includes('--no-mp7');
  const runMp7 = !noMp7 && hasVpsCreds();

  if (!noMp7 && !runMp7) {
    console.warn('[ms5-smoke] .env VPS creds missing — skipping MP7 (use --no-mp7 to silence)');
  }

  const result = await runStudioMs5ProdSmoke({ root, runMp7 });
  process.exit(result.ok ? 0 : 1);
}

if (pathToFileURL(process.argv[1] ?? '').href === import.meta.url) {
  void main();
}
