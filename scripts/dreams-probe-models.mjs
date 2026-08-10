#!/usr/bin/env node
/**
 * dreams-probe-models — живы ли модели, которыми сны ходят к провайдеру
 * (блок b3 спринта `dreams-models-liveness`, долг `#office-dreams-test-stubs-own-models`).
 *
 * ПОВОД. 07.08 два id реестра ответили с прода HTTP 404: `grok-4-fast` — «deprecated»,
 * `gemini-2.0-flash-001` — «No endpoints found». Нашёл это ПРОД, а не проверка. Реестр
 * поправили в тот же день, и единственным свидетельством живости новых id стала фраза в
 * комментарии: «сверена с https://openrouter.ai/api/v1/models в тот же день». Сверяли
 * руками — а ручная сверка не повторяется. Этот глагол делает её повторяемой.
 *
 * ЧТО ЭТО НЕ ЕСТЬ. Не юнит-тест: в юните сеть даёт флейк, и зуб, красный от чужого 502,
 * выключат через неделю. Не мердж-гейт: сеть на каждый PR — зелёный шум (вердикт резчика).
 * Дом — ночь.
 *
 * ТРИ ИСХОДА, А НЕ ДВА. `alive` — провайдер ответил и id на месте. `dead` — провайдер
 * ответил, а id нет: это факт, и он красный. `inconclusive` — сеть, 5xx, таймаут: мы НЕ
 * знаем. Смешать третий со вторым значило бы красить ночь по чужой аварии; смешать с
 * первым — молчаливо считать непроверенное проверенным. Коды 0/1/2 по прецеденту
 * `execution-gate`: «проверка сказала нет» и «проверки не было» — разные новости.
 *
 * ПРАВИЛО ТРОЕКРАТНОСТИ. Один `inconclusive` ночь красным не красит. Три подряд за 72
 * часа — красят: значит проверка не состоялась не случайно, а систематически, и молчание
 * стало нормой. Правило читает ЛЕНТУ, а не помнит: память процесса умирает вместе с ним,
 * а вопрос «сколько ночей подряд мы не знаем» переживает любой процесс.
 *
 * Использование:
 *   node scripts/dreams-probe-models.mjs                 # проверить и записать
 *   node scripts/dreams-probe-models.mjs --dry-run       # не писать в ленту
 *   node scripts/dreams-probe-models.mjs --json
 *
 * Exit: 0 — все живы · 1 — есть мёртвый id ЛИБО третий inconclusive подряд · 2 — проверка
 * не состоялась (сеть/5xx/таймаут), и это первый либо второй раз.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { loadDotEnv } from './_anthropic-env.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Каталог провайдера: единственный источник правды о том, что у него есть. */
export const MODELS_URL = 'https://openrouter.ai/api/v1/models';

/** Потолок ожидания. Ночь не должна висеть на мёртвом сокете до утра. */
export const TIMEOUT_MS = 15_000;

/** Лента исходов. Правило троекратности читает её, а не помнит. */
export const LEDGER_REL = 'docs/truth/dreams-liveness.jsonl';

/** Окно правила троекратности. */
export const STRIKE_WINDOW_HOURS = 72;
export const STRIKE_LIMIT = 3;

/** Закрытый перечень исходов прогона. */
export const VERDICTS = Object.freeze(['alive', 'dead', 'inconclusive']);

/**
 * Модели, которые вообще имеет смысл спрашивать у OpenRouter.
 *
 * Канал `deepseek` идёт напрямую и модели в маршруте не несёт — он пропускается ЯВНО и
 * попадает в `skipped` под своим именем. Молчаливый пропуск выглядел бы как «проверен»,
 * а это ровно тот класс лжи, против которого стоит весь спринт.
 *
 * @param {Record<string, {channel: string, model?: string}>} routes
 */
export function openrouterIdsOf(routes) {
  const asked = [];
  const skipped = [];
  for (const [provider, route] of Object.entries(routes ?? {})) {
    if (route?.channel !== 'openrouter') {
      skipped.push({ provider, why: `канал ${route?.channel ?? '—'} не спрашивает каталог моделей` });
      continue;
    }
    if (typeof route.model !== 'string' || route.model.trim() === '') {
      // Openrouter-канал БЕЗ модели — не «нечего проверять», а дефект реестра: прод уйдёт
      // в дефолт провайдера молча. Поэтому это находка, а не пропуск.
      asked.push({ provider, model: null });
      continue;
    }
    asked.push({ provider, model: route.model });
  }
  return { asked, skipped };
}

/**
 * Разложить спрошенное на живое и мёртвое по ответу каталога.
 * @param {Array<{provider: string, model: string|null}>} asked
 * @param {Set<string>|string[]} available id, которые каталог назвал своими
 */
export function classifyModels(asked, available) {
  const have = available instanceof Set ? available : new Set(available ?? []);
  const alive = [];
  const dead = [];
  for (const item of asked) {
    if (item.model == null) {
      dead.push({ ...item, why: 'в реестре нет model у openrouter-канала — прод уйдёт в дефолт провайдера' });
      continue;
    }
    if (have.has(item.model)) alive.push(item);
    else dead.push({ ...item, why: 'каталог провайдера этот id своим не назвал' });
  }
  return { alive, dead };
}

/** Вердикт прогона. Порядок ветвей важен: незнание не перекрывает известный факт. */
export function verdictOf({ reachable, dead }) {
  if (!reachable) return 'inconclusive';
  return dead.length > 0 ? 'dead' : 'alive';
}

/**
 * Сколько inconclusive подряд, считая текущий, укладывается в окно.
 * Лента приходит значением; время — параметром, часов внутри нет.
 *
 * @param {Array<{at: string, verdict: string}>} ledger записи, любой порядок
 * @param {string} nowIso момент текущего прогона
 */
export function consecutiveInconclusive(ledger, nowIso, windowHours = STRIKE_WINDOW_HOURS) {
  const now = Date.parse(nowIso);
  const edge = now - windowHours * 3600_000;
  const inWindow = (ledger ?? [])
    .filter((e) => Number.isFinite(Date.parse(e?.at)) && Date.parse(e.at) >= edge && Date.parse(e.at) <= now)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  let run = 0;
  for (const e of inWindow) {
    if (e.verdict !== 'inconclusive') break;
    run += 1;
  }
  return run;
}

/**
 * Код возврата. `inconclusive` краснеет ТОЛЬКО как третий подряд — и тогда это уже не
 * «не знаем сегодня», а «не знаем систематически».
 */
export function exitCodeOf(verdict, strikeRun) {
  if (verdict === 'dead') return 1;
  if (verdict === 'alive') return 0;
  return strikeRun >= STRIKE_LIMIT ? 1 : 2;
}

/** Строки отчёта. Пустого молчания нет ни в одной ветке. */
export function renderReport({ verdict, alive, dead, skipped, strikeRun, detail, via }) {
  const lines = [
    `dreams:probe-models — вердикт ${verdict} · живых ${alive.length} · мёртвых ${dead.length}` +
      (via ? ` · путь: ${via}` : ''),
  ];
  for (const a of alive) lines.push(`  alive: ${a.provider} → ${a.model}`);
  for (const d of dead) lines.push(`  DEAD:  ${d.provider} → ${d.model ?? '(model отсутствует)'} — ${d.why}`);
  for (const s of skipped) lines.push(`  skip:  ${s.provider} — ${s.why}`);
  if (verdict === 'inconclusive') {
    lines.push(`  проверка НЕ состоялась: ${detail ?? 'причина не названа'}`);
    lines.push(
      strikeRun >= STRIKE_LIMIT
        ? `  подряд без ответа: ${strikeRun} за ${STRIKE_WINDOW_HOURS} ч — это уже систематика, красный`
        : `  подряд без ответа: ${strikeRun} из ${STRIKE_LIMIT} за ${STRIKE_WINDOW_HOURS} ч — пока не красный`,
    );
  }
  return lines.join('\n');
}

/** Прочитать ленту. Файла нет → пусто, и это НЕ «всё живо». */
export function readLedger(path, io = { exists: existsSync, read: (p) => readFileSync(p, 'utf8') }) {
  if (!io.exists(path)) return [];
  const out = [];
  for (const line of io.read(path).split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    try {
      out.push(JSON.parse(s));
    } catch {
      // Битая строка не проглатывается: она попадает в ленту как факт порчи, но
      // разбор продолжается — иначе один кривой байт отключил бы правило целиком.
      out.push({ at: null, verdict: 'unparsed' });
    }
  }
  return out;
}

/**
 * Один заход в каталог. `dispatcher` — undici-агент прокси либо ничего.
 *
 * ПРОКСИ ОБЯЗАТЕЛЕН НЕ ДЛЯ КРАСОТЫ. Живой прогон 10.08 с рабочей машины: прямой путь к
 * openrouter отдал HTTP 403 — тот же geo-блок, что `llm-probe` показывает как
 * `geo_blocked` direct / `ok` через прокси. Без второй попытки глагол вечно отвечал бы
 * `inconclusive` с локальной машины: правило троекратности покраснело бы на третью ночь,
 * и красный означал бы «мы за границей», а не «модель мертва». Идиома взята у соседей
 * (`infra-probe.mjs:88-93`, `llm-probe.mjs:287-295`): 403 на прямом пути → повтор через
 * прокси, если он задан.
 */
async function fetchOnce(url, timeoutMs, dispatcher) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const init = { signal: ctl.signal, headers: { accept: 'application/json' } };
    const res = dispatcher
      ? await (await import('undici')).fetch(url, { ...init, dispatcher })
      : await fetch(url, init);
    if (!res.ok) return { reachable: false, detail: `HTTP ${res.status}`, status: res.status };
    const body = await res.json();
    const ids = Array.isArray(body?.data) ? body.data.map((m) => m?.id).filter(Boolean) : null;
    if (!ids) return { reachable: false, detail: 'в ответе нет массива data — каталог не разобран' };
    return { reachable: true, ids: new Set(ids), count: ids.length };
  } catch (e) {
    return { reachable: false, detail: e?.name === 'AbortError' ? `таймаут ${timeoutMs} мс` : String(e?.message ?? e) };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCatalog(url = MODELS_URL, timeoutMs = TIMEOUT_MS, env = process.env) {
  const direct = await fetchOnce(url, timeoutMs);
  if (direct.reachable) return { ...direct, via: 'direct' };

  const proxyUrl = env.HTTPS_PROXY?.trim() || env.HTTP_PROXY?.trim();
  if (!proxyUrl) return { ...direct, via: 'direct' };

  const { ProxyAgent } = await import('undici');
  const viaProxy = await fetchOnce(url, timeoutMs, new ProxyAgent(proxyUrl));
  if (viaProxy.reachable) return { ...viaProxy, via: 'proxy' };
  // Оба пути мертвы — причина называется по обоим, иначе диагноз «прокси не помог»
  // придётся добывать руками.
  return { reachable: false, via: 'both-failed', detail: `прямо: ${direct.detail} · через прокси: ${viaProxy.detail}` };
}

async function main() {
  // Прокси живёт в корневом `.env` и в окружении CI отсутствует — обе среды законны,
  // поэтому загрузка молчаливая, а её результат виден в строке `via:` отчёта.
  loadDotEnv();
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const asJson = argv.includes('--json');
  const nowIso = new Date().toISOString();

  const providers = await import(pathToFileURL(join(repoRoot, 'scripts/lib/dreams-providers.mjs')).href);
  const { asked, skipped } = openrouterIdsOf(providers.DREAM_PROVIDER_ROUTES);

  const catalog = await fetchCatalog();
  const { alive, dead } = catalog.reachable ? classifyModels(asked, catalog.ids) : { alive: [], dead: [] };
  const verdict = verdictOf({ reachable: catalog.reachable, dead });

  const ledgerPath = join(repoRoot, LEDGER_REL);
  const strikeRun =
    verdict === 'inconclusive' ? consecutiveInconclusive(readLedger(ledgerPath), nowIso) + 1 : 0;

  const report = renderReport({ verdict, alive, dead, skipped, strikeRun, detail: catalog.detail, via: catalog.via });
  if (asJson) {
    console.log(JSON.stringify({ at: nowIso, verdict, alive, dead, skipped, strikeRun, detail: catalog.detail ?? null }, null, 2));
  } else {
    console.log(report);
  }

  if (!dryRun) {
    mkdirSync(dirname(ledgerPath), { recursive: true });
    appendFileSync(
      ledgerPath,
      `${JSON.stringify({
        at: nowIso,
        verdict,
        alive: alive.map((a) => a.model),
        dead: dead.map((d) => ({ provider: d.provider, model: d.model, why: d.why })),
        catalogSize: catalog.count ?? null,
        detail: catalog.detail ?? null,
      })}\n`,
      'utf8',
    );
  }

  const code = exitCodeOf(verdict, strikeRun);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### dreams:probe-models\n\n\`\`\`\n${report}\n\`\`\`\n`, 'utf8');
  }
  process.exitCode = code;
}

if (process.argv[1]?.endsWith('dreams-probe-models.mjs')) await main();
