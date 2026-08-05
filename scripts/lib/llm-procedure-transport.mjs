/**
 * Thin ritual transport (X1) — catalog-driven; no import from experimental/.
 * Phase A: classify + build request bodies; HTTP via injectable postFn.
 */
import { loadProviderCatalog } from './llm-procedure-registry.mjs';

/**
 * @typedef {{
 *   ok: boolean;
 *   status: number;
 *   text: string;
 *   tokensIn?: number | null;
 *   tokensOut?: number | null;
 *   errorClass?: string;
 *   latencyMs: number;
 * }} TransportResult
 */

/**
 * Внутренний словарь классов отказа (спринт instruments-honest-verdict, блок 2; #1549).
 *
 * ПОВОД. Прежний `auth` покрывал ДВА разных состояния — «ключа нет в окружении» и
 * «провайдер сказал 401/403» — и агент 05.08 прочитал второе как первое: записал в
 * HANDOFF «у звена нет ключа вовсе», тогда как ключ был на месте и валиден. Поймано
 * словом владельца.
 *
 * ГЛАВНОЕ (приговор математика 05.08): **одиночный 401/403 — не факт отказа, а
 * гипотеза с p<1**, и вещдок того же дня её опровергает: тот же неизменный ключ дал
 * 401/403 в 13:00 и 200 в 18:18 без всякого вмешательства. Различить «ключ отвергнут»
 * и «провайдер/посредник моргнул» ИЗНУТРИ ОДНОГО ОТВЕТА нельзя — потому одиночный
 * 401/403 при наличии ключа классифицируется как `transient`, а класс подозрения
 * `auth_denied_unstable` выносит только `confirmAuthDenial` по истории попыток.
 * Вводить «rejected» по одному ответу значило бы ту же ложную точность, за которую
 * этот спринт и взялся.
 *
 * @typedef {'no_key'|'auth_denied_unstable'|'transient'|'rate_limit'|'timeout'|'protocol'|'unknown'} TransportErrorClass
 */
export const TRANSPORT_ERROR_CLASSES = Object.freeze([
  'no_key',
  'auth_denied_unstable',
  'transient',
  'rate_limit',
  'timeout',
  'protocol',
  'unknown',
]);

/**
 * Отображение внутреннего класса в замороженный enum эмиссии
 * (`ERROR_CLASSES` в `llm-procedure-emit.mjs` — контракт эмиттера, чужая зона:
 * расширять его молча значит сломать инвариант «эмиттер отвергает вне-enum»).
 * Названный долг: расширение enum до v2 — отдельный ход со словом владельца,
 * после него адаптер снимается.
 *
 * @param {TransportErrorClass} internal
 * @returns {'auth'|'rate_limit'|'timeout'|'protocol'|'unknown'}
 */
export function toEmitClass(internal) {
  switch (internal) {
    case 'no_key':
    case 'auth_denied_unstable':
      return 'auth';
    case 'transient':
      return 'protocol';
    case 'rate_limit':
    case 'timeout':
    case 'protocol':
      return internal;
    default:
      return 'unknown';
  }
}

/**
 * Класс отказа по ОДНОМУ ответу. Факт выносится только там, где он наблюдаем:
 * отсутствие ключа видно до вызова (100%), остальное — по статусу и телу.
 *
 * @param {number} status
 * @param {string} [bodyText]
 * @param {{hasKey?: boolean}} [ctx] `hasKey:false` → ключа нет в окружении (наблюдаемо)
 * @returns {TransportErrorClass}
 */
export function classifyTransportError(status, bodyText = '', ctx = {}) {
  if (ctx.hasKey === false) return 'no_key';
  if (status === 429) return 'rate_limit';
  if (status === 408 || status === 504) return 'timeout';
  const lower = bodyText.toLowerCase();
  if (lower.includes('rate') && lower.includes('limit')) return 'rate_limit';
  if (lower.includes('credit') || lower.includes('usage limit') || lower.includes('quota')) {
    return 'rate_limit';
  }
  // 401/403 при наличии ключа — ПОДОЗРЕНИЕ, не приговор: см. шапку словаря.
  if (status === 401 || status === 403) return 'transient';
  // Сеть, таймаут-исключение (status 0) и 5xx — сторона провайдера, не наша.
  if (status === 0 || status >= 500) return 'transient';
  if (status >= 400 && status < 500) return 'protocol';
  return 'unknown';
}

/** Одна попытка звена для предиката подтверждения. */
/** @typedef {{status: number, at?: number, keyFingerprint?: string}} TransportAttempt */

/** Окно подтверждения отказа — ВРЕМЯ, не счётчик вызовов. Час. */
export const DEFAULT_DENIAL_WINDOW_MS = 60 * 60 * 1000;
/** Сколько отказов подряд делают подозрение подтверждённым. Порог вкуса, см. TODO. */
export const DEFAULT_MIN_DENIALS = 2;

/**
 * Подтверждение отказа авторизации по ИСТОРИИ, а не по одному ответу.
 *
 * Приговор математика: класс подозрения выносится, когда N≥2 отказов 401/403 за окно T
 * на ОДНОМ ключе И между ними не было успеха. Промежуточный 200 обнуляет подозрение —
 * ровно случай 05.08, где между двумя наблюдениями ключ ответил успехом.
 *
 * ПРЕДИКАТ НАЗВАН ЧИСЛАМИ, не «скорее всего» (finding-1 ревью): окно измеряется ВРЕМЕНЕМ,
 * умолчание `DEFAULT_DENIAL_WINDOW_MS` = 1 час; попытка — один вызов провайдера со своим
 * `at` (epoch ms). Попытка без `at` считается лежащей в окне: история без времени —
 * не повод молча выбрасывать наблюдение.
 *
 * TODO(редкие прогоны, вопрос ревью перерезки): окно 1ч при прогонах раз в сутки почти
 * никогда не соберёт двух отказов подряд — подтверждение растянется на двое суток.
 * Кандидат: второй порог ПО ЧИСЛУ ПОПЫТОК (последние K вызовов), не только по времени.
 *
 * TODO(асимметрия, finding-2 ревью): ложный плюс (объявили мёртвым живой ключ) дороже
 * ложного минуса (лишний повтор на мёртвом) — сегодняшний день это и оплатил. Порог
 * `DEFAULT_MIN_DENIALS = 2` пока ВКУС, а не расчёт; пересчитать по корпусу инцидентов
 * вместе с расширением enum эмиссии до v2.
 *
 * @param {TransportAttempt[]} attempts попытки в порядке времени
 * @param {{minDenials?: number, windowMs?: number, now?: number}} [opts]
 * @returns {{confirmed: boolean, denials: number, reason: string, windowMs: number, minDenials: number}}
 */
export function confirmAuthDenial(attempts, opts = {}) {
  const minDenials = opts.minDenials ?? DEFAULT_MIN_DENIALS;
  const windowMs = opts.windowMs ?? DEFAULT_DENIAL_WINDOW_MS;
  const now = opts.now ?? 0;
  const inWindow = (attempts ?? []).filter((a) => (a?.at == null ? true : now - a.at <= windowMs));
  let denials = 0;
  for (const a of inWindow) {
    if (a?.status === 401 || a?.status === 403) denials += 1;
    else if (a?.status >= 200 && a?.status < 300) denials = 0; // успех гасит подозрение
  }
  if (denials >= minDenials) {
    return { confirmed: true, denials, minDenials, windowMs, reason: `${denials} отказа 401/403 подряд без успеха в окне ${windowMs} мс` };
  }
  return {
    confirmed: false,
    denials,
    minDenials,
    windowMs,
    reason:
      denials === 0
        ? 'отказов авторизации в окне нет'
        : `отказов ${denials} из ${minDenials} — одиночный 401/403 фактом не считается (вещдок 05.08: тот же ключ ответил 200 через пять часов)`,
  };
}

/**
 * @param {string} providerId
 * @param {{ catalog?: ReturnType<typeof loadProviderCatalog> }} [opts]
 */
export function getProviderEntry(providerId, opts = {}) {
  const catalog = opts.catalog ?? loadProviderCatalog();
  const entry = catalog.providers?.[providerId];
  if (!entry) {
    throw new Error(`getProviderEntry: неизвестный provider «${providerId}»`);
  }
  return entry;
}

/**
 * Normalize chat turns for providers (anthropic blocks ↔ openai strings).
 * @param {Array<{ role: string; content: unknown }> | undefined} messages
 * @param {string} [prompt]
 * @param {'anthropic' | 'openai-compatible'} apiFormat
 */
export function normalizeMessages(messages, prompt, apiFormat) {
  /** @type {Array<{ role: string; content: unknown }>} */
  const turns =
    Array.isArray(messages) && messages.length > 0
      ? messages
      : [
          {
            role: 'user',
            content:
              apiFormat === 'anthropic'
                ? [{ type: 'text', text: prompt ?? '' }]
                : (prompt ?? ''),
          },
        ];

  if (apiFormat === 'anthropic') {
    return turns.map((m) => ({
      role: m.role,
      content:
        typeof m.content === 'string'
          ? [{ type: 'text', text: m.content }]
          : m.content,
    }));
  }

  return turns.map((m) => {
    let content = m.content;
    if (Array.isArray(content)) {
      content = content
        .filter((b) => b && typeof b === 'object' && b.type === 'text')
        .map((b) => b.text)
        .join('\n');
    } else if (typeof content !== 'string') {
      content = String(content ?? '');
    }
    return { role: m.role, content };
  });
}

/**
 * @param {{
 *   provider: string;
 *   model: string;
 *   prompt?: string;
 *   messages?: Array<{ role: string; content: unknown }>;
 *   maxTokens?: number;
 *   apiKey: string;
 *   catalog?: ReturnType<typeof loadProviderCatalog>;
 * }} args
 */
export function buildProviderRequest(args) {
  const entry = getProviderEntry(args.provider, { catalog: args.catalog });
  const maxTokens = args.maxTokens ?? 4096;
  const baseUrl = String(entry.defaultBaseUrl).replace(/\/$/, '');
  const url = `${baseUrl}${entry.path}`;
  const apiFormat = entry.apiFormat;

  if (apiFormat === 'anthropic') {
    return {
      url,
      headers: {
        'content-type': 'application/json',
        'x-api-key': args.apiKey,
        'anthropic-version': '2023-06-01',
      },
      bodyJson: {
        model: args.model,
        max_tokens: maxTokens,
        messages: normalizeMessages(args.messages, args.prompt, 'anthropic'),
      },
      apiFormat: 'anthropic',
      apiKeyEnv: entry.apiKeyEnv,
    };
  }

  if (apiFormat === 'openai-compatible') {
    /** @type {Record<string, string>} */
    const headers = {
      'content-type': 'application/json',
      authorization: `Bearer ${args.apiKey}`,
    };
    if (entry.extraHeaders && typeof entry.extraHeaders === 'object') {
      Object.assign(headers, entry.extraHeaders);
    }
    return {
      url,
      headers,
      bodyJson: {
        model: args.model,
        max_tokens: maxTokens,
        messages: normalizeMessages(args.messages, args.prompt, 'openai-compatible'),
      },
      apiFormat: 'openai-compatible',
      apiKeyEnv: entry.apiKeyEnv,
    };
  }

  throw new Error(`buildProviderRequest: apiFormat «${apiFormat}» не поддержан в v1`);
}

/**
 * Extract assistant text + optional usage from provider response body.
 * @param {string} apiFormat
 * @param {string} text
 * @returns {{ text: string; tokensIn: number | null; tokensOut: number | null }}
 */
export function parseProviderResponse(apiFormat, text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { text: '', tokensIn: null, tokensOut: null };
  }

  let outText = '';
  if (apiFormat === 'anthropic') {
    const blocks = Array.isArray(parsed?.content) ? parsed.content : [];
    outText = blocks
      .filter((b) => b?.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('');
  } else if (apiFormat === 'openai-compatible') {
    const choice = parsed?.choices?.[0];
    const content = choice?.message?.content;
    outText = typeof content === 'string' ? content : '';
  }

  const usage = parsed?.usage;
  const tokensIn =
    usage?.input_tokens ?? usage?.prompt_tokens ?? null;
  const tokensOut =
    usage?.output_tokens ?? usage?.completion_tokens ?? null;

  return {
    text: outText,
    tokensIn: typeof tokensIn === 'number' ? tokensIn : null,
    tokensOut: typeof tokensOut === 'number' ? tokensOut : null,
  };
}

/**
 * Stub-friendly call: inject `postFn` for tests; without it returns not-wired.
 *
 * @param {{
 *   provider: string;
 *   model: string;
 *   prompt?: string;
 *   messages?: Array<{ role: string; content: unknown }>;
 *   maxTokens?: number;
 *   apiKey?: string;
 *   env?: NodeJS.ProcessEnv;
 *   catalog?: ReturnType<typeof loadProviderCatalog>;
 *   postFn?: (url: string, opts: { headers: Record<string, string>; bodyJson: Record<string, unknown> }) => Promise<{ ok: boolean; status: number; text: string }>;
 *   now?: () => number;
 * }} args
 * @returns {Promise<TransportResult & { text?: string; apiFormat?: string; reason?: string }>}
 */
export async function callProvider(args) {
  const now = args.now ?? (() => Date.now());
  const t0 = now();
  const catalog = args.catalog ?? loadProviderCatalog();
  const entry = getProviderEntry(args.provider, { catalog });
  const env = args.env ?? process.env;
  const apiKey = (args.apiKey ?? env[entry.apiKeyEnv] ?? '').trim();

  if (!apiKey) {
    return {
      ok: false,
      status: 0,
      text: '',
      tokensIn: null,
      tokensOut: null,
      // Единственное состояние, наблюдаемое на 100%: ключа НЕТ в окружении. Прежде оно
      // называлось `auth` наравне с отказом провайдера — и агент 05.08 прочитал одно
      // как другое (#1549). Имя переменной названо в теле: искать было нечего.
      errorClass: classifyTransportError(0, '', { hasKey: false }),
      keyEnvName: entry.apiKeyEnv,
      reason: `ключа нет в окружении: переменная ${entry.apiKeyEnv} пуста`,
      latencyMs: Math.max(0, now() - t0),
    };
  }

  if (typeof args.postFn !== 'function') {
    return {
      ok: false,
      status: 0,
      text: '',
      tokensIn: null,
      tokensOut: null,
      errorClass: 'unknown',
      latencyMs: Math.max(0, now() - t0),
      // Without postFn this is a unit-test / dry stub (ritual wires createCatalogPostFn).
      reason: 'transport-stub-no-postFn',
    };
  }

  const req = buildProviderRequest({
    provider: args.provider,
    model: args.model,
    prompt: args.prompt,
    messages: args.messages,
    maxTokens: args.maxTokens,
    apiKey,
    catalog,
  });

  try {
    const { ok, status, text } = await args.postFn(req.url, {
      headers: req.headers,
      bodyJson: req.bodyJson,
    });
    const latencyMs = Math.max(0, now() - t0);
    if (!ok) {
      return {
        ok: false,
        status,
        text,
        tokensIn: null,
        tokensOut: null,
        errorClass: classifyTransportError(status, text, { hasKey: true }),
        latencyMs,
        apiFormat: req.apiFormat,
      };
    }
    const parsed = parseProviderResponse(req.apiFormat, text);
    return {
      ok: true,
      status,
      text: parsed.text,
      tokensIn: parsed.tokensIn,
      tokensOut: parsed.tokensOut,
      latencyMs,
      apiFormat: req.apiFormat,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = /timeout|aborted|ETIMEDOUT/i.test(msg);
    return {
      ok: false,
      status: 0,
      text: msg,
      tokensIn: null,
      tokensOut: null,
      errorClass: isTimeout ? 'timeout' : 'unknown',
      latencyMs: Math.max(0, now() - t0),
    };
  }
}
