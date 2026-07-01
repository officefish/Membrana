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
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadDotEnv } from './_anthropic-env.mjs';

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

const args = process.argv.slice(2);

console.log(`Claude Code → headroom http://127.0.0.1:${headroomPort}`);
console.log('');

const child = spawn('claude', args, {
  env,
  stdio: 'inherit',
  shell: true, // необходим на Windows для разрешения claude.cmd через PATH
});

child.on('error', (err) => {
  console.error('Не удалось запустить claude:', err.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
