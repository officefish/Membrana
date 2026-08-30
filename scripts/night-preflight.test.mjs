import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  chainKeyState,
  keyPresent,
  preflightVerdict,
  wiringVerdict,
  wiringWords,
} from './lib/night-preflight.mjs';

/** Каталог-двойник: форма та же, что у llm-provider-catalog.json (провайдер → apiKeyEnv). */
const CATALOG = {
  anthropic: { apiKeyEnv: 'ANTHROPIC_API_KEY' },
  xai: { apiKeyEnv: 'X_AI_API_KEY' },
  openrouter: { apiKeyEnv: 'OPENROUTER_API_KEY' },
};
const CHAIN = [{ provider: 'anthropic' }, { provider: 'xai' }, { provider: 'openrouter' }];
const FULL_ENV = { ANTHROPIC_API_KEY: 'a', X_AI_API_KEY: 'b', OPENROUTER_API_KEY: 'c' };

test('ключ считается заданным только непустым — пробел ключом не является', () => {
  assert.equal(keyPresent({ K: 'v' }, 'K'), true);
  assert.equal(keyPresent({ K: '   ' }, 'K'), false);
  assert.equal(keyPresent({ K: '' }, 'K'), false);
  assert.equal(keyPresent({}, 'K'), false);
});

test('ПОРЧА DoD: снят ключ канала → провода красные ДО работы', () => {
  // Ровно случай владельца: недельный план падал 17 раз с 14 мая на «секрет не задан».
  const env = {}; // ни одного ключа
  const v = wiringVerdict([{ procedureId: 'strategic-plan', chain: CHAIN }], CATALOG, env);
  assert.equal(v.ok, false, 'страж ОБЯЗАН краснеть, когда идти некуда');
  assert.equal(v.dead.length, 1);
  assert.equal(v.dead[0].procedureId, 'strategic-plan');
});

test('ПОРЧА DoD: снятие ОДНОГО ключа из трёх ночь НЕ роняет — цепочка запасных на то и есть', () => {
  const env = { ...FULL_ENV };
  delete env.ANTHROPIC_API_KEY;
  const v = wiringVerdict([{ procedureId: 'strategic-plan', chain: CHAIN }], CATALOG, env);
  assert.equal(v.ok, true, 'запретить ночь там, где она возможна, — ложный красный');
  assert.equal(v.degraded.length, 1, 'но укорочение цепочки обязано быть НАЗВАНО, а не проглочено');
  assert.deepEqual(v.degraded[0].missingEnv, ['anthropic:ANTHROPIC_API_KEY']);
});

test('целые провода — зелено и без находок', () => {
  const v = wiringVerdict([{ procedureId: 'strategic-plan', chain: CHAIN }], CATALOG, FULL_ENV);
  assert.equal(v.ok, true);
  assert.equal(v.degraded.length, 0);
});

test('пустая цепочка — «идти некуда», хотя ни один ключ формально не пропал', () => {
  const v = wiringVerdict([{ procedureId: 'dreams', chain: [] }], CATALOG, FULL_ENV);
  assert.equal(v.ok, false);
  assert.equal(v.dead[0].missingEnv.length, 0, 'причина другая — её нельзя выдать за пропажу ключа');
});

test('провайдер вне каталога — ОТДЕЛЬНАЯ поломка, не «ключ не задан»', () => {
  const v = wiringVerdict([{ procedureId: 'x', chain: [{ provider: 'выдуманный' }] }], CATALOG, FULL_ENV);
  assert.equal(v.ok, false);
  assert.deepEqual(v.dead[0].unknownProviders, ['выдуманный']);
  assert.deepEqual(v.dead[0].missingEnv, [], 'чинятся они по-разному, и путать их нельзя');
});

test('ЗНАЧЕНИЯ КЛЮЧЕЙ В СЛОВАХ ВЕРДИКТА НЕ ПОЯВЛЯЮТСЯ — только имена', () => {
  const env = { ANTHROPIC_API_KEY: 'sk-СЕКРЕТНОЕ-ЗНАЧЕНИЕ', X_AI_API_KEY: '', OPENROUTER_API_KEY: '' };
  const words = wiringWords(wiringVerdict([{ procedureId: 'p', chain: CHAIN }], CATALOG, env));
  assert.ok(!words.includes('sk-СЕКРЕТНОЕ-ЗНАЧЕНИЕ'), 'Р3 ADR-0023: секреты в журнал не пишутся');
  assert.ok(words.includes('X_AI_API_KEY'), 'имя переменной — то, что нужно оператору для починки');
});

test('несколько процедур канала: мёртвая одна — красна вся полоса', () => {
  const env = { ANTHROPIC_API_KEY: 'a' };
  const v = wiringVerdict(
    [
      { procedureId: 'strategic-plan', chain: [{ provider: 'anthropic' }] },
      { procedureId: 'dreams', chain: [{ provider: 'xai' }] },
    ],
    CATALOG,
    env,
  );
  assert.equal(v.ok, false);
  assert.deepEqual(v.dead.map((d) => d.procedureId), ['dreams']);
});

test('итог полосы: проба-находка НЕ красит, но и не молчит', () => {
  const r = preflightVerdict([
    { id: 'trunk', status: 'pass' },
    { id: 'network', status: 'finding' },
    { id: 'wiring', status: 'pass' },
  ]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.findings, ['network']);
});

test('итог полосы: провал обязательной пробы красит полосу и НАЗЫВАЕТ виновную', () => {
  const r = preflightVerdict([
    { id: 'trunk', status: 'pass' },
    { id: 'wiring', status: 'fail' },
  ]);
  assert.equal(r.ok, false);
  assert.deepEqual(r.failed, ['wiring']);
});

test('необязательная проба полосу не роняет — иначе ночь заложник мелочи', () => {
  const r = preflightVerdict([{ id: 'trunk', status: 'fail', required: false }]);
  assert.equal(r.ok, true);
});

test('одно годное звено из трёх — ночь идёт, укорочение названо', () => {
  const env = { OPENROUTER_API_KEY: 'c' };
  const s = chainKeyState(CHAIN, CATALOG, env);
  assert.equal(s.usable.length, 1);
  assert.equal(s.missing.length, 2);
});

// ── ЗУБЫ ФОРМЫ: двойник выше привязан к НАСТОЯЩЕМУ каталогу ──────────────────────────────────
//
// Зачем они появились. Первый живой прогон стража покраснел словами «нет в каталоге: anthropic,
// openrouter, deepseek, xai» — то есть обвинил каталог в отсутствии ровно тех, кто в нём есть.
// Причина: `loadProviderCatalog()` отдаёт ОБЁРТКУ `{providers, ritualEnum}`, а ядро ждёт карту.
//
// Сквозь двенадцать зубов выше это прошло зелёным, потому что все они кормились самодельным
// двойником: его форму я задал сам, и она совпадала с моим представлением, а не с файлом.
// Свидетельство бралось не там, где живёт риск. Зубы ниже закрывают именно этот зазор.

import { loadProviderCatalog } from './lib/llm-procedure-registry.mjs';
import { providersOf } from './lib/night-preflight.mjs';

test('ФОРМА: настоящий каталог разворачивается в карту «провайдер → apiKeyEnv»', () => {
  const providers = providersOf(loadProviderCatalog());
  const ids = Object.keys(providers);
  assert.ok(ids.includes('anthropic'), 'каталог обязан знать anthropic');
  for (const id of ids) {
    assert.equal(typeof providers[id].apiKeyEnv, 'string', `${id}: apiKeyEnv — то, по чему судит ядро`);
    assert.ok(providers[id].apiKeyEnv.length > 0, `${id}: пустое имя переменной судить не даёт`);
  }
});

test('ФОРМА: обёртка НЕ скармливается ядру — иначе все провайдеры «неизвестны»', () => {
  const raw = loadProviderCatalog();
  const chain = [{ provider: 'anthropic' }];
  const env = { ANTHROPIC_API_KEY: 'ключ' };
  // Обёрткой — ровно тот ложный красный, что был в живом прогоне.
  assert.equal(wiringVerdict([{ procedureId: 'p', chain }], raw, env).ok, false);
  // Развёрнутой картой — правда.
  assert.equal(wiringVerdict([{ procedureId: 'p', chain }], providersOf(raw), env).ok, true);
});

test('ФОРМА: двойник тестов не разошёлся с настоящим каталогом по именам переменных', () => {
  const providers = providersOf(loadProviderCatalog());
  for (const id of Object.keys(CATALOG)) {
    assert.ok(providers[id], `двойник знает «${id}», а каталог — нет: двойник устарел`);
    assert.equal(
      CATALOG[id].apiKeyEnv,
      providers[id].apiKeyEnv,
      `${id}: имя переменной в двойнике разошлось с каталогом — зубы будут проверять вымысел`,
    );
  }
});

test('голая карта тоже законный вход — каталог, прочитанный файлом напрямую', () => {
  assert.deepEqual(providersOf(CATALOG), CATALOG);
});

// ── ЗУБЫ ОТКАЗА НА НЕИЗВЕСТНЫЙ ФЛАГ ────────────────────────────────────────────────────────
// Появились после живого промаха: `--dry-run` проезжал и запускал все пробы, потому что при
// отсутствии `--only` исключался индекс 0. Инцидент 11.08 вечерней цепочки, повторённый мной.

import { unknownArgsOf } from './lib/night-preflight.mjs';

const KNOWN = new Set(['--json', '--only']);

test('ПОРЧА: неизвестный ПЕРВЫЙ аргумент замечается — тот самый промах с индексом 0', () => {
  assert.deepEqual(unknownArgsOf(['--dry-run'], KNOWN), ['--dry-run']);
});

test('значение --only не считается неизвестным аргументом', () => {
  assert.deepEqual(unknownArgsOf(['--only', 'wiring'], KNOWN), []);
});

test('неизвестный флаг ПОСЛЕ --only тоже замечается', () => {
  assert.deepEqual(unknownArgsOf(['--only', 'wiring', '--dry-run'], KNOWN), ['--dry-run']);
});

test('пустые аргументы — законный вход, не отказ', () => {
  assert.deepEqual(unknownArgsOf([], KNOWN), []);
});

test('известные флаги вместе — не отказ', () => {
  assert.deepEqual(unknownArgsOf(['--json', '--only', 'trunk'], KNOWN), []);
});
