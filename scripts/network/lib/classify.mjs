/**
 * Ядро классификации сетевого исхода (контейнер network, #1449; решение консилиума
 * network-container-form 29.07, Q3). Чистая функция: вход — наблюдение, выход — id из
 * закрытого перечня docs/network/outcomes.yml. Ни сети, ни fs, ни времени.
 *
 * ГЛАВНЫЙ ИНВАРИАНТ: если сервер ответил статусом — транспорт РАБОТАЕТ, и исход не
 * может быть транспортным. Ровно этого не хватало снам: HTTP 404 «модель снята»,
 * HTTP 402 «кончились кредиты» и отсутствующий ключ метились как `net`, диагностика
 * читала «30/30 net» и уходила искать несуществующий сетевой фильтр двое суток.
 */

/** Единственное транспортное множество. Всё остальное — не сеть. */
export const TRANSPORT_OUTCOMES = Object.freeze([
  'dns_fail',
  'tcp_fail',
  'tls_fail',
  'timeout_idle',
  'proxy_intercept',
  'provider_unreachable_http',
]);

/** Закрытый перечень исходов — зеркало outcomes.yml. Расхождение ловит зуб. */
export const OUTCOME_IDS = Object.freeze([
  'ok',
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

const DNS_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN']);
const TCP_CODES = new Set(['ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH', 'ECONNRESET']);
const TLS_CODES = new Set(['CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'ERR_TLS_CERT_ALTNAME_INVALID', 'EPROTO']);
const TIMEOUT_CODES = new Set(['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'ABORT_ERR']);

const has = (text, needles) => {
  const t = String(text ?? '').toLowerCase();
  return needles.some((n) => t.includes(n.toLowerCase()));
};

/** Тело похоже на HTML-страницу, а не на ответ API (заглушка посредника). */
export function looksLikeHtml(body) {
  const t = String(body ?? '').trimStart().slice(0, 200).toLowerCase();
  return t.startsWith('<!doctype html') || t.startsWith('<html') || t.includes('<title>');
}

/**
 * @param {object} o наблюдение одного вызова
 * @param {number|null} [o.httpStatus] статус ответа; null — ответа не было
 * @param {string|null} [o.errorCode]  код ошибки транспорта (err.cause.code)
 * @param {string|null} [o.errorText]  текст ошибки или тела
 * @param {string|null} [o.body]       тело ответа (для распознавания заглушки)
 * @param {boolean} [o.viaProxy]       вызов шёл через прокси
 * @returns {{outcome: string, isTransport: boolean, why: string}}
 */
export function classifyOutcome(o = {}) {
  const status = o.httpStatus ?? null;
  const code = o.errorCode ? String(o.errorCode).toUpperCase() : null;
  const text = o.errorText ?? '';
  const viaProxy = o.viaProxy === true;

  // 1. Ключа нет — вызова не было вовсе. Проверяем ДО статуса: запроса не случилось.
  if (has(text, ['api_key missing', 'key missing', 'missing api key'])) {
    return decide('auth_missing_key', 'ключ отсутствует в окружении — запрос не отправлялся');
  }

  // 2. Ответа нет: только здесь живёт транспорт.
  if (status == null) {
    if (code && DNS_CODES.has(code)) return decide('dns_fail', `DNS не отдал адрес (${code})`);
    if (code && TLS_CODES.has(code)) return decide('tls_fail', `рукопожатие TLS не состоялось (${code})`);
    if (code && TCP_CODES.has(code)) return decide('tcp_fail', `соединение не установилось (${code})`);
    if (code && TIMEOUT_CODES.has(code)) return decide('timeout_idle', `ответ не пришёл в срок (${code})`);
    return decide('unknown_protocol', code ? `нераспознанный код ${code}` : 'ни статуса, ни кода — честное незнание');
  }

  // 3. Статус есть ⇒ транспорт работает. Дальше транспортных исходов быть не может,
  //    кроме заглушки посредника и явного отчёта шлюза о недоступности цели.
  if (looksLikeHtml(o.body)) {
    return decide('proxy_intercept', 'вместо API пришла HTML-страница — на пути посредник');
  }

  if (status >= 200 && status < 300) return decide('ok', `ответ получен (${status})`);

  if (status === 403 && !viaProxy) {
    return decide('geo_blocked', 'провайдер отказал напрямую — соединение прошло, доступ закрыт');
  }
  if (status === 401) return decide('auth_invalid_key', 'ключ передан, но не принят');
  if (status === 402 || (status === 403 && has(text, ['insufficient', 'credits', 'quota', 'afford']))) {
    return decide('billing_exhausted', 'деньги или лимит ключа кончились');
  }
  if (status === 429) return decide('rate_limited', 'провайдер просит снизить темп');
  if (status === 404) {
    return has(text, ['deprecated', 'no endpoints found', 'not found', 'unknown model'])
      ? decide('model_removed', 'запрошенная модель снята или переименована')
      : decide('unknown_protocol', '404 без признака модели — честное незнание');
  }
  if (status >= 500) {
    return viaProxy
      ? decide('provider_unreachable_http', `посредник не дошёл до цели (${status})`)
      : decide('provider_5xx', `ошибка на стороне провайдера (${status})`);
  }
  if (status === 403) return decide('geo_blocked', 'отказ по доступу при живом соединении');

  return decide('unknown_protocol', `статус ${status} не разобран словарём`);
}

function decide(outcome, why) {
  return { outcome, isTransport: TRANSPORT_OUTCOMES.includes(outcome), why };
}

/** Сводный вердикт по набору наблюдений: что доминирует и сеть ли это вообще. */
export function summarize(results = []) {
  const counts = {};
  for (const r of results) counts[r.outcome] = (counts[r.outcome] ?? 0) + 1;
  const anyOk = results.some((r) => r.outcome === 'ok');
  const transport = results.filter((r) => r.isTransport).length;
  const dominant =
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown_protocol';
  return {
    counts,
    dominant,
    // Сеть виновата, только если НИ ОДИН вызов не дошёл и все отказы транспортные.
    networkAtFault: results.length > 0 && !anyOk && transport === results.length,
    verdict: anyOk
      ? 'сеть работает — отказы разбирать по их собственным причинам'
      : transport === results.length && results.length > 0
        ? 'похоже на сетевой отказ — все вызовы не дошли'
        : 'сеть работает — отказы не транспортные',
  };
}
