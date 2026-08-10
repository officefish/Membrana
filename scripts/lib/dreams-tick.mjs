/**
 * Тик синтеза сна (M5): пара тезисов → failover-кубик → append в DreamsLog.
 * Провайдеры снаружи через DreamSynthesisPort; род отказа — classifyOutcome
 * контейнера network (#1449), терминал — synthesisFailed.
 *
 * ПОЧЕМУ КЛАССИФИКАТОР ЧУЖОЙ. До 07.08 здесь стоял `classifyOutcome` из
 * `../llm-probe.mjs`, у которого ветка ошибки кончалась catch-all `return 'net'`.
 * Того catch-all больше нет нигде: 08.08 зонд перевели на этот же канонический
 * классификатор (`0a426ccc`, PR #1805), и сны оказались не исключением, а первым
 * потребителем. Прод девять дней писал `deepseek:net · grok:net ·
 * gemini:net`, диагноз читался как «у office-VDS нет исходящего маршрута к LLM»,
 * и под него была заведена L-задача построить туннель. Маршрут был жив: вещдок
 * 06.08 — 24 синтеза из 24 через perplexity. Тремя `net` оказались три разных
 * рода: ключа нет в окружении, модель снята (HTTP 404), у модели не осталось
 * эндпоинтов (HTTP 404). Ни один не сетевой.
 *
 * Контейнер network держит закрытый перечень и главный инвариант «ответил
 * статусом ⇒ транспорт работает». Второго словаря исходов не заводим.
 */
import { rollProvider, DREAM_PROVIDERS } from './dreams-select.mjs';
import { classifyOutcome, OUTCOME_IDS, TRANSPORT_OUTCOMES } from '../network/lib/classify.mjs';
import {
  DREAM_MASTER_AUTHOR,
  dreamMasterVersion,
  validateDreamEvent,
} from './dreams-log.mjs';

/**
 * Роды, при которых кубик крутит следующего провайдера.
 *
 * Перечислены поимённо, а не выведены как «всё кроме ok»: когда в перечне
 * контейнера появится новый род, зуб `FAILOVER_OUTCOMES = OUTCOME_IDS \ {ok}`
 * покраснеет и потребует решения вслух. Молчаливое «новое — тоже failover»
 * повторило бы ровно ту ошибку, которую этот шов чинит.
 */
export const FAILOVER_OUTCOMES = new Set([
  ...TRANSPORT_OUTCOMES,
  'geo_blocked',
  'auth_missing_key',
  'auth_invalid_key',
  'billing_exhausted',
  'rate_limited',
  'model_removed',
  'provider_5xx',
  'unknown_protocol',
]);

/** Коды транспорта, которые порт синтеза может отдать только внутри строки. */
const CODE_RE =
  /\b(ENOTFOUND|EAI_AGAIN|ECONNREFUSED|EHOSTUNREACH|ENETUNREACH|ECONNRESET|EPROTO|CERT_HAS_EXPIRED|DEPTH_ZERO_SELF_SIGNED_CERT|ERR_TLS_CERT_ALTNAME_INVALID|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT|ABORT_ERR)\b/u;

/**
 * Наблюдение для классификатора из ответа или исключения порта синтеза.
 *
 * Ключевое: порт бросает `Error('OpenRouter HTTP 404: {…}')` — статус ЕСТЬ, но
 * спрятан в строке. Без его извлечения classifyOutcome видит `status == null`,
 * а там живёт транспорт: ответ сервера снова стал бы сетевым отказом. Ровно эта
 * подмена и держала ложный диагноз.
 *
 * @param {{status?: number, bodyText?: string, error?: string}} result
 * @returns {{httpStatus: number|null, errorCode: string|null, errorText: string, body: string|null}}
 */
export function observationOf(result = {}) {
  const text = String(result.error ?? result.bodyText ?? '');
  const fromField = Number(result.status);
  const inText = text.match(/\b(?:HTTP|status)[\s:/]*([1-5]\d{2})\b/iu);
  const httpStatus = Number.isFinite(fromField) && fromField > 0
    ? fromField
    : inText
      ? Number(inText[1])
      : null;
  const code = text.match(CODE_RE);
  return {
    httpStatus,
    // Словесный таймаут приводим к коду: у контейнера транспорт опознаётся кодом.
    errorCode: code ? code[1] : /\btimed? ?out|aborted\b/iu.test(text) ? 'ETIMEDOUT' : null,
    errorText: text,
    body: result.bodyText ?? null,
  };
}

/**
 * Нужен ли failover на следующий провайдер по роду исхода.
 * @param {string} outcome род из закрытого перечня контейнера
 */
export function shouldFailover(outcome) {
  return FAILOVER_OUTCOMES.has(outcome);
}

/**
 * Род исхода одной попытки — единственная точка входа в классификатор.
 *
 * Заслон на случай, если перечень контейнера разойдётся с нашим: род вне списка
 * НЕ глохнет в `unknown_protocol` молча — имя нераспознанного рода уезжает в
 * `detail`, иначе расхождение словарей выглядело бы как честное незнание. Ровно
 * такое молчание и держало ложный диагноз девять дней (замечание Дынина, блок A).
 * Тик при этом не роняем: прод должен досчитать до конца и сказать правду, а не
 * упасть посреди ночи на ассерте.
 */
function outcomeOf(result) {
  const { outcome } = classifyOutcome(observationOf(result));
  if (OUTCOME_IDS.includes(outcome)) return { outcome, note: null };
  return { outcome: 'unknown_protocol', note: `род вне перечня контейнера: ${outcome}` };
}

/**
 * Собрать seed тика (воспроизводим): day + hour + pair.
 * @param {{day: string, hour: number, pair: [string, string]}} input
 */
export function tickSeed(input) {
  return `${input.day}|h${input.hour}|${input.pair[0]}+${input.pair[1]}`;
}

/**
 * Один тик. `synthesize(provider, ctx)` — порт; бросает или возвращает
 * `{ ok:false, status?, bodyText?, error? }` / `{ ok:true, text, score? }`.
 *
 * @param {{
 *   day: string,
 *   hour: number,
 *   pair: [string, string] | null,
 *   promptMd: string,
 *   synthesize: (provider: string, ctx: object) => Promise<object>,
 *   seed?: string,
 * }} input
 * @returns {Promise<object>} событие для DreamsLog.append (ещё не записано)
 */
export async function runDreamTick(input) {
  const version = dreamMasterVersion(input.promptMd);
  const hour = Number(input.hour);
  const day = input.day;

  if (input.pair == null) {
    return {
      day,
      hour,
      status: 'skipped',
      author: DREAM_MASTER_AUTHOR,
      version,
      reason: 'no-pair',
      attempts: [],
    };
  }

  const pair = input.pair;
  const seed = input.seed ?? tickSeed({ day, hour, pair });
  /** @type {object[]} */
  const attempts = [];

  for (let attempt = 0; attempt < DREAM_PROVIDERS.length; attempt += 1) {
    const provider = rollProvider(seed, attempt);
    if (provider == null) break;
    try {
      const result = await input.synthesize(provider, { day, hour, pair, seed, attempt, version });
      if (result?.ok === true && typeof result.text === 'string' && result.text.trim()) {
        attempts.push({ provider, attempt, outcome: 'ok' });
        const event = {
          day,
          hour,
          status: 'synthesized',
          author: DREAM_MASTER_AUTHOR,
          version,
          pair,
          provider,
          seed,
          attempts,
          score: typeof result.score === 'number' ? result.score : 0.5,
          text: result.text.trim(),
          phase: 'synthesize',
        };
        const v = validateDreamEvent(event);
        if (!v.ok) throw new Error(v.reason);
        return v.event;
      }
      const { outcome, note } = outcomeOf({
        status: result?.status,
        bodyText: result?.bodyText ?? result?.error ?? '',
        error: result?.error,
      });
      const detail = result?.error ?? result?.bodyText ?? null;
      attempts.push({ provider, attempt, outcome, detail: note ? `${note} · ${detail ?? ''}`.trim() : detail });
      if (!shouldFailover(outcome)) {
        break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const { outcome, note } = outcomeOf({ error: msg });
      attempts.push({ provider, attempt, outcome, detail: note ? `${note} · ${msg}` : msg });
      if (!shouldFailover(outcome)) break;
    }
  }

  return {
    day,
    hour,
    status: 'synthesisFailed',
    author: DREAM_MASTER_AUTHOR,
    version,
    pair,
    seed,
    attempts,
    phase: 'synthesize',
  };
}

/**
 * Записать тик в лог. Если слот уже есть — не ретраим (анти-залп).
 * @param {import('./dreams-log.mjs').DreamsLog} log
 * @param {Parameters<typeof runDreamTick>[0]} input
 */
export async function commitDreamTick(log, input) {
  if (log.hasSlot(input.day, Number(input.hour))) {
    return { ok: false, reason: 'slot-exists', skipped: true };
  }
  const event = await runDreamTick(input);
  return log.append(event);
}
