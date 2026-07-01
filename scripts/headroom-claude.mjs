/**
 * Запуск Claude Code через headroom proxy (замер perf для #187).
 *
 * Схема:
 *   Claude Code → ANTHROPIC_BASE_URL=headroom:8787 → headroom → Hiddify → api.anthropic.com
 *
 * NO_PROXY=127.0.0.1 нужен Claude Code, чтобы он не пытался идти к headroom через Hiddify.
 *
 * Запуск: yarn headroom:claude
 * С аргументами: yarn headroom:claude -- --resume <id>
 * Кастомные порты: HEADROOM_PORT=8787 HIDDIFY_PORT=12334 yarn headroom:claude
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadDotEnv } from './_anthropic-env.mjs';
import { spawnClaude } from './lib/spawn-claude.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadDotEnv(repoRoot);

const headroomPort = process.env.HEADROOM_PORT ?? '8787';
const hiddifyPort = process.env.HIDDIFY_PORT ?? '12334';

const env = {
  ...process.env,
  ANTHROPIC_BASE_URL: `http://127.0.0.1:${headroomPort}`,
  // Claude Code → Hiddify для всего кроме localhost (например badge-fetching, tool calls)
  HTTPS_PROXY: `http://127.0.0.1:${hiddifyPort}`,
  HTTP_PROXY: `http://127.0.0.1:${hiddifyPort}`,
  // headroom слушает на localhost — не проксировать через Hiddify
  NO_PROXY: '127.0.0.1,localhost',
};

console.log(`Claude Code → headroom http://127.0.0.1:${headroomPort}`);
console.log('');

spawnClaude(process.argv.slice(2), env);
