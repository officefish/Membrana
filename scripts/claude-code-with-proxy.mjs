/**
 * Запуск `claude` (Claude Code CLI) с прокси из корневого `.env` или окружения —
 * те же переменные, что для `yarn anthropic:smoke`: HTTPS_PROXY, HTTP_PROXY,
 * ANTHROPIC_HTTPS_PROXY (см. `.env.example`).
 *
 * Claude Code ожидает HTTP CONNECT-прокси (URL вида http://127.0.0.1:ПОРТ), не SOCKS.
 * Если видите ERR_BAD_REQUEST, проверьте в Clash/v2rayN именно HTTP / Mixed-порт, не SOCKS.
 *
 * Запуск: yarn claude:code
 * С аргументами CLI: yarn claude:code -- --help
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadDotEnv } from './_anthropic-env.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadDotEnv(repoRoot);

const proxy =
  process.env.HTTPS_PROXY?.trim() ||
  process.env.HTTP_PROXY?.trim() ||
  process.env.ANTHROPIC_HTTPS_PROXY?.trim();

if (proxy) {
  process.env.HTTPS_PROXY = proxy;
  process.env.HTTP_PROXY = proxy;
} else {
  console.error(
    'Предупреждение: не заданы HTTPS_PROXY / HTTP_PROXY / ANTHROPIC_HTTPS_PROXY (ни в .env репозитория, ни в окружении).',
  );
  console.error('Claude Code подключится напрямую. Пример: HTTPS_PROXY=http://127.0.0.1:7890 в .env (см. .env.example).');
  console.error('');
}

const args = process.argv.slice(2);
const child = spawn('claude', args, {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
