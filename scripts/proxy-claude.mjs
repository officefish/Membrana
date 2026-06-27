import { spawn } from 'node:child_process';

// Порт Hiddify Mixed; можно переопределить: HIDDIFY_PORT=2334 yarn proxy:claude
const port = process.env.HIDDIFY_PORT ?? '12334';
const proxy = `http://127.0.0.1:${port}`;

const env = {
  ...process.env,
  HTTPS_PROXY: proxy,
  HTTP_PROXY: proxy,
};

// Прокидываем любые доп. аргументы: yarn proxy:claude --resume и т.п.
const args = process.argv.slice(2);

const child = spawn('claude', args, {
  env,
  stdio: 'inherit', // интерактивный TUI Claude Code работает как обычно
  shell: true, // нужно, чтобы Windows нашёл claude.cmd
});

child.on('exit', (code) => process.exit(code ?? 0));
