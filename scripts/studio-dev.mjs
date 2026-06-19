#!/usr/bin/env node
/**
 * Membrana Studio dev: Vite client (5173) + Electron shell.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const studioDir = resolve(root, 'apps/membrana-studio');
const electronRun = resolve(studioDir, 'scripts/electron-run.mjs');
const STUDIO_DEV_URL = 'http://localhost:5173';

function run(command, args, options = {}) {
  return spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    ...options,
  });
}

async function waitForDevServer(url, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Vite dev server not ready: ${url}`);
}

const vite = run('yarn', ['workspace', '@membrana/client', 'dev'], {
  env: { ...process.env, STUDIO_DEV: '1', BROWSER: 'none' },
});

vite.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

try {
  await waitForDevServer(STUDIO_DEV_URL);
} catch (err) {
  vite.kill();
  console.error(err);
  process.exit(1);
}

if (!existsSync(electronRun)) {
  vite.kill();
  console.error(`Missing studio launcher: ${electronRun}`);
  process.exit(1);
}

const require = createRequire(import.meta.url);
try {
  require.resolve('electron');
} catch {
  vite.kill();
  console.error(
    'Electron is not installed. From repo root run:\n' +
      '  node node_modules/electron/install.js\n' +
      'then retry: yarn studio:dev',
  );
  process.exit(1);
}

const electron = spawn(process.execPath, [electronRun], {
  cwd: studioDir,
  stdio: 'inherit',
  env: { ...process.env, MEMBRANA_STUDIO_DEV: '1' },
});

const shutdown = () => {
  electron.kill();
  vite.kill();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

electron.on('close', (code) => {
  vite.kill();
  process.exit(code ?? 0);
});

electron.on('error', (err) => {
  console.error('[studio:dev] Electron failed:', err);
  vite.kill();
  process.exit(1);
});
