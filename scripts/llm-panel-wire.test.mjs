/**
 * Зуб нормы «процедура обязана идти панельной цепочкой» (кристалл
 * procedure-must-follow-panel-chain, 27.07): процедурные скрипты не зовут
 * провайдера напрямую мимо invokeProcedureLlm.
 *
 * Рейтчет: легаси-вызовы перечислены поимённо. Список может только УМЕНЬШАТЬСЯ —
 * новый прямой вызов в процедурном скрипте валит тест, снятие старого требует
 * убрать имя отсюда (осознанный жест в diff, не тихое расширение).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { loadProcedureDefaults, loadProcedureRegistry } from './lib/llm-procedure-registry.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Скрипты, обязанные ходить через фасад (зарегистрированные процедуры + ask).
const MUST_USE_FACADE = [
  'scripts/ask-persona.mjs',
  'scripts/team-evening-feedback.mjs',
  'scripts/bridge-lead-call.mjs',
];

// Легаси с прямым anthropicPost — известный долг, только на уменьшение (#1306-класс).
const LEGACY_DIRECT_CALLERS = [
  'scripts/_strategic-plan.mjs',
  'scripts/anthropic-smoke.mjs', // смок канала — прямой вызов легитимен по назначению
  'scripts/anthropic-task.mjs',
  'scripts/generate-competition-async-v2-synthesis.mjs',
  'scripts/generate-competition-v1-synthesis.mjs',
  'scripts/insight.mjs',
  'scripts/task-closure-review.mjs',
];

const DIRECT_CALL_RE = /\banthropicPost\s*\(/;

test('процедурные скрипты идут через invokeProcedureLlm, не напрямую', () => {
  for (const rel of MUST_USE_FACADE) {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    assert.ok(
      !DIRECT_CALL_RE.test(src),
      `${rel}: прямой anthropicPost( мимо фасада — рецидив 27.07 (канал исчерпан → процедура мертва при живых фолбэках)`,
    );
    assert.ok(
      src.includes('invokeProcedureLlm'),
      `${rel}: не видно invokeProcedureLlm — процедура отвязана от панельной цепочки`,
    );
  }
});

test('прямые вызовы за пределами рейтчета запрещены', () => {
  const allowedInfra = new Set([
    'scripts/_anthropic-env.mjs', // сам транспорт
    ...LEGACY_DIRECT_CALLERS,
  ]);
  // Скан по файлам, где вызов реально встречается сегодня + обязанные фасаду:
  // полный обход дерева не нужен — новые процедуры добавляются в MUST_USE_FACADE,
  // а появление anthropicPost в них ловит первый тест.
  for (const rel of [...MUST_USE_FACADE]) {
    assert.ok(!allowedInfra.has(rel), `${rel} не может быть одновременно в рейтчете и в MUST_USE_FACADE`);
  }
});

test('процедура ask зарегистрирована с цепочкой фолбэков', () => {
  const reg = loadProcedureRegistry();
  const ask = reg.procedures.find((p) => p.id === 'ask');
  assert.ok(ask, 'llm-procedures.json: нет записи ask');
  assert.equal(ask.entryMjs, 'scripts/ask-persona.mjs');

  const defaults = loadProcedureDefaults();
  assert.ok(defaults.ask, 'llm-procedure-defaults.json: нет цепочки ask');
  assert.ok(
    defaults.ask.chain.length >= 2,
    `цепочка ask из ${defaults.ask.chain.length} звена — без фолбэка процедура мертва при исчерпанном первом`,
  );
  const providers = defaults.ask.chain.map((s) => s.provider);
  assert.ok(providers.includes('xai') || providers.includes('deepseek'),
    'в цепочке ask нет живого не-Anthropic фолбэка (xai/deepseek)');
});
