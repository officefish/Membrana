#!/usr/bin/env node
/**
 * Non-blocking evening hook: incremental RAG index after archive:daily-day.
 * Failures do not block yarn ritual:evening (no OPENAI_API_KEY → skip silently).
 */
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveDotEnvPath } from './_anthropic-env.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Load repo .env into process.env so the spawned `rag:index` inherits OPENAI_API_KEY.
// The rag CLI reads keys from the environment and does NOT load .env itself, so a key
// that only lives in .env (not exported in the shell) would otherwise be invisible.
if (typeof process.loadEnvFile === 'function') {
  try {
    const envPath = resolveDotEnvPath(repoRoot);
    if (envPath) process.loadEnvFile(envPath);
  } catch {
    // .env is optional — stay non-blocking (matches the evening-hook contract).
  }
}

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

// codebase-memory-mcp: incremental graph update (non-blocking, skips if binary absent)
const cmBin = resolve(repoRoot, 'tools/bin/codebase-memory-mcp.exe');
try {
  const { existsSync } = await import('node:fs');
  if (existsSync(cmBin)) {
    console.error('[codebase-memory] incremental graph update…');
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'index_repository',
        arguments: { repo_path: repoRoot, mode: 'fast' },
      },
    });
    const cm = spawnSync(cmBin, [], {
      cwd: repoRoot,
      input: payload,
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 120_000,
    });
    const out = cm.stdout?.toString() ?? '';
    if (out.includes('"status":"indexed"') || out.includes('"status":"up-to-date"')) {
      console.error('[codebase-memory] graph updated ✓');
    } else {
      console.error('[codebase-memory] graph update skipped or failed (non-blocking)');
    }
  }
} catch {
  // binary missing or platform incompatible — skip silently
}

process.exit(0);
