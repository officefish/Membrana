/**
 * Office pull for procedure channels (C1): overlay / effective with timeout → git fallback.
 *
 * ЗОНД ДОСТИЖИМОСТИ ПАНЕЛИ (10.09). Прежняя редакция возвращала ГОЛЫЙ `null` на четыре
 * разных случая — нет токена, нет fetch, панель промолчала транспортом, панель ответила
 * не-ok. Дальше `resolveEffective` молча брал умолчания, цепочка шла к моделям и четырежды
 * говорила «неизвестно», после чего объявляла себя исчерпанной. Ложным был не каждый из
 * четырёх ответов по отдельности, а сама посылка, что звенья пробовались: набор звеньев
 * не прочитан, решать было нечем.
 *
 * Поэтому причина больше не стирается. `pullOfficeOverlay` отдаёт исход, и «панель молчит»
 * (`panel_unreachable` из docs/network/outcomes.yml) отличимо от «панели не спрашивали»
 * (токена нет) и от «панель ответила пусто».
 */
import { classifyPanelOutcome } from '../network/lib/classify.mjs';
import { resolveOfficeToken } from './office-token.mjs';

/** Почему набор звеньев не приехал. Список закрыт. */
export const PANEL_PULL = Object.freeze({
  /** Панель отдала набор звеньев. */
  OK: 'ok',
  /** Панель не ответила вовсе — звенья не пробовались. Исход словаря. */
  UNREACHABLE: 'panel_unreachable',
  /** Токена нет: панель не спрашивали. Это НЕ отказ панели. */
  NO_TOKEN: 'no_token',
  /** Нет fetch в окружении — инструментальная причина, тоже не отказ панели. */
  NO_FETCH: 'no_fetch',
  /** Панель ответила, но набора звеньев в ответе нет. */
  EMPTY: 'empty',
});

/**
 * Прочитать набор звеньев с панели, НАЗВАВ причину, если не вышло.
 *
 * @param {{
 *   env?: NodeJS.ProcessEnv;
 *   fetchImpl?: typeof fetch;
 *   baseUrl?: string;
 *   token?: string;
 *   timeoutMs?: number;
 * }} [opts]
 * @returns {Promise<{
 *   status: string;
 *   procedures: Record<string, { chain: Array<{ provider: string; model: string }> }> | null;
 *   why: string;
 *   transportCause: string | null;
 *   httpStatus: number | null;
 *   baseUrl: string;
 * }>}
 */
export async function pullOfficeOverlay(opts = {}) {
  const env = opts.env ?? process.env;
  const base = (opts.baseUrl ?? env.OFFICE_BASE_URL ?? 'https://office.mmbrn.tech').replace(
    /\/$/,
    '',
  );
  const token = opts.token ?? resolveOfficeToken(env).token;
  if (!token) {
    return result(PANEL_PULL.NO_TOKEN, null, 'токена office нет в окружении — панель не спрашивали', base);
  }
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    return result(PANEL_PULL.NO_FETCH, null, 'в окружении нет fetch — обратиться к панели нечем', base);
  }
  const timeoutMs = opts.timeoutMs ?? 2_000;

  let res;
  try {
    res = await fetchImpl(`${base}/v1/llm-procedure/overlay/agent`, {
      headers: { 'x-membrana-token': token },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    // Молчание транспорта — и только оно — значит «звенья не пробовались».
    const verdict = classifyPanelOutcome({
      errorCode: error?.cause?.code ?? error?.code ?? null,
      errorText: error?.message ?? null,
    });
    return {
      ...result(PANEL_PULL.UNREACHABLE, null, verdict.why, base),
      transportCause: verdict.transportCause,
    };
  }

  if (!res.ok) {
    // Панель ОТВЕТИЛА: она жива, отказ разбирается своей причиной, а не «сетью».
    const verdict = classifyPanelOutcome({ httpStatus: res.status });
    return {
      ...result(
        PANEL_PULL.EMPTY,
        null,
        `панель ответила ${res.status} (${verdict.outcome}) — набора звеньев нет`,
        base,
      ),
      httpStatus: res.status,
    };
  }

  let body;
  try {
    body = await res.json();
  } catch {
    return {
      ...result(PANEL_PULL.EMPTY, null, 'панель ответила телом, которое не разбирается как JSON', base),
      httpStatus: res.status,
    };
  }
  const procedures = body?.procedures;
  if (!procedures || typeof procedures !== 'object') {
    return {
      ...result(PANEL_PULL.EMPTY, null, 'в ответе панели нет поля procedures', base),
      httpStatus: res.status,
    };
  }
  return {
    ...result(PANEL_PULL.OK, procedures, 'набор звеньев прочитан с панели', base),
    httpStatus: res.status,
  };
}

function result(status, procedures, why, baseUrl) {
  return { status, procedures, why, transportCause: null, httpStatus: null, baseUrl };
}

/**
 * Прежняя форма: только набор звеньев либо `null`. Оставлена для вызывающих, которым
 * причина не нужна; новый код зовёт `pullOfficeOverlay` и причину не теряет.
 *
 * @param {Parameters<typeof pullOfficeOverlay>[0]} [opts]
 * @returns {Promise<Record<string, { chain: Array<{ provider: string; model: string }> }> | null>}
 */
export async function fetchOfficeOverlay(opts = {}) {
  return (await pullOfficeOverlay(opts)).procedures;
}
