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
 *   • классификация словом — исходы контейнера network (#1449, docs/network/outcomes.yml);
 *   • вывод — выровненная таблица, статус словом, без ANSI-цветов.
 *
 * СЛОВАРЬ ИСХОДОВ СМЕНЁН 08.08 (#1804). Здесь жил СВОЙ классификатор, и его ветка
 * ошибки кончалась catch-all `return 'net'`: любая незнакомая строка объявлялась
 * сетевой. Цена уже платилась — сны девять дней писали `deepseek:net · grok:net ·
 * gemini:net`, и диагностика двое суток искала несуществующий сетевой фильтр.
 * Теперь предикат ОДИН на репозиторий — `scripts/network/lib/classify.mjs` с
 * инвариантом «ответил статусом ⇒ транспорт работает» и честным `unknown_protocol`
 * вместо выдуманной сети. Старые слова (`net`, `tls-fail`, `blocked-html`, `auth/geo`)
 * наружу больше не выходят: отобразить новый исход обратно в `net` значило бы сохранить
 * ту же ложь под новым двигателем.
 *
 *   yarn llm:probe                 # все провайдеры: deepseek voyage anthropic openrouter
 *   yarn llm:probe voyage deepseek # выборочно
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { loadProviderCatalog } from './lib/llm-procedure-registry.mjs';
import { TRANSPORT_OUTCOMES, classifyOutcome as classifyCanonical } from './network/lib/classify.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const TIMEOUT_MS = 20_000;

/**
 * Тело пробы — знание ЗОНДА, не каталога (приговор архитектора 05.08: каталог есть
 * реестр каналов, а не тест-план; вторую копию знания не заводим — join по id).
 *
 * Каталог даёт `baseUrl · path · apiKeyEnv · apiFormat`; зонд даёт тело запроса и
 * форму заголовка. `outsideCatalog` объясняет, почему провайдер вне каталога —
 * без ярлыка симметричное сравнение множеств врало бы в обе стороны.
 *
 * ПОВОД (#1725-соседний): у зонда была СВОЯ копия списка, и в ней не было `xai` —
 * при том что `xai` стоит живым звеном в цепочках `ask` и `code-review`. 05.08 зонд
 * ответил «все зелёные», не проверив одно из звеньев, и агент доложил владельцу
 * живость каналов, которой не мерил. Неполная правда хуже молчания.
 */
/**
 * Причины, по которым проба живёт ВНЕ каталога. Замкнутый словарь, а не свободная
 * строка (finding ревью 05.08): ярлык строкой по месту через полгода даст второй
 * ярлык и дрейф. Новая причина заводится здесь, иначе исключение не признаётся.
 */
export const PROBE_OUTSIDE_REASONS = Object.freeze({
  EMBEDDINGS: 'embeddings — не чат-канал процедур, в каталоге ему места нет',
});

export const PROBE_SPECS = {
  deepseek: {
    body: (model = 'deepseek-chat') => ({ model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
    authHeader: (key) => ({ authorization: `Bearer ${key}` }),
  },
  anthropic: {
    body: (model = 'claude-haiku-4-5-20251001') => ({ model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
    authHeader: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
  },
  openrouter: {
    body: (model = 'anthropic/claude-haiku-4.5') => ({ model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
    authHeader: (key) => ({ authorization: `Bearer ${key}` }),
  },
  openai: {
    body: (model = 'gpt-4o-mini') => ({ model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
    authHeader: (key) => ({ authorization: `Bearer ${key}` }),
  },
  perplexity: {
    body: (model = 'sonar') => ({ model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
    authHeader: (key) => ({ authorization: `Bearer ${key}` }),
  },
  xai: {
    body: (model = 'grok-4.5') => ({ model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
    authHeader: (key) => ({ authorization: `Bearer ${key}` }),
  },
  voyage: {
    // Вне каталога ОСОЗНАННО, причина — из замкнутого словаря, не строкой по месту.
    outsideCatalog: PROBE_OUTSIDE_REASONS.EMBEDDINGS,
    keyEnv: ['VOYAGE_API_KEY', 'VOYAGEAI_API_KEY'],
    url: 'https://api.voyageai.com/v1/embeddings',
    body: () => ({ model: 'voyage-3.5-lite', input: ['ping'] }),
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
};

/**
 * Покрытие каталога зондом — ДВА НЕСИММЕТРИЧНЫХ множества (приговор архитектора):
 * канал каталога без пробы — находка (пробел покрытия); проба вне каталога — не
 * находка, а помеченная категория, и ярлык обязан объяснять причину.
 *
 * @param {Record<string, {defaultBaseUrl?: string, apiKeyEnv?: string}>} catalogProviders
 * @param {Record<string, {outsideCatalog?: string}>} probeSpecs
 * @returns {{ok: boolean, uncovered: string[], outsideCatalog: Array<{id: string, why: string}>, unlabeled: string[]}}
 */
export function auditProbeCoverage(catalogProviders, probeSpecs) {
  const catalogIds = Object.keys(catalogProviders ?? {});
  const probeIds = Object.keys(probeSpecs ?? {});
  const uncovered = catalogIds.filter((id) => !probeIds.includes(id)).sort();
  const outside = probeIds.filter((id) => !catalogIds.includes(id));
  const known = new Set(Object.values(PROBE_OUTSIDE_REASONS));
  const outsideCatalog = outside
    .filter((id) => known.has(probeSpecs[id]?.outsideCatalog))
    .map((id) => ({ id, why: String(probeSpecs[id].outsideCatalog) }))
    .sort((a, b) => a.id.localeCompare(b.id));
  // Проба вне каталога БЕЗ причины ИЗ СЛОВАРЯ — находка: молчаливое исключение
  // неотличимо от забытого канала, а самодельный ярлык — от молчания.
  const unlabeled = outside.filter((id) => !known.has(probeSpecs[id]?.outsideCatalog)).sort();
  return { ok: uncovered.length === 0 && unlabeled.length === 0, uncovered, outsideCatalog, unlabeled };
}

/**
 * Спецификации зондов = каталог ∘ тела проб. Одна копия знания на ось, join по id.
 * @param {{providers?: Record<string, any>}} catalog
 * @param {Record<string, any>} [probeSpecs]
 */
export function buildProviders(catalog, probeSpecs = PROBE_SPECS) {
  const out = {};
  for (const [id, spec] of Object.entries(probeSpecs)) {
    const entry = catalog?.providers?.[id];
    if (entry) {
      const base = String(entry.defaultBaseUrl ?? '').replace(/\/$/u, '');
      out[id] = {
        // Имя ключа — ТОЛЬКО из каталога: он источник истины (приговор архитектора).
        // Алиасы вроде XAI_API_KEY — миграционный долг инфры, зонду о них знать нечего.
        keyEnv: [entry.apiKeyEnv],
        url: `${base}${entry.path ?? ''}`,
        body: spec.body,
        authHeader: spec.authHeader,
      };
      continue;
    }
    // Вне каталога — своя пара url/keyEnv в самой пробе (и ярлык почему).
    if (spec.url && spec.keyEnv) out[id] = { keyEnv: spec.keyEnv, url: spec.url, body: spec.body, authHeader: spec.authHeader };
  }
  return out;
}

/** Спецификации зондов: лёгкий запрос каждому провайдеру (каталог ∘ тела проб). */
export const PROVIDERS = buildProviders(loadProviderCatalog());

// ─── чистые функции (экспортируются для тестов) ──────────────────────────────────

/** Маска ключа: первые 3 + последние 4 символа, середина скрыта. Значение не утекает. */
export function maskKey(key) {
  const k = String(key ?? '').trim();
  if (!k) return '(нет)';
  if (k.length <= 8) return '***';
  return `${k.slice(0, 3)}...${k.slice(-4)}`;
}

/**
 * Статусы, которыми API отвечает на ЗАВЕДОМО минимальное тело зонда. Это не суждение о
 * сети, а знание собственного запроса: мы намеренно шлём `max_tokens: 1` и куцый JSON,
 * поэтому «ругань на форму» означает «API жив». Общий классификатор такого знать не может
 * и не должен — он судит наблюдение, а контекст вызова принадлежит вызывающему.
 */
const PROBE_SHAPE_STATUSES = new Set([400, 411, 422]);

/**
 * Классификация исхода ОДНОГО запроса — тонкая обёртка над единственным предикатом
 * репозитория (`scripts/network/lib/classify.mjs`, #1449). Своего разбора здесь БОЛЬШЕ НЕТ:
 * вторая копия предиката и была причиной #1804.
 *
 * @param {{status?:number, bodyText?:string, error?:string, errorCode?:string, viaProxy?:boolean}} outcome
 * @returns {string} id исхода из закрытого перечня #1449
 */
export function classifyOutcome(outcome) {
  const status = outcome.status ?? null;
  if (status !== null && PROBE_SHAPE_STATUSES.has(status)) return 'ok';
  const { outcome: id } = classifyCanonical({
    httpStatus: status,
    errorCode: outcome.errorCode ?? null,
    // Текст ошибки транспорта и тело ответа — разные поля источника, но для распознавания
    // причины годится то, что есть: при ошибке тела нет, при ответе нет ошибки.
    errorText: outcome.error ?? outcome.bodyText ?? null,
    body: outcome.bodyText ?? null,
    viaProxy: outcome.viaProxy === true,
  });
  return id;
}

/**
 * Итоговый диагноз по паре (direct, viaProxy). Ловит паттерн DPI:
 * прямой путь мёртв/HTML, через прокси API отвечает по-настоящему.
 */
export function diagnosePair(direct, viaProxy) {
  // «Мёртв» = транспорт не состоялся. Список НЕ переписывается здесь руками: он берётся
  // у классификатора (TRANSPORT_OUTCOMES), иначе появится четвёртый словарь — та самая
  // болезнь, которую чинит #1804. `proxy_intercept` добавлен отдельно: статус пришёл, но
  // от посредника, и для DPI-паттерна это признак мёртвого прямого пути.
  const dead = new Set([...TRANSPORT_OUTCOMES, 'proxy_intercept']);
  // «Жив» = провайдер ответил ПО СУЩЕСТВУ, каким бы отказом это ни было: деньги, лимит,
  // ключ, гео. Ответ по существу доказывает, что канал до API работает.
  const alive = new Set(['ok', 'billing_exhausted', 'rate_limited', 'auth_invalid_key', 'geo_blocked', 'model_removed']);
  if (viaProxy !== null && dead.has(direct) && alive.has(viaProxy)) return 'proxy_intercept (только через прокси)';
  if (direct === 'ok') return 'ok (прямой путь)';
  if (viaProxy === 'ok') return 'ok (через прокси)';
  if (direct === 'billing_exhausted' || viaProxy === 'billing_exhausted') return 'billing_exhausted (пополнить счёт)';
  if (direct === 'rate_limited' || viaProxy === 'rate_limited') return 'rate_limited (лимиты тарифа)';
  if (direct === 'auth_missing_key') return 'auth_missing_key (нет ключа в .env)';
  if (direct === 'model_removed' || viaProxy === 'model_removed') return 'model_removed (модель снята — не сеть)';
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

export function loadEnv() {
  let fileEnv = {};
  try {
    fileEnv = parseDotEnv(readFileSync(path.join(REPO_ROOT, '.env'), 'utf8'));
  } catch {
    /* .env опционален — возьмём process.env */
  }
  return { ...fileEnv, ...process.env };
}

export async function probeOnce(spec, key, { dispatcher } = {}) {
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
    // Код ошибки отдаётся ОТДЕЛЬНЫМ полем (#1804). Раньше наружу шёл только текст, и
    // классификатору приходилось гадать по строке регулярками — отсюда и брался catch-all
    // «сеть». Классификатор #1449 судит по коду (`err.cause.code`), а текст читает лишь
    // как вспомогательный признак; без этого поля перевод дал бы `unknown_protocol` на
    // каждом отказе, то есть заменил бы одну ложь другой, менее заметной.
    return {
      error: e?.cause?.message ?? e?.message ?? String(e),
      errorCode: e?.cause?.code ?? e?.code ?? null,
    };
  }
}

export async function probeProvider(name, env) {
  const spec = PROVIDERS[name];
  const keyName = spec.keyEnv.find((k) => env[k]?.trim());
  const key = keyName ? env[keyName].trim() : null;
  if (!key) {
    // Ключа нет — запрос не отправлялся; исход именуется словарём #1449, а не своим
    // «no-key» в обход классификатора (одно из четырёх мест старого словаря, #1804).
    const direct = 'auth_missing_key';
    return { provider: name, key: '(нет)', direct, viaProxy: null, diagnosis: diagnosePair(direct, null) };
  }
  const proxyUrl = env.HTTPS_PROXY?.trim() || env.HTTP_PROXY?.trim() || null;

  const direct = classifyOutcome(await probeOnce(spec, key));
  let viaProxy = null;
  if (proxyUrl) {
    const { ProxyAgent } = await import('undici');
    // viaProxy: true — классификатор отличает «посредник не дошёл до цели» (5xx через
    // прокси) от собственной ошибки провайдера, и не зовёт гео-блоком отказ через прокси.
    viaProxy = classifyOutcome({ ...(await probeOnce(spec, key, { dispatcher: new ProxyAgent(proxyUrl) })), viaProxy: true });
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
