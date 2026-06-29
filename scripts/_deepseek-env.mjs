/**
 * DeepSeek API (OpenAI-compatible chat). Ключ: DEEPSEEK_API_KEY в корневом `.env`.
 */
import { loadDotEnv } from './_anthropic-env.mjs';
import { fetch as undiciFetch, ProxyAgent, Agent } from 'undici';

export { loadDotEnv };

export function getDeepSeekKey() {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) {
    throw new Error('DEEPSEEK_API_KEY не задан (корневой .env)');
  }
  return key;
}

export function defaultDeepSeekModel() {
  return process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-chat';
}

function proxyUrlFromEnv() {
  return (
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.DEEPSEEK_HTTPS_PROXY?.trim() ||
    ''
  );
}

/**
 * @param {{ model: string; messages: Array<{ role: string; content: string }>; temperature?: number; max_tokens?: number }} body
 */
export async function deepseekChat(body) {
  const key = getDeepSeekKey();
  const baseUrl = (process.env.DEEPSEEK_BASE_URL?.trim() || 'https://api.deepseek.com').replace(/\/$/, '');
  const proxy = proxyUrlFromEnv();
  const dispatcher = proxy ? new ProxyAgent({ uri: proxy, connectTimeout: 60_000 }) : new Agent({ connectTimeout: 60_000 });
  try {
    const res = await undiciFetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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

/** @param {string} raw */
export function extractChatCompletionText(raw) {
  const parsed = JSON.parse(raw);
  const content = parsed?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('DeepSeek: неожиданный формат ответа');
  }
  return content;
}

/** @param {number} status @param {string} text */
export function printDeepSeekHttpError(status, text) {
  console.error(`DeepSeek HTTP ${status}`);
  try {
    const parsed = JSON.parse(text);
    console.error(parsed.error?.message ?? text.slice(0, 500));
  } catch {
    console.error(text.slice(0, 500));
  }
}
