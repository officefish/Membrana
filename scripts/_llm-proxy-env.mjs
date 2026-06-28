/**
 * Экспериментальный контур LLM proxy — отдельно от ритуалов Membrana.
 * Загружает `.env.llm-proxy` (не корневой `.env` с ANTHROPIC_API_KEY).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetch as undiciFetch, ProxyAgent, Agent } from 'undici';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string} [cwd]
 * @param {string} [envFileName]
 */
export function loadLlmProxyDotEnv(cwd = REPO_ROOT, envFileName = '.env.llm-proxy') {
  const envPath = resolve(cwd, envFileName);
  if (!existsSync(envPath)) return false;
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
  return true;
}

function proxyUrlFromEnv() {
  const noProxy = process.env.LLM_PROXY_NO_PROXY?.trim().toLowerCase();
  if (noProxy === '1' || noProxy === 'true' || noProxy === 'yes') return '';
  return (
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.LLM_PROXY_HTTPS_PROXY?.trim() ||
    ''
  );
}

function connectTimeoutMs() {
  const raw = process.env.LLM_PROXY_CONNECT_TIMEOUT_MS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n > 0) return n;
  return 60_000;
}

/**
 * @param {string} url
 * @param {{ headers: Record<string, string>; bodyJson: Record<string, unknown> }} opts
 */
export async function llmProxyPost(url, { headers, bodyJson }) {
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

/**
 * @param {import('./experimental/llm-proxy-parse.mjs').ResolvedLlmRequest} req
 */
export async function executeLlmRequest(req) {
  const { provider, transport, modelId, prompt, maxTokens, smoke } = req;
  const apiKey = process.env[provider.apiKeyEnv]?.trim();
  if (!apiKey) {
    throw new Error(
      `Нет ${provider.apiKeyEnv}: добавьте в .env.llm-proxy (см. .env.llm-proxy.example).`,
    );
  }

  const baseUrl = (
    process.env[transport.baseUrlEnv]?.trim() || transport.defaultBaseUrl
  ).replace(/\/$/, '');

  const userText = smoke
    ? 'Ответь одним коротким предложением на русском: подтверди, что запрос дошёл до API.'
    : prompt;

  const url = `${baseUrl}${transport.path}`;

  if (transport.apiFormat === 'anthropic') {
    const bodyJson = {
      model: modelId,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: [{ type: 'text', text: userText }] }],
    };
    const { ok, status, text } = await llmProxyPost(url, {
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      bodyJson,
    });
    return { ok, status, text, extract: extractAnthropicText };
  }

  if (transport.apiFormat === 'openai-responses') {
    const bodyJson = {
      model: modelId,
      input: userText,
      max_output_tokens: maxTokens,
    };
    const { ok, status, text } = await llmProxyPost(url, {
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      bodyJson,
    });
    return { ok, status, text, extract: extractOpenAiResponsesText };
  }

  const bodyJson = {
    model: modelId,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: userText }],
  };
  const headers = {
    'content-type': 'application/json',
    authorization: `Bearer ${apiKey}`,
  };
  if (provider.id === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/officefish/Membrana';
    headers['X-Title'] = 'Membrana llm-proxy experimental';
  }
  const { ok, status, text } = await llmProxyPost(url, { headers, bodyJson });
  return { ok, status, text, extract: extractOpenAiText };
}

/** @param {string} bodyText */
function extractAnthropicText(bodyText) {
  const json = JSON.parse(bodyText);
  const block = json?.content?.[0];
  if (block?.type === 'text') return block.text;
  return JSON.stringify(json?.content ?? json);
}

/** @param {string} bodyText */
function extractOpenAiText(bodyText) {
  const json = JSON.parse(bodyText);
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  return JSON.stringify(json?.choices ?? json);
}

/** @param {string} bodyText */
function extractOpenAiResponsesText(bodyText) {
  const json = JSON.parse(bodyText);
  const parts = json?.output;
  if (Array.isArray(parts)) {
    for (const item of parts) {
      if (item?.type === 'message' && Array.isArray(item.content)) {
        const text = item.content.find((c) => c?.type === 'output_text')?.text;
        if (typeof text === 'string') return text;
      }
    }
  }
  return JSON.stringify(json?.output ?? json);
}

/**
 * @param {number} status
 * @param {string} bodyText
 */
export function printLlmProxyHttpError(status, bodyText) {
  console.error(`HTTP ${status}:`, bodyText);
  if (status === 401 || status === 403) {
    console.error('');
    console.error('Подсказка: проверьте API key и base URL в .env.llm-proxy.');
    console.error('Claude на FreeModel → cc.freemodel.dev/v1/messages, не api.freemodel.dev.');
    console.error('Ритуалы Membrana (yarn anthropic:smoke) используют другой контур.');
    console.error('');
  }
}
