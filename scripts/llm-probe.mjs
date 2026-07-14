#!/usr/bin/env node
/**
 * llm-probe — матрица доступности LLM-провайдеров: прямой путь и через прокси.
 *
 * Спринт agent-tooling-friction ti-4 (#433, консилиум 2026-07-13). Повод: живая
 * диагностика 2026-07-13 делалась пятью ручными зондами (DPI по TLS-отпечатку к
 * voyageai ≠ гео-блок ≠ 402 нет баланса ≠ нет ключа); хвосты #424/#425 требуют
 * перепроверки одной командой после действий владельца по биллингу.
 *
 * Гарантии (проголосованы консилиумом):
 *   • значения ключей НЕ печатаются (маска sk-...abcd), .env только читается;
 *   • минимальный запрос (max_tokens: 1 / лёгкий embeddings) — баланс не жжём;
 *   • классификация словом: ok | no-key | auth/geo (401/403) | balance (402/429quota)
 *     | dpi-block (TLS/HTML fail direct + ok via-proxy) | net | http-<code>;
 *   • вывод — выровненная таблица, статус словом, без ANSI-цветов.
 *
 *   yarn llm:probe                 # все провайдеры: deepseek voyage anthropic openrouter
 *   yarn llm:probe voyage deepseek # выборочно
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const TIMEOUT_MS = 20_000;

/** Спецификации зондов: лёгкий запрос каждому провайдеру. */
export const PROVIDERS = {
  deepseek: {
    keyEnv: ['DEEPSEEK_API_KEY'],
    url: 'https://api.deepseek.com/chat/completions',
    body: (model = 'deepseek-chat') => ({ model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
    authHeader: (key) => ({ authorization: `Bearer ${key}` }),
  },
  voyage: {
    keyEnv: ['VOYAGE_API_KEY', 'VOYAGEAI_API_KEY'],
    url: 'https://api.voyageai.com/v1/embeddings',
    body: () => ({ model: 'voyage-3.5-lite', input: ['ping'] }),
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  anthropic: {
    keyEnv: ['ANTHROPIC_API_KEY'],
    url: 'https://api.anthropic.com/v1/messages',
    body: (model = 'claude-haiku-4-5-20251001') => ({ model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
    authHeader: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
  },
  openrouter: {
    keyEnv: ['OPENROUTER_API_KEY'],
    url: 'https://openrouter.ai/api/v1/chat/completions',
    body: (model = 'anthropic/claude-haiku-4.5') => ({ model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
    authHeader: (key) => ({ authorization: `Bearer ${key}` }),
  },
};

// ─── чистые функции (экспортируются для тестов) ──────────────────────────────────

/** Маска ключа: первые 3 + последние 4 символа, середина скрыта. Значение не утекает. */
export function maskKey(key) {
  const k = String(key ?? '').trim();
  if (!k) return '(нет)';
  if (k.length <= 8) return '***';
  return `${k.slice(0, 3)}...${k.slice(-4)}`;
}

/**
 * Классификация исхода ОДНОГО запроса.
 * @param {{status?:number, bodyText?:string, error?:string}} outcome
 * @returns {string} слово-класс
 */
export function classifyOutcome(outcome) {
  if (outcome.error) {
    if (/ENOTFOUND|ECONNREFUSED|EAI_AGAIN/i.test(outcome.error)) return 'net';
    if (/timeout|aborted/i.test(outcome.error)) return 'timeout';
    if (/certificate|TLS|SSL|socket|ECONNRESET/i.test(outcome.error)) return 'tls-fail';
    return 'net';
  }
  const { status = 0, bodyText = '' } = outcome;
  const looksHtml = /^\s*<!doctype|^\s*<html/i.test(bodyText);
  if (status >= 200 && status < 300) return 'ok';
  if (status === 400 || status === 411 || status === 422) return 'ok'; // API жив, ругается на форму зонда
  if (status === 402) return 'balance';
  if (status === 429 && /quota|billing|balance|payment/i.test(bodyText)) return 'balance';
  if (status === 429) return 'rate-limit';
  if ((status === 403 || status === 401) && looksHtml) return 'blocked-html'; // WAF/DPI-страница
  if (status === 401 || status === 403) return 'auth/geo';
  return `http-${status}`;
}

/**
 * Итоговый диагноз по паре (direct, viaProxy). Ловит паттерн DPI:
 * прямой путь мёртв/HTML, через прокси API отвечает по-настоящему.
 */
export function diagnosePair(direct, viaProxy) {
  const dead = new Set(['tls-fail', 'blocked-html', 'net', 'timeout']);
  const alive = new Set(['ok', 'balance', 'rate-limit', 'auth/geo']);
  if (viaProxy !== null && dead.has(direct) && alive.has(viaProxy)) return 'dpi-block (только через прокси)';
  if (direct === 'ok') return 'ok (прямой путь)';
  if (viaProxy === 'ok') return 'ok (через прокси)';
  if (direct === 'balance' || viaProxy === 'balance') return 'balance (пополнить счёт)';
  if (direct === 'rate-limit' || viaProxy === 'rate-limit') return 'rate-limit (лимиты тарифа)';
  if (direct === 'no-key') return 'no-key (нет ключа в .env)';
  return direct;
}

/** Чистый рендер таблицы: моноширинное выравнивание, статус словом. */
export function renderProbeTable(rows) {
  const headers = ['provider', 'key', 'direct', 'via-proxy', 'diagnosis'];
  const table = [headers, ...rows.map((r) => [r.provider, r.key, r.direct, r.viaProxy ?? '(прокси не задан)', r.diagnosis])];
  const widths = headers.map((_, c) => Math.max(...table.map((row) => String(row[c]).length)));
  const line = (row) => row.map((cell, c) => String(cell).padEnd(widths[c])).join(' | ');
  return [line(table[0]), widths.map((w) => '-'.repeat(w)).join('-+-'), ...table.slice(1).map(line)].join('\n');
}

// ─── IO ──────────────────────────────────────────────────────────────────────────

/** Мини-парсер .env: только чтение имён/значений, без экспорта наружу. */
export function parseDotEnv(text) {
  const out = {};
  for (const raw of String(text ?? '').split('\n')) {
    const m = raw.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

function loadEnv() {
  let fileEnv = {};
  try {
    fileEnv = parseDotEnv(readFileSync(path.join(REPO_ROOT, '.env'), 'utf8'));
  } catch {
    /* .env опционален — возьмём process.env */
  }
  return { ...fileEnv, ...process.env };
}

async function probeOnce(spec, key, { dispatcher } = {}) {
  try {
    const init = {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...spec.authHeader(key) },
      body: JSON.stringify(spec.body()),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    };
    let res;
    if (dispatcher) {
      const { fetch: undiciFetch } = await import('undici');
      res = await undiciFetch(spec.url, { ...init, dispatcher });
    } else {
      res = await fetch(spec.url, init);
    }
    return { status: res.status, bodyText: (await res.text()).slice(0, 400) };
  } catch (e) {
    return { error: e?.cause?.message ?? e?.message ?? String(e) };
  }
}

async function probeProvider(name, env) {
  const spec = PROVIDERS[name];
  const keyName = spec.keyEnv.find((k) => env[k]?.trim());
  const key = keyName ? env[keyName].trim() : null;
  if (!key) {
    return { provider: name, key: '(нет)', direct: 'no-key', viaProxy: null, diagnosis: 'no-key (нет ключа в .env)' };
  }
  const proxyUrl = env.HTTPS_PROXY?.trim() || env.HTTP_PROXY?.trim() || null;

  const direct = classifyOutcome(await probeOnce(spec, key));
  let viaProxy = null;
  if (proxyUrl) {
    const { ProxyAgent } = await import('undici');
    viaProxy = classifyOutcome(await probeOnce(spec, key, { dispatcher: new ProxyAgent(proxyUrl) }));
  }
  return { provider: name, key: maskKey(key), direct, viaProxy, diagnosis: diagnosePair(direct, viaProxy) };
}

async function main() {
  const requested = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const names = requested.length ? requested : Object.keys(PROVIDERS);
  const unknown = names.filter((n) => !PROVIDERS[n]);
  if (unknown.length) {
    console.error(`[fail] неизвестные провайдеры: ${unknown.join(', ')}. Доступные: ${Object.keys(PROVIDERS).join(', ')}.`);
    process.exit(1);
  }
  const env = loadEnv();
  console.log(`llm-probe: ${names.join(', ')} (прокси: ${env.HTTPS_PROXY?.trim() || env.HTTP_PROXY?.trim() ? 'задан' : 'не задан'})`);
  const rows = [];
  for (const name of names) {
    rows.push(await probeProvider(name, env)); // последовательно — щадим лимиты
  }
  console.log(renderProbeTable(rows));
}

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
