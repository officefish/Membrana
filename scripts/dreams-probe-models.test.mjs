import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyModels,
  consecutiveInconclusive,
  exitCodeOf,
  openrouterIdsOf,
  readLedger,
  renderReport,
  STRIKE_LIMIT,
  STRIKE_WINDOW_HOURS,
  VERDICTS,
  verdictOf,
} from './dreams-probe-models.mjs';

const ROUTES = {
  deepseek: { channel: 'deepseek' },
  perplexity: { channel: 'openrouter', model: 'perplexity/sonar' },
  grok: { channel: 'openrouter', model: 'x-ai/grok-4.3' },
  gemini: { channel: 'openrouter', model: 'google/gemini-3.5-flash' },
};

test('deepseek пропускается ЯВНО и под своим именем, а не молча', () => {
  const { asked, skipped } = openrouterIdsOf(ROUTES);
  assert.equal(asked.length, 3);
  assert.deepEqual(skipped.map((s) => s.provider), ['deepseek']);
  assert.match(skipped[0].why, /не спрашивает каталог/u);
});

test('openrouter-канал БЕЗ model — находка, а не пропуск', () => {
  const { asked } = openrouterIdsOf({ broken: { channel: 'openrouter' } });
  const { dead } = classifyModels(asked, ['что угодно']);
  assert.equal(dead.length, 1);
  assert.match(dead[0].why, /нет model/u, 'прод ушёл бы в дефолт провайдера молча');
});

test('id, которого каталог не назвал своим, — мёртвый', () => {
  // Ровно случай 07.08: grok-4-fast и gemini-2.0-flash-001 ответили HTTP 404.
  const { asked } = openrouterIdsOf({
    grok: { channel: 'openrouter', model: 'x-ai/grok-4-fast' },
    gemini: { channel: 'openrouter', model: 'google/gemini-2.0-flash-001' },
  });
  const { alive, dead } = classifyModels(asked, ['x-ai/grok-4.3', 'google/gemini-3.5-flash']);
  assert.equal(alive.length, 0);
  assert.deepEqual(dead.map((d) => d.provider).sort(), ['gemini', 'grok']);
});

test('живой каталог — все три id реестра на месте', () => {
  const { asked } = openrouterIdsOf(ROUTES);
  const { alive, dead } = classifyModels(asked, asked.map((a) => a.model));
  assert.equal(dead.length, 0);
  assert.equal(alive.length, 3);
});

test('вердикт: недоступный провайдер НЕ превращается ни в живое, ни в мёртвое', () => {
  assert.equal(verdictOf({ reachable: false, dead: [] }), 'inconclusive');
  assert.equal(verdictOf({ reachable: true, dead: [] }), 'alive');
  assert.equal(verdictOf({ reachable: true, dead: [{}] }), 'dead');
  for (const v of ['alive', 'dead', 'inconclusive']) assert.ok(VERDICTS.includes(v));
});

test('коды: мёртвый — 1, живой — 0, незнание — 2 (проверки не было ≠ проверка сказала нет)', () => {
  assert.equal(exitCodeOf('dead', 0), 1);
  assert.equal(exitCodeOf('alive', 0), 0);
  assert.equal(exitCodeOf('inconclusive', 1), 2);
  assert.equal(exitCodeOf('inconclusive', 2), 2);
});

test('третий inconclusive подряд краснеет — систематика, а не чужая авария', () => {
  assert.equal(exitCodeOf('inconclusive', STRIKE_LIMIT), 1);
  assert.equal(exitCodeOf('inconclusive', STRIKE_LIMIT + 1), 1);
});

test('счётчик подряд: прерывается любым НЕ-inconclusive', () => {
  const now = '2026-08-10T12:00:00.000Z';
  const h = (n) => new Date(Date.parse(now) - n * 3600_000).toISOString();
  const ledger = [
    { at: h(1), verdict: 'inconclusive' },
    { at: h(2), verdict: 'inconclusive' },
    { at: h(3), verdict: 'alive' },
    { at: h(4), verdict: 'inconclusive' },
  ];
  assert.equal(consecutiveInconclusive(ledger, now), 2, 'alive обрывает серию');
});

test('счётчик подряд: за окном 72 ч не считается', () => {
  const now = '2026-08-10T12:00:00.000Z';
  const old = new Date(Date.parse(now) - (STRIKE_WINDOW_HOURS + 1) * 3600_000).toISOString();
  assert.equal(consecutiveInconclusive([{ at: old, verdict: 'inconclusive' }], now), 0);
});

test('счётчик подряд: пустая лента — ноль, а НЕ «всё хорошо»', () => {
  assert.equal(consecutiveInconclusive([], '2026-08-10T12:00:00.000Z'), 0);
  assert.equal(consecutiveInconclusive(undefined, '2026-08-10T12:00:00.000Z'), 0);
});

test('лента: файла нет → пусто; битая строка не глотается молча', () => {
  assert.deepEqual(readLedger('/нет/такого', { exists: () => false, read: () => '' }), []);
  const parsed = readLedger('x', {
    exists: () => true,
    read: () => '{"at":"2026-08-10T00:00:00.000Z","verdict":"alive"}\nне json\n',
  });
  assert.equal(parsed.length, 2);
  assert.equal(parsed[1].verdict, 'unparsed', 'порча видна как запись, а не как отсутствие');
});

test('отчёт называет мёртвый поимённо и не молчит про пропущенных', () => {
  const report = renderReport({
    verdict: 'dead',
    alive: [{ provider: 'perplexity', model: 'perplexity/sonar' }],
    dead: [{ provider: 'grok', model: 'x-ai/grok-4-fast', why: 'каталог провайдера этот id своим не назвал' }],
    skipped: [{ provider: 'deepseek', why: 'канал deepseek не спрашивает каталог моделей' }],
    strikeRun: 0,
  });
  assert.match(report, /DEAD:\s+grok → x-ai\/grok-4-fast/u);
  assert.match(report, /skip:\s+deepseek/u);
  assert.match(report, /alive: perplexity/u);
});

test('отчёт при незнании говорит, что проверки НЕ БЫЛО, и на каком счёте серия', () => {
  const first = renderReport({ verdict: 'inconclusive', alive: [], dead: [], skipped: [], strikeRun: 1, detail: 'таймаут 15000 мс' });
  assert.match(first, /проверка НЕ состоялась: таймаут/u);
  assert.match(first, /пока не красный/u);

  const third = renderReport({ verdict: 'inconclusive', alive: [], dead: [], skipped: [], strikeRun: 3, detail: 'HTTP 502' });
  assert.match(third, /систематика, красный/u);
});

test('живой реестр раскладывается глаголом без правки', async () => {
  const providers = await import('./lib/dreams-providers.mjs');
  const { asked, skipped } = openrouterIdsOf(providers.DREAM_PROVIDER_ROUTES);
  assert.ok(asked.length >= 1, 'спрашивать нечего — значит реестр пуст или сломан');
  assert.ok(asked.every((a) => typeof a.model === 'string' && a.model.includes('/')), 'у каждого openrouter-канала есть model');
  assert.deepEqual(skipped.map((s) => s.provider), ['deepseek']);
});
