#!/usr/bin/env node
/**
 * Ensure studio main/preload compiled, then launch Electron from apps/membrana-studio.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const studioDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildScript = resolve(studioDir, 'scripts/build.mjs');
const mainJs = resolve(studioDir, 'dist/main.js');
const preloadJs = resolve(studioDir, 'dist/preload.js');

function compileStudio() {
  const result = spawnSync(process.execPath, [buildScript], {
    cwd: studioDir,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureStudioBuilt() {
  if (existsSync(mainJs) && existsSync(preloadJs)) return;
  console.log('[membrana-studio] compiling main/preload → dist/ …');
  compileStudio();
  if (!existsSync(mainJs) || !existsSync(preloadJs)) {
    console.error(
      `[membrana-studio] build failed: expected\n  ${mainJs}\n  ${preloadJs}`,
    );
    process.exit(1);
  }
}

ensureStudioBuilt();

const require = createRequire(import.meta.url);
let electronBin;
try {
  electronBin = require('electron');
} catch (err) {
  console.error(
    '[membrana-studio] Electron binary missing. Run from repo root:\n' +
      '  node node_modules/electron/install.js\n' +
      'or: yarn install',
  );
  console.error(err);
  process.exit(1);
}

const child = spawn(electronBin, ['.'], {
  cwd: studioDir,
  stdio: 'inherit',
  env: process.env,
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error('[membrana-studio] failed to start Electron:', err);
  process.exit(1);
});
