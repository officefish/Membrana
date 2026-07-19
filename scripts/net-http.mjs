#!/usr/bin/env node
/**
 * net:http — HTTP-проба произвольного URL через прокси (#595 п.2).
 *
 * Обобщает llm:probe на любой URL: жив ли прокси, пускает ли exit к хосту,
 * гео-403 это или WAF-заглушка. До этого инструмента каждую пробу писали
 * ad-hoc на undici (три раза за сессию 17.07); curl в Git Bash — mojibake.
 *
 * Usage:
 *   yarn net:http <url> [--proxy env|none|<url>] [--key ENV_NAME]
 *                 [--method GET|HEAD|POST] [--timeout-ms 15000] [--json]
 *
 * Классы: ok · geo-403 · waf-html · timeout · proxy-dead · http-<status> · net-error
 * Exit:   0    4         5          2         3            1 (остальное)
 *
 * Секреты: значение --key НЕ логируется; креды в URL прокси маскируются.
 */
import { fetch as undiciFetch, ProxyAgent, Agent } from 'undici';

import { loadDotEnv } from './_anthropic-env.mjs';

/** Маскировка кредов в URL прокси: http://user:pass@host → http://user:***@host */
export function maskProxy(url) {
  if (!url) return '(без прокси)';
  return url.replace(/^([a-z+]+:\/\/[^:/@]+):[^@]*@/i, '$1:***@');
}

/**
 * Чистая классификация исхода пробы.
 *
 * @param {{status?: number, bodyText?: string, error?: {code?: string, message?: string}}} r
 * @returns {{cls: string, exit: number, hint: string}}
 */
export function classifyHttpProbe(r) {
  if (r.error) {
    const raw = `${r.error.code ?? ''} ${r.error.message ?? ''}`;
    if (/UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT|TimeoutError|AbortError/i.test(raw)) {
      return { cls: 'timeout', exit: 2, hint: 'соединение не успело: хост фильтруется или прокси молчит — сравнить с --proxy none' };
    }
    if (/ECONNREFUSED|UND_ERR_SOCKET|EHOSTUNREACH|ENETUNREACH/i.test(raw)) {
      return { cls: 'proxy-dead', exit: 3, hint: 'сокет не открылся — прокси мёртв или порт закрыт; проверить сам прокси-хост' };
    }
    return { cls: 'net-error', exit: 1, hint: `сетевая ошибка: ${raw.trim().slice(0, 120)}` };
  }
  const status = r.status ?? 0;
  if (status >= 200 && status < 400) return { cls: 'ok', exit: 0, hint: 'маршрут живой' };
  if (status === 403) {
    // 403 сильнее HTML-тела: гео/политика доступа и с HTML-страницей остаётся гео-классом.
    return { cls: 'geo-403', exit: 4, hint: 'регион/политика доступа — сменить exit или маршрут (llm:probe знает провайдерские маркеры)' };
  }
  const looksHtml = /^\s*(<!doctype|<html)/i.test(r.bodyText ?? '');
  if (looksHtml) {
    return { cls: 'waf-html', exit: 5, hint: 'HTML вместо API-ответа — WAF/челлендж (Cloudflare и родня); браузерный маршрут или другой exit' };
  }
  return { cls: `http-${status}`, exit: 1, hint: 'ответ получен, но не 2xx/3xx — читать тело' };
}

function parseArgs(argv) {
  const o = { proxy: 'env', method: 'GET', timeoutMs: 15000, json: false, url: null, keyEnv: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--proxy') o.proxy = argv[(i += 1)];
    else if (a === '--key') o.keyEnv = argv[(i += 1)];
    else if (a === '--method') o.method = (argv[(i += 1)] ?? '').toUpperCase();
    else if (a === '--timeout-ms') o.timeoutMs = Number(argv[(i += 1)]);
    else if (a === '--json') o.json = true;
    else if (!a.startsWith('--') && !o.url) o.url = a;
    else return { error: `неизвестный аргумент: ${a}` };
  }
  if (!o.url || !/^https?:\/\//i.test(o.url)) return { error: 'нужен URL (http/https)' };
  if (!['GET', 'HEAD', 'POST'].includes(o.method)) return { error: `метод ${o.method} не поддержан (GET|HEAD|POST)` };
  if (!Number.isFinite(o.timeoutMs) || o.timeoutMs <= 0) return { error: '--timeout-ms должен быть положительным' };
  return { o };
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.error) {
    console.error(`[net:http] ${parsed.error}`);
    console.error('Usage: yarn net:http <url> [--proxy env|none|<url>] [--key ENV] [--method GET] [--timeout-ms 15000] [--json]');
    process.exitCode = 1;
    return;
  }
  const { o } = parsed;
  loadDotEnv();

  const proxyUrl =
    o.proxy === 'none' ? '' :
    o.proxy === 'env' ? (process.env.HTTPS_PROXY?.trim() || process.env.HTTP_PROXY?.trim() || '') :
    o.proxy;

  const headers = {};
  if (o.keyEnv) {
    const secret = process.env[o.keyEnv]?.trim();
    if (!secret) {
      console.error(`[net:http] в env нет ${o.keyEnv} (после слоёного .env) — ключ не приложен`);
      process.exitCode = 1;
      return;
    }
    headers.authorization = `Bearer ${secret}`;
  }

  const dispatcher = proxyUrl
    ? new ProxyAgent({ uri: proxyUrl, connectTimeout: o.timeoutMs })
    : new Agent({ connectTimeout: o.timeoutMs });

  const started = Date.now();
  /** @type {{status?: number, bodyText?: string, error?: {code?: string, message?: string}}} */
  let outcome;
  try {
    const res = await undiciFetch(o.url, {
      method: o.method,
      headers,
      dispatcher,
      signal: AbortSignal.timeout(o.timeoutMs),
    });
    outcome = { status: res.status, bodyText: await res.text().catch(() => '') };
  } catch (e) {
    outcome = { error: { code: e?.cause?.code ?? e?.code, message: String(e?.cause?.message ?? e?.message ?? e) } };
  } finally {
    try {
      await dispatcher.close();
    } catch {
      /* ignore */
    }
  }
  const ms = Date.now() - started;
  const { cls, exit, hint } = classifyHttpProbe(outcome);

  if (o.json) {
    console.log(JSON.stringify({
      url: o.url,
      method: o.method,
      proxy: maskProxy(proxyUrl),
      status: outcome.status ?? null,
      class: cls,
      ms,
      hint,
      bodySnippet: (outcome.bodyText ?? '').slice(0, 200),
      error: outcome.error ?? null,
    }, null, 2));
  } else {
    console.log(`[net:http] ${o.method} ${o.url}`);
    console.log(`  прокси: ${maskProxy(proxyUrl)}`);
    console.log(`  ${outcome.status ? `HTTP ${outcome.status}` : `ошибка: ${outcome.error?.code ?? outcome.error?.message ?? '?'}`} · класс: ${cls} · ${ms}ms`);
    console.log(`  ${hint}`);
    const snippet = (outcome.bodyText ?? '').replace(/\s+/g, ' ').slice(0, 200);
    if (snippet) console.log(`  тело: ${snippet}`);
  }
  process.exitCode = exit;
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/net-http.mjs')) {
  await main();
}
