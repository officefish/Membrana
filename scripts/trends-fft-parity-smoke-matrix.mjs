#!/usr/bin/env node
/**
 * CI subset for db-trends-parity-b3-smoke-lgtm.
 * Windows: PowerShell wrapper (node-spawned vitest misses suites on Node 25).
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const deviceBoardTests = [
  'packages/device-board/src/graph/trends-fft-parity-smoke-matrix.test.ts',
  'packages/device-board/src/graph/make-fft-trends-policy-node.test.ts',
  'packages/device-board/src/graph/make-fft-trends-analysis-node.test.ts',
  'packages/device-board/src/runtime/resolve-fft-trends-policy.test.ts',
].join(' ');

const clientTests = [
  'src/modules/device-board/makeTrendsFftScenarioReportPayload.test.ts',
  'src/modules/device-board/analyzeTrendsFromFftFrames.test.ts',
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

function runClientTrendsTests() {
  const clientCmd = `yarn workspace @membrana/client vitest run ${clientTests}`;
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
  runClientTrendsTests();
} catch {
  process.exit(1);
}

console.log('[trends-parity:smoke-matrix] all checks passed');
