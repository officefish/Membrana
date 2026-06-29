/**
 * Запуск **интерактивного TUI** OpenCode (отдельное приложение в терминале).
 * Это НЕ mjs-запрос как anthropic:task — для скриптов используйте yarn opencode:ask / opencode:task.
 *
 * yarn opencode:tui
 * yarn opencode:membrana   (alias)
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadLlmProxyDotEnv } from './_llm-proxy-env.mjs';
import { loadDotEnv } from './_anthropic-env.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = resolve(repoRoot, 'docs/experiments/opencode.membrana.example.json');

loadLlmProxyDotEnv(repoRoot);
// PERPLEXITY_API_KEY может жить в корневом .env (MCP phase B)
if (!process.env.PERPLEXITY_API_KEY?.trim()) {
  loadDotEnv(repoRoot);
}

if (!existsSync(configPath)) {
  console.error('Не найден конфиг OpenCode:', configPath);
  process.exit(1);
}

const freemodel = process.env.FREEMODEL_DEV_API_KEY?.trim();
const openrouter = process.env.OPENROUTER_API_KEY?.trim();
if (!freemodel && !openrouter) {
  console.error('Нужен хотя бы один ключ в .env.llm-proxy:');
  console.error('  FREEMODEL_DEV_API_KEY или OPENROUTER_API_KEY');
  process.exit(1);
}

const env = {
  ...process.env,
  OPENCODE_CONFIG: configPath,
  OPENCODE_CONFIG_DIR: resolve(repoRoot, '.opencode'),
  MEMBRANA_REPO_ROOT: repoRoot,
};

if (!env.OLLAMA_HOST?.trim()) {
  env.OLLAMA_HOST = 'http://127.0.0.1:11434';
}

const proxy =
  process.env.HTTPS_PROXY?.trim() ||
  process.env.HTTP_PROXY?.trim() ||
  process.env.LLM_PROXY_HTTPS_PROXY?.trim();
if (proxy) {
  env.HTTPS_PROXY = proxy;
  env.HTTP_PROXY = proxy;
}

const args = process.argv.slice(2);
console.error('[opencode:membrana] config:', configPath);
console.error('[opencode:membrana] agents:', resolve(repoRoot, '.opencode/agents'));
console.error('[opencode:membrana] providers:', [
  freemodel ? 'freemodel' : null,
  openrouter ? 'openrouter' : null,
  'ollama',
]
  .filter(Boolean)
  .join(', '));
if (!process.env.PERPLEXITY_API_KEY?.trim()) {
  console.error('[opencode:membrana] MCP perplexity: выключен (нет PERPLEXITY_API_KEY)');
}

const child = spawn('opencode', args, {
  stdio: 'inherit',
  env,
  shell: true,
  cwd: repoRoot,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
