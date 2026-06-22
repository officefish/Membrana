#!/usr/bin/env node
/**
 * Root CLI for RAG queries — delegates to @membrana/rag-service.
 * Requires: yarn workspace @membrana/rag-service build
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ragQueryCli = resolve(repoRoot, 'packages/services/rag/dist/cli/query.js');

const userArgs = process.argv.slice(2);

if (userArgs.includes('--help') || userArgs.includes('-h')) {
  const help = spawnSync(process.execPath, [ragQueryCli, '--help'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  process.exit(help.status ?? 0);
}

const build = spawnSync('yarn', ['workspace', '@membrana/rag-service', 'build'], {
  cwd: repoRoot,
  stdio: 'inherit',
  shell: true,
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const run = spawnSync(process.execPath, [ragQueryCli, ...userArgs], {
  cwd: repoRoot,
  stdio: 'inherit',
});

process.exit(run.status ?? 1);
