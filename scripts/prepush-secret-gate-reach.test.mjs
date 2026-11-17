/**
 * Зуб 2 к #2495 — ГЛАВНЫЙ: секрет-скан (#1262) остаётся включённым при любом обращении
 * с календарной свежестью снимка сети.
 *
 * ВЕЩДОК 28.09 (замер). Секрет-скан стоял восьмым шагом `.githooks/pre-push`, а зуб сети —
 * шестым. При `set -e` прогон `node scripts/network/tooth.mjs` со снимком от 25.09 давал
 * exit 1, и до секрет-скана управление НЕ ДОХОДИЛО: печать «секрет-скан дошёл бы до
 * запуска» в пробе не появилась. Второй путь того же: единственным названным обходом
 * календарного отказа был общий `SKIP_PREPUSH=1`, гасящий и секрет-скан.
 *
 * Порча обязана краснеть — поэтому испорченные хуки лежат ЗДЕСЬ, в наборе, а не в
 * пересказе: каждый из них разбирается тем же предикатом, что и настоящий хук.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  auditSecretGateReach,
  auditSnapshotUpkeepNotBlocking,
  hookSteps,
  SECRET_GATE_STEP,
} from './lib/prepush-secret-gate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hook = readFileSync(join(root, '.githooks', 'pre-push'), 'utf8');

/** Опорный хук нужной формы: секрет-скан первым, уход за снимком — предупреждением. */
const GOOD = [
  '#!/usr/bin/env sh',
  'if [ "$SKIP_PREPUSH" = "1" ]; then',
  '  exit 0',
  'fi',
  '',
  'set -e',
  '',
  'echo "pre-push [#1262]: секрет-скан диапазона"',
  'node scripts/secret-gate-push.mjs',
  '',
  '# Уход за снимком — предупреждение (#2495).',
  'echo "pre-push [#1449]: зуб сети"',
  'node scripts/network/tooth.mjs --snapshot-upkeep=warn',
  '',
  'if [ "$YARN_READY" = "1" ]; then',
  '  yarn catalog:verify-client',
  'fi',
  '',
  'echo "pre-push: OK"',
].join('\n');

test('НАСТОЯЩИЙ хук: секрет-скан достижим — не под условием и ничем не вытесняется', () => {
  assert.deepEqual(auditSecretGateReach(hook), []);
});

test('НАСТОЯЩИЙ хук: уход за снимком не блокирует и не посылает в общий обход', () => {
  assert.deepEqual(auditSnapshotUpkeepNotBlocking(hook), []);
});

test('НАСТОЯЩИЙ хук: секрет-скан — первый исполняемый шаг', () => {
  const steps = hookSteps(hook);
  assert.ok(steps.length > 3, 'шаги распознаны');
  assert.ok(steps[0].command.startsWith(SECRET_GATE_STEP), `первый шаг — секрет-скан, а не «${steps[0].command}»`);
  assert.equal(steps[0].depth, 0, 'и он вне условных блоков');
});

test('опорный хук нужной формы предикат считает чистым (он не «всё красное»)', () => {
  assert.deepEqual(auditSecretGateReach(GOOD), []);
  assert.deepEqual(auditSnapshotUpkeepNotBlocking(GOOD), []);
});

test('ПОРЧА: секрет-скан под флагом обхода свежести — красный', () => {
  const bad = GOOD.replace(
    'node scripts/secret-gate-push.mjs',
    ['if [ "$SKIP_NETWORK_FRESHNESS" != "1" ]; then', '  node scripts/secret-gate-push.mjs', 'fi'].join('\n'),
  );
  const found = auditSecretGateReach(bad);
  assert.ok(found.some((f) => /стоит под условием/u.test(f)), found.join(' | '));
});

test('ПОРЧА: секрет-скан за зубом сети (как было до 28.09) — красный', () => {
  const bad = [
    'set -e',
    'echo "pre-push [#1449]: зуб сети"',
    'node scripts/network/tooth.mjs --snapshot-upkeep=warn',
    'echo "pre-push [#1262]: секрет-скан"',
    'node scripts/secret-gate-push.mjs',
  ].join('\n');
  const found = auditSecretGateReach(bad);
  assert.ok(found.some((f) => /не первый/u.test(f)), found.join(' | '));
  assert.ok(found.some((f) => /network\/tooth\.mjs/u.test(f)), 'вытесняющий шаг назван по имени');
});

test('ПОРЧА: секрет-скана в хуке нет вовсе — красный', () => {
  const bad = GOOD.replace('node scripts/secret-gate-push.mjs\n', '');
  const found = auditSecretGateReach(bad);
  assert.ok(found.some((f) => /нет шага секрет-скана/u.test(f)), found.join(' | '));
});

test('ПОРЧА: снят `set -e` — красный (отказ гейта стал бы советом)', () => {
  const bad = GOOD.replace('\nset -e\n', '\n');
  const found = auditSecretGateReach(bad);
  assert.ok(found.some((f) => /set -e/u.test(f)), found.join(' | '));
});

test('ПОРЧА: зуб сети снова блокирует по календарю (ключ убрали) — красный', () => {
  const bad = GOOD.replace('node scripts/network/tooth.mjs --snapshot-upkeep=warn', 'node scripts/network/tooth.mjs');
  const found = auditSnapshotUpkeepNotBlocking(bad);
  assert.ok(found.some((f) => /без --snapshot-upkeep=warn/u.test(f)), found.join(' | '));
});

test('ПОРЧА: блок зуба сети снова отправляет за обходом в SKIP_PREPUSH — красный', () => {
  const bad = GOOD.replace(
    '# Уход за снимком — предупреждение (#2495).',
    '# Голый node; ремонт зуб называет сам. Обход — общий SKIP_PREPUSH=1.',
  );
  const found = auditSnapshotUpkeepNotBlocking(bad);
  assert.ok(found.some((f) => /SKIP_PREPUSH/u.test(f)), found.join(' | '));
});

test('разбор шагов: echo и команды в комментариях шагами не считаются', () => {
  const steps = hookSteps(
    ['# node scripts/fake.mjs — это цитата', 'echo "node scripts/other.mjs"', 'node scripts/real.mjs'].join('\n'),
  );
  assert.deepEqual(
    steps.map((s) => s.command),
    ['node scripts/real.mjs'],
  );
});

test('разбор шагов: вложенность в if считается, `fi` её закрывает', () => {
  const steps = hookSteps(
    ['if [ "$X" = "1" ]; then', '  node scripts/inside.mjs', 'fi', 'node scripts/outside.mjs'].join('\n'),
  );
  assert.equal(steps[0].conditional, true, 'внутри if — под условием');
  assert.equal(steps[1].conditional, false, 'после fi — уже нет');
});
