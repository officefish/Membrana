/**
 * Общая загрузка корневого `.env` без зависимостей (UTF-8 BOM, комментарии в конце строки).
 * POST к Anthropic через undici с отдельным dispatcher на запрос — после чтения тела агент
 * закрывается (иначе на Windows возможен assert libuv при выходе процесса).
 * Не логируйте значения переменных.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fetch as undiciFetch, ProxyAgent, Agent } from 'undici';

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

function proxyUrlFromEnv() {
  const noProxy = process.env.ANTHROPIC_NO_PROXY?.trim().toLowerCase();
  if (noProxy === '1' || noProxy === 'true' || noProxy === 'yes') return '';
  return (
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.ANTHROPIC_HTTPS_PROXY?.trim() ||
    ''
  );
}

/** Таймаут TCP/TLS/connect (undici по умолчанию ~10s — на Windows+прокси иногда мало). */
function connectTimeoutMs() {
  const raw = process.env.ANTHROPIC_CONNECT_TIMEOUT_MS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n > 0) return n;
  return 60_000;
}

/**
 * POST JSON: один dispatcher на вызов, закрыт после полного чтения ответа.
 * Прокси: HTTPS_PROXY / HTTP_PROXY / ANTHROPIC_HTTPS_PROXY (например http://127.0.0.1:12334).
 */
export async function anthropicPost(url, { headers, bodyJson }) {
  const proxy = proxyUrlFromEnv();
  const connectTimeout = connectTimeoutMs();
  const dispatcher = proxy
    ? new ProxyAgent({ uri: proxy, connectTimeout })
    : new Agent({ connectTimeout });
  try {
    const res = await undiciFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyJson),
      dispatcher,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } finally {
    try {
      await dispatcher.close();
    } catch {
      /* ignore */
    }
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

export function printAnthropicHttpError(status, bodyText) {
  console.error(`HTTP ${status}:`, bodyText);
  if (status === 403) {
    console.error('');
    console.error(
      "Подсказка по 403 «Request not allowed»: часто это регион/политика доступа или маршрут без VPN.",
    );
    console.error(
      '- Если VPN «только браузер», терминал может ходить напрямую. Включите TUN/системный VPN или задайте прокси клиента (Clash, v2rayN):',
    );
    console.error('    HTTPS_PROXY=http://127.0.0.1:7890   (порт замените на свой HTTP-порт)');
    console.error('  Можно добавить эту строку в корневой `.env` рядом с ANTHROPIC_API_KEY.');
    console.error(
      '- Проверьте в консоли Anthropic: ключ активен, биллинг, доступ к выбранной модели.',
    );
    console.error('');
  }
  let reqId = '';
  try {
    reqId = JSON.parse(bodyText)?.request_id;
  } catch {
    /* ignore */
  }
  if (reqId) console.error('request_id (для поддержки Anthropic):', reqId);
}
