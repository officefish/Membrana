import { spawnClaude } from './lib/spawn-claude.mjs';

// Порт Hiddify Mixed; можно переопределить: HIDDIFY_PORT=2334 yarn proxy:claude
const port = process.env.HIDDIFY_PORT ?? '12334';
const proxy = `http://127.0.0.1:${port}`;

const env = {
  ...process.env,
  HTTPS_PROXY: proxy,
  HTTP_PROXY: proxy,
};

// Прокидываем любые доп. аргументы: yarn proxy:claude --resume и т.п.
spawnClaude(process.argv.slice(2), env);
