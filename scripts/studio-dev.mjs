#!/usr/bin/env node
/**
 * Membrana Studio dev: Vite client + Electron shell (port-aware when 5173 is busy).
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const studioDir = resolve(root, 'apps/membrana-studio');
const electronRun = resolve(studioDir, 'scripts/electron-run.mjs');
const DEFAULT_STUDIO_DEV_URL = 'http://localhost:5173';
const DEFAULT_VITE_PORT = 5173;
const VITE_PORT_SCAN_MAX = 20;

function run(command, args, options = {}) {
  return spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    ...options,
  });
}

function stripAnsi(text) {
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

function parseViteDevUrl(text) {
  const plain = stripAnsi(text);
  const localMatch = plain.match(/Local:\s*(https?:\/\/localhost:\d+)/);
  if (localMatch !== null) {
    return localMatch[1];
  }
  const readyMatch = plain.match(/https?:\/\/localhost:\d+/);
  return readyMatch?.[0] ?? null;
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

async function probeViteDevUrl(startPort = DEFAULT_VITE_PORT, maxPorts = VITE_PORT_SCAN_MAX) {
  for (let port = startPort; port < startPort + maxPorts; port += 1) {
    const url = `http://localhost:${port}`;
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) {
        return url;
      }
    } catch {
      /* try next port */
    }
  }
  return null;
}

function waitForViteDevUrl(viteProcess, timeoutMs = 120_000) {
  return new Promise((resolvePromise, rejectPromise) => {
    let buffer = '';
    let settled = false;

    const finish = (url) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise(url);
    };

    const fail = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      rejectPromise(err);
    };

    const timer = setTimeout(() => {
      void (async () => {
        const probed = await probeViteDevUrl();
        if (probed !== null) {
          console.log(`[studio:dev] detected Vite at ${probed} (stdout parse timeout fallback)`);
          finish(probed);
          return;
        }
        fail(
          new Error(
            `Timed out waiting for Vite dev URL (expected ${DEFAULT_STUDIO_DEV_URL} or next free port)`,
          ),
        );
      })();
    }, timeoutMs);

    const onChunk = (chunk) => {
      buffer += chunk.toString();
      const url = parseViteDevUrl(buffer);
      if (url !== null) {
        finish(url);
      }
    };

    viteProcess.stdout?.on('data', onChunk);
    viteProcess.stderr?.on('data', onChunk);
    viteProcess.on('exit', (code) => {
      if (!settled) {
        fail(new Error(`Vite exited before dev URL was printed (code ${code ?? 'unknown'})`));
      }
    });
  });
}

const vite = run('yarn', ['workspace', '@membrana/client', 'dev'], {
  env: { ...process.env, STUDIO_DEV: '1', BROWSER: 'none' },
  stdio: ['inherit', 'pipe', 'pipe'],
});

vite.stdout?.on('data', (chunk) => {
  process.stdout.write(chunk);
});
vite.stderr?.on('data', (chunk) => {
  process.stderr.write(chunk);
});

vite.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

let studioDevUrl;
try {
  studioDevUrl = await waitForViteDevUrl(vite);
  if (studioDevUrl !== DEFAULT_STUDIO_DEV_URL) {
    console.log(`[studio:dev] Vite on ${studioDevUrl} (5173 busy — Electron will follow)`);
  }
  await waitForDevServer(studioDevUrl);
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

console.log(`[studio:dev] launching Electron → ${studioDevUrl}`);

const electron = spawn(process.execPath, [electronRun], {
  cwd: studioDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    MEMBRANA_STUDIO_DEV: '1',
    MEMBRANA_STUDIO_DEV_URL: studioDevUrl,
  },
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
