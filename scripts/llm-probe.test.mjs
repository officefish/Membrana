import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyOutcome,
  diagnosePair,
  maskKey,
  parseDotEnv,
  renderProbeTable,
  PROVIDERS,
} from './llm-probe.mjs';
import { OUTCOME_IDS, TRANSPORT_OUTCOMES } from './network/lib/classify.mjs';

test('maskKey: значение не утекает, короткие ключи полностью скрыты', () => {
  assert.equal(maskKey('sk-abcdefghijklmnop1234'), 'sk-...1234');
  assert.equal(maskKey('short'), '***');
  assert.equal(maskKey(''), '(нет)');
  assert.ok(!maskKey('sk-verysecretkey0000').includes('verysecret'));
});

// Зубы ниже ПЕРЕПИСАНЫ 08.08 (#1804) под словарь контейнера network (#1449). Прежние
// закрепляли собственный словарь зонда, где ветка ошибки кончалась catch-all `net`;
// менять их можно только явно — что здесь и сделано, вместе со сменой самого намерения.

test('classifyOutcome: живые классы 2026-07-13, названные словарём #1449', () => {
  // DeepSeek без баланса — 402
  assert.equal(classifyOutcome({ status: 402, bodyText: 'Insufficient Balance' }), 'billing_exhausted');
  // Voyage через DPI — 403 c HTML-страницей: статус пришёл, но от посредника
  assert.equal(classifyOutcome({ status: 403, bodyText: '<!doctype html><meta charset="utf-8">403' }), 'proxy_intercept');
  // OpenRouter 403 security policy — JSON, не HTML: соединение прошло, доступ закрыт
  assert.equal(classifyOutcome({ status: 403, bodyText: '{"error":"security policy"}' }), 'geo_blocked');
  // Voyage rate-limit без платёжного метода
  assert.equal(classifyOutcome({ status: 429, bodyText: 'add a payment method in the billing page' }), 'rate_limited');
  assert.equal(classifyOutcome({ status: 429, bodyText: 'slow down' }), 'rate_limited');
  assert.equal(classifyOutcome({ status: 200, bodyText: '{}' }), 'ok');
  assert.equal(classifyOutcome({ status: 500, bodyText: 'oops' }), 'provider_5xx');
});

test('форма зонда: 400/411/422 — «API жив», и это знание СВОЕГО запроса, а не сети', () => {
  // Зонд намеренно шлёт куцое тело (max_tokens: 1), поэтому ругань на форму доказывает
  // живой API. Общий классификатор такого знать не может — контекст вызова принадлежит
  // вызывающему, и потому эта ветка осталась здесь, а не уехала в #1449.
  assert.equal(classifyOutcome({ status: 400, bodyText: '{"detail":"not valid JSON"}' }), 'ok');
  assert.equal(classifyOutcome({ status: 411, bodyText: 'Length Required' }), 'ok');
  assert.equal(classifyOutcome({ status: 422, bodyText: 'Unprocessable' }), 'ok');
});

test('#1804: транспорт судится ПО КОДУ, а не по строке — три бывших «net»', () => {
  // Ровно те исходы, ради которых заведено иссью: раньше каждый из них становился `net`,
  // и диагностика уходила искать несуществующий сетевой фильтр.
  assert.equal(classifyOutcome({ errorCode: 'ENOTFOUND', error: 'getaddrinfo ENOTFOUND api.x.com' }), 'dns_fail');
  assert.equal(
    classifyOutcome({ errorCode: 'ECONNRESET', error: 'Client network socket disconnected before TLS' }),
    'tcp_fail',
  );
  assert.equal(
    classifyOutcome({ errorCode: 'ABORT_ERR', error: 'The operation was aborted due to timeout' }),
    'timeout_idle',
  );
});

test('#1804: незнакомая ошибка — «честное незнание», а НЕ выдуманная сеть', () => {
  // Сердце иссью: catch-all `return net` объявлял сетевым что угодно. Теперь неизвестное
  // называется неизвестным, и никто не идёт чинить сеть, которая работает.
  assert.equal(classifyOutcome({ error: 'что-то невиданное' }), 'unknown_protocol');
  assert.equal(classifyOutcome({}), 'unknown_protocol');
});

test('#1804: ответ статусом НИКОГДА не транспорт — ключ, модель, деньги', () => {
  // Инвариант #1449 в действии: три случая, которые сны девять дней метили как `net`.
  assert.equal(classifyOutcome({ error: 'api_key missing' }), 'auth_missing_key');
  assert.equal(classifyOutcome({ status: 404, bodyText: 'no endpoints found for model' }), 'model_removed');
  assert.equal(classifyOutcome({ status: 401, bodyText: '{"error":"invalid key"}' }), 'auth_invalid_key');
});

test('diagnosePair: перехват посредником — direct мёртв, via-proxy отвечает по существу', () => {
  assert.equal(diagnosePair('proxy_intercept', 'ok'), 'proxy_intercept (только через прокси)');
  assert.equal(diagnosePair('tls_fail', 'billing_exhausted'), 'proxy_intercept (только через прокси)');
  assert.equal(diagnosePair('ok', null), 'ok (прямой путь)');
  assert.equal(diagnosePair('billing_exhausted', 'billing_exhausted'), 'billing_exhausted (пополнить счёт)');
  assert.equal(diagnosePair('geo_blocked', null), 'geo_blocked');
  assert.equal(diagnosePair('auth_missing_key', null), 'auth_missing_key (нет ключа в .env)');
  assert.equal(diagnosePair('model_removed', null), 'model_removed (модель снята — не сеть)');
});

test('diagnosePair: список «мёртвых» берётся у классификатора, а не пишется тут заново', () => {
  // Четвёртый рукописный словарь был бы ровно той болезнью, которую чинит #1804.
  // Проверяем поведением: КАЖДЫЙ транспортный исход при живом прокси даёт перехват.
  for (const t of TRANSPORT_OUTCOMES) {
    assert.equal(diagnosePair(t, 'ok'), 'proxy_intercept (только через прокси)', `транспортный исход ${t}`);
  }
});

test('#1804: слов старого словаря в выводе больше нет', () => {
  const cases = [
    { status: 402, bodyText: 'Insufficient Balance' },
    { status: 403, bodyText: '<!doctype html>403' },
    { error: 'что угодно' },
    { errorCode: 'ENOTFOUND', error: 'getaddrinfo' },
  ];
  const old = new Set(['net', 'tls-fail', 'blocked-html', 'auth/geo', 'balance', 'rate-limit', 'no-key']);
  for (const c of cases) {
    const got = classifyOutcome(c);
    assert.ok(!old.has(got), `исход «${got}» — слово прежнего словаря, наружу выходить не должно`);
    assert.ok(OUTCOME_IDS.includes(got), `исход «${got}» вне закрытого перечня #1449`);
  }
});

test('renderProbeTable: выравнивание, статус словом, ключ замаскирован', () => {
  const rows = [
    { provider: 'deepseek', key: 'sk-...1234', direct: 'billing_exhausted', viaProxy: null, diagnosis: 'billing_exhausted (пополнить счёт)' },
    { provider: 'voyage', key: 'pa-...zzzz', direct: 'proxy_intercept', viaProxy: 'ok', diagnosis: 'proxy_intercept (только через прокси)' },
  ];
  const out = renderProbeTable(rows);
  const lines = out.split('\n');
  assert.equal(lines.length, 4); // header + разделитель + 2 строки
  assert.ok(lines[0].includes('provider') && lines[0].includes('diagnosis'));
  assert.ok(out.includes('(прокси не задан)'));
  assert.ok(out.includes('proxy_intercept'));
  assert.ok(!out.includes(String.fromCharCode(27)), 'без ANSI — статус словом');
  // выравнивание: у всех строк колонка-разделители на одинаковых позициях
  const pipeIdx = lines[0].indexOf('|');
  assert.ok(lines.slice(2).every((l) => l.indexOf('|') === pipeIdx));
});

test('parseDotEnv: имена/значения, кавычки снимаются, мусор игнорируется', () => {
  const env = parseDotEnv('A=1\n# comment\nB="two"\nbad line\nC=  spaced  ');
  assert.deepEqual(env, { A: '1', B: 'two', C: 'spaced' });
});

test('PROVIDERS: у всех минимальный запрос (max_tokens 1 / один input)', () => {
  for (const [name, spec] of Object.entries(PROVIDERS)) {
    const body = spec.body();
    if ('max_tokens' in body) assert.equal(body.max_tokens, 1, name);
    if ('input' in body) assert.equal(body.input.length, 1, name);
    assert.ok(spec.keyEnv.length >= 1, name);
  }
});

// ── Блок probe-covers-catalog (спринт instruments-honest-verdict) ──────────────
// Предмет: зонд не отвечает «все зелёные», не проверив звено. 05.08 у него была
// СВОЯ копия списка без xai — и «зелёный» доклад владельцу оказался неполной правдой.
import { auditProbeCoverage, buildProviders, PROBE_OUTSIDE_REASONS, PROBE_SPECS } from './llm-probe.mjs';
import { loadProviderCatalog } from './lib/llm-procedure-registry.mjs';

test('живой каталог покрыт зондом полностью; исключения помечены причиной', () => {
  const catalog = loadProviderCatalog();
  const res = auditProbeCoverage(catalog.providers, PROBE_SPECS);
  assert.deepEqual(res.uncovered, [], 'канал каталога без пробы — пробел покрытия');
  assert.deepEqual(res.unlabeled, [], 'проба вне каталога без объяснения неотличима от забытого канала');
  assert.ok(res.ok);
  assert.ok(res.outsideCatalog.some((x) => x.id === 'voyage' && /embeddings/u.test(x.why)), 'voyage помечен причиной');
});

test('канал каталога без пробы — НАХОДКА (именно это молчало 05.08 про xai)', () => {
  const res = auditProbeCoverage({ xai: { apiKeyEnv: 'X_AI_API_KEY' }, anthropic: {} }, { anthropic: {} });
  assert.equal(res.ok, false);
  assert.deepEqual(res.uncovered, ['xai']);
});

test('проба вне каталога: с ярлыком — категория, без ярлыка — находка (зуб не врёт в обе стороны)', () => {
  const labeled = auditProbeCoverage({}, { voyage: { outsideCatalog: PROBE_OUTSIDE_REASONS.EMBEDDINGS } });
  assert.equal(labeled.ok, true, 'помеченное исключение находкой не считается');
  assert.deepEqual(labeled.outsideCatalog, [{ id: 'voyage', why: PROBE_OUTSIDE_REASONS.EMBEDDINGS }]);

  const homemade = auditProbeCoverage({}, { rogue: { outsideCatalog: 'просто так' } });
  assert.equal(homemade.ok, false, 'самодельный ярлык вне словаря — находка, как и молчание');
  assert.deepEqual(homemade.unlabeled, ['rogue']);

  const silent = auditProbeCoverage({}, { mystery: {} });
  assert.equal(silent.ok, false, 'молчаливое исключение — находка');
  assert.deepEqual(silent.unlabeled, ['mystery']);
});

test('имя ключа берётся ТОЛЬКО из каталога — алиасы инфры зонду неизвестны', () => {
  const built = buildProviders(
    { providers: { xai: { defaultBaseUrl: 'https://api.x.ai/', path: '/v1/chat/completions', apiKeyEnv: 'X_AI_API_KEY' } } },
    { xai: { body: () => ({}), authHeader: () => ({}) } },
  );
  assert.deepEqual(built.xai.keyEnv, ['X_AI_API_KEY'], 'источник истины — каталог, не список алиасов');
  assert.equal(built.xai.url, 'https://api.x.ai/v1/chat/completions', 'хвостовой слэш базы не удваивается');
});

test('вне каталога проба живёт своей парой url/keyEnv, а не выпадает молча', () => {
  const built = buildProviders({ providers: {} }, PROBE_SPECS);
  assert.ok(built.voyage, 'voyage остаётся проверяемым');
  assert.equal(built.voyage.url, 'https://api.voyageai.com/v1/embeddings');
});
