#!/usr/bin/env node
/**
 * U10 W4/W5 prod-smoke: tariff maxUserWorkspaces + media device-workspaces API.
 * Запуск: yarn cabinet:u10-workspace:smoke
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runU10WorkspaceSmoke } from './lib/u10-workspace-prod-smoke.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readEnv() {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return () => '';
  const envText = readFileSync(envPath, 'utf8');
  return (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
}

async function main() {
  const get = readEnv();
  const host = get('BACKGROUND_MEDIA_IPV4');
  const password = get('BACKGROUND_MEDIA_PASSWORD');
  if (!host || !password) {
    console.error('Set BACKGROUND_MEDIA_IPV4 and BACKGROUND_MEDIA_PASSWORD in .env');
    process.exit(1);
  }

  const result = await runU10WorkspaceSmoke({ host, password });
  process.exit(result.ok ? 0 : 1);
}

if (pathToFileURL(process.argv[1] ?? '').href === import.meta.url) {
  void main();
}
