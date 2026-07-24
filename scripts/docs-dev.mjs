#!/usr/bin/env node
/**
 * Start Mintlify dev server with a Node version guard (sharp native bindings break on Node 25+ / Windows).
 *
 * Usage:
 *   node scripts/docs-dev.mjs [--port 3333]
 *   node scripts/docs-dev.mjs --root apps/docs-harness --port 3334
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

function argValue(flag) {
  const withEq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (withEq) return withEq.slice(flag.length + 1);
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : null;
}

const rootRel = argValue('--root') ?? 'apps/docs';
const docsRoot = resolve(repoRoot, rootRel);
const require = createRequire(resolve(docsRoot, 'package.json'));

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor >= 25) {
  console.error(
    [
      'docs:dev — Mintlify requires Node 20–24 (LTS).',
      `Current: Node ${process.versions.node}.`,
      'sharp native module fails on Node 25+ (especially Windows).',
      '',
      'Fix:',
      '  fnm use 22   # or nvm use',
      '  yarn install',
      '  yarn docs:dev',
      '',
      'Repo pin: see .nvmrc (22).',
    ].join('\n'),
  );
  process.exit(1);
}

const port = argValue('--port') ?? '3333';
const mintlifyArgs = ['dev', '--port', port];

let mintlifyBin;
try {
  mintlifyBin = require.resolve('mintlify/bin/mint.js');
} catch {
  console.error(`docs:dev — mintlify not installed in ${rootRel}. Run: yarn install`);
  process.exit(1);
}

const child = spawn(process.execPath, [mintlifyBin, ...mintlifyArgs], {
  cwd: docsRoot,
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
