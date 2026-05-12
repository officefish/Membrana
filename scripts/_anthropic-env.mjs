/**
 * Общая загрузка корневого `.env` без зависимостей (UTF-8 BOM, комментарии в конце строки).
 * Не логируйте значения переменных.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadDotEnv(cwd = process.cwd()) {
  const envPath = resolve(cwd, '.env');
  if (!existsSync(envPath)) return;
  let raw = readFileSync(envPath, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

  for (const line of raw.split(/\r?\n/)) {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    } else {
      const hash = v.search(/\s+#/);
      if (hash !== -1) v = v.slice(0, hash).trim();
    }
    process.env[k] = v;
  }
}

export function getAnthropicKey() {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'Нет ANTHROPIC_API_KEY: задайте в .env или в окружении (см. .env.example).',
    );
  }
  return key;
}

export function defaultModel() {
  return process.env.ANTHROPIC_MODEL?.trim() || 'claude-haiku-4-5-20251001';
}
