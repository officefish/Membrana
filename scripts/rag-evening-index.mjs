#!/usr/bin/env node
/**
 * Non-blocking evening hook: incremental RAG index after archive:daily-day.
 * Failures do not block yarn ritual:evening (no OPENAI_API_KEY → skip silently).
 */
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage: node scripts/rag-evening-index.mjs

Runs \`yarn rag:index:incremental\` after archive:daily-day.
Always exits 0 so evening ritual continues on failure.`);
  process.exit(0);
}

console.error('[rag] incremental index (evening hook, non-blocking)…');

const result = spawnSync('yarn', ['rag:index:incremental'], {
  cwd: repoRoot,
  shell: true,
  stdio: 'inherit',
  env: process.env,
});

if (result.status !== 0) {
  console.error(
    '[rag] incremental index failed or skipped (continuing evening ritual — check OPENAI_API_KEY / index)',
  );
}

process.exit(0);
