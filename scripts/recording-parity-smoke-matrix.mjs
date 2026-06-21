#!/usr/bin/env node
/**
 * CI subset for db-rec-parity-a4-smoke-matrix.
 * Windows: PowerShell wrapper (node-spawned vitest misses suites on Node 25).
 * client: workspace vitest with vite aliases.
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const deviceBoardTests = [
  'packages/device-board/src/graph/recording-parity-smoke-matrix.test.ts',
  'packages/device-board/src/graph/recording-policy-ui.test.ts',
].join(' ');

function runDeviceBoardMatrix() {
  const vitestCmd = `node node_modules/vitest/vitest.mjs run ${deviceBoardTests}`;
  if (process.platform === 'win32') {
    execSync(`powershell -NoProfile -Command "Set-Location '${root.replace(/'/g, "''")}'; ${vitestCmd}"`, {
      stdio: 'inherit',
    });
    return;
  }
  execSync(vitestCmd, { cwd: root, stdio: 'inherit' });
}

function runClientUploadTests() {
  const clientCmd =
    'yarn workspace @membrana/client vitest run src/modules/device-board/recording-upload-utils.test.ts';
  if (process.platform === 'win32') {
    execSync(`powershell -NoProfile -Command "Set-Location '${root.replace(/'/g, "''")}'; ${clientCmd}"`, {
      stdio: 'inherit',
    });
    return;
  }
  execSync(clientCmd, { cwd: root, stdio: 'inherit' });
}

try {
  runDeviceBoardMatrix();
  runClientUploadTests();
} catch {
  process.exit(1);
}

console.log('[recording-parity:smoke-matrix] all checks passed');
