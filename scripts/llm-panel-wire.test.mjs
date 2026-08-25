/**
 * Зуб нормы «процедура обязана идти панельной цепочкой» (кристалл
 * procedure-must-follow-panel-chain, 27.07; усилен #2147/№4, 25.08).
 *
 * Почему усилен: класс ПОВТОРИЛСЯ 24.08 (план недели бил в провайдера напрямую,
 * #2115), а прежний зуб его не видел по двум щербинам, обе закрыты здесь:
 *   1) regex ловил только `anthropicPost(` — сырой fetch на api.anthropic.com
 *      (drift-anchor-run) был невидим → теперь оба маркера (DIRECT_CALL_PATTERN);
 *   2) дерева скан не обходил («новые процедуры добавятся в список сами») —
 *      теперь ПОЛНЫЙ обход scripts/**.mjs; законное исключение — только в
 *      LLM_PANEL_WHITELIST с причиной (scripts/lib/llm-panel-wire.mjs).
 *
 * Рейтчет 25.08 сжался: _strategic-plan (#2115), drift-anchor-run и оба
 * генератора синтеза (#2147) пересажены на invokeProcedureLlm.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { loadProcedureDefaults, loadProcedureRegistry } from './lib/llm-procedure-registry.mjs';
import {
  DIRECT_CALL_PATTERN,
  LLM_PANEL_WHITELIST,
  scanDirectLlmCalls,
} from './lib/llm-panel-wire.mjs';
import { discoverSourceFiles } from './lib/tests-container.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Скрипты, обязанные ходить через фасад (зарегистрированные процедуры + ask).
const MUST_USE_FACADE = [
  'scripts/insight.mjs',
  'scripts/ask-persona.mjs',
  'scripts/team-evening-feedback.mjs',
  'scripts/bridge-lead-call.mjs',
  // пересажены 24–25.08 (#2115, #2147/№4):
  'scripts/_strategic-plan.mjs',
  'scripts/drift-anchor-run.mjs',
  'scripts/generate-competition-v1-synthesis.mjs',
  'scripts/generate-competition-async-v2-synthesis.mjs',
];

test('процедурные скрипты идут через invokeProcedureLlm, не напрямую', () => {
  for (const rel of MUST_USE_FACADE) {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    assert.ok(
      !DIRECT_CALL_PATTERN.test(src),
      `${rel}: прямой вызов провайдера мимо фасада — рецидив 27.07/24.08 (канал исчерпан → процедура мертва при живых фолбэках)`,
    );
    assert.ok(
      src.includes('invokeProcedureLlm'),
      `${rel}: не видно invokeProcedureLlm — процедура отвязана от панельной цепочки`,
    );
  }
});

test('#2147/4 полный скан scripts/: прямых LLM-вызовов вне белого списка нет', () => {
  const files = discoverSourceFiles(ROOT, ['scripts'])
    .filter((p) => p.endsWith('.mjs'))
    .map((p) => ({ path: p, content: readFileSync(join(ROOT, p), 'utf8') }));
  const violations = scanDirectLlmCalls(files);
  assert.deepEqual(
    violations,
    [],
    `прямой вызов провайдера мимо панели:\n${violations
      .map((v) => `  ${v.path}:${v.line} — ${v.excerpt}`)
      .join('\n')}\nЛечение: invokeProcedureLlm + процедура в llm-procedures.json; законное исключение — в LLM_PANEL_WHITELIST с причиной.`,
  );
});

test('#2147/4 порча-фикстура: оба маркера живые, тестовые файлы не судятся', () => {
  const fixture = [
    { path: 'scripts/evil-direct.mjs', content: "await fetch('https://api.anthropic.com/v1/messages');" },
    { path: 'scripts/evil-post.mjs', content: 'const r = await anthropicPost(url, {});' },
    { path: 'scripts/clean.mjs', content: "await invokeProcedureLlm({ procedureId: 'x' });" },
    { path: 'scripts/porcha.test.mjs', content: "'api.anthropic.com' // тестовые не судятся" },
  ];
  const v = scanDirectLlmCalls(fixture, { whitelist: new Map() });
  assert.deepEqual(v.map((x) => x.path), ['scripts/evil-direct.mjs', 'scripts/evil-post.mjs']);
});

test('#2147/4 белый список честен: файл существует, причина названа, пересечения с фасадом нет', () => {
  for (const [path, reason] of LLM_PANEL_WHITELIST) {
    assert.ok(existsSync(join(ROOT, path)), `в белом списке мёртвая строка: ${path}`);
    assert.ok(reason.length > 10, `причина слишком коротка у ${path}`);
    assert.ok(!MUST_USE_FACADE.includes(path), `${path} не может быть одновременно в белом списке и в MUST_USE_FACADE`);
  }
});

test('процедуры панели зарегистрированы с цепочкой фолбэков', () => {
  const reg = loadProcedureRegistry();
  const defaults = loadProcedureDefaults();
  const expectations = [
    { id: 'ask', entry: 'scripts/ask-persona.mjs' },
    { id: 'drift-anchor', entry: 'scripts/drift-anchor-run.mjs' },
    { id: 'competition-synthesis', entry: 'scripts/generate-competition-async-v2-synthesis.mjs' },
  ];
  for (const { id, entry } of expectations) {
    const p = reg.procedures.find((x) => x.id === id);
    assert.ok(p, `llm-procedures.json: нет записи ${id}`);
    assert.equal(p.entryMjs, entry);
    assert.ok(defaults[id], `llm-procedure-defaults.json: нет цепочки ${id}`);
    assert.ok(
      defaults[id].chain.length >= 2,
      `цепочка ${id} из ${defaults[id].chain.length} звена — без фолбэка процедура мертва при исчерпанном первом`,
    );
    const providers = defaults[id].chain.map((s) => s.provider);
    assert.ok(
      providers.includes('xai') || providers.includes('deepseek'),
      `в цепочке ${id} нет живого не-Anthropic фолбэка (xai/deepseek)`,
    );
  }
});
