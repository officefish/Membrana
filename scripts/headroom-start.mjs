/**
 * Запуск headroom proxy с корректным HTTPS_PROXY для выхода в api.anthropic.com.
 *
 * Проблема: headroom — Python-процесс, не подхватывает системный прокси (Hiddify)
 * автоматически на Windows. Нужно явно передать HTTPS_PROXY в его окружение.
 *
 * Запуск: yarn headroom:start
 * Кастомные порты: HEADROOM_PORT=8787 HIDDIFY_PORT=12334 yarn headroom:start
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { loadDotEnv } from './_anthropic-env.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadDotEnv(repoRoot);

const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
if (!apiKey) {
  console.error('Ошибка: ANTHROPIC_API_KEY не задан (ни в .env, ни в окружении).');
  process.exit(1);
}

const hiddifyPort = process.env.HIDDIFY_PORT ?? '12334';
const headroomPort = process.env.HEADROOM_PORT ?? '8787';
const outboundProxy =
  process.env.HEADROOM_OUTBOUND_PROXY ?? `http://127.0.0.1:${hiddifyPort}`;

const logDir = join(homedir(), '.headroom', 'logs');
mkdirSync(logDir, { recursive: true });
const logFile = join(logDir, 'proxy.log');

const headroomBin = resolve(repoRoot, 'tools', 'headroom-venv', 'Scripts', 'headroom.exe');

const env = {
  ...process.env,
  ANTHROPIC_API_KEY: apiKey,
  // headroom нужен Hiddify чтобы выйти в api.anthropic.com (geo-restricted env)
  HTTPS_PROXY: outboundProxy,
  HTTP_PROXY: outboundProxy,
};

console.log(`headroom proxy → http://127.0.0.1:${headroomPort}`);
console.log(`outbound via   → ${outboundProxy}`);
console.log(`log            → ${logFile}`);
console.log('');
console.log('Проверка после старта: curl.exe --noproxy 127.0.0.1 http://127.0.0.1:8787/livez');
console.log('Claude Code через headroom: yarn headroom:claude');
console.log('');

const child = spawn(headroomBin, ['proxy', '--port', headroomPort, '--log-file', logFile], {
  env,
  stdio: 'inherit',
  shell: false,
});

child.on('error', (err) => {
  console.error('Не удалось запустить headroom:', err.message);
  console.error(`Путь: ${headroomBin}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
