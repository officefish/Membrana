/**
 * Статический контракт .githooks/pre-push для свежего рабочего дерева (#1272 Ф4).
 *
 * Эпизод 26.07: слияние делалось в отдельном дереве (общее держали чужие незакоммиченные
 * правки), и отправка оттуда падала невнятным «Couldn't find the node_modules state file».
 * Диагноза не было — приходилось глушить весь хук целиком (SKIP_PREPUSH), то есть
 * отключать и те проверки, которые прекрасно работали бы.
 *
 * Норма: честное «нет» с причиной вместо аварии (родня зверю «Заглушка» #1219 — там
 * обязательное поле без легального «нет», здесь обязательная проверка без него же).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hook = readFileSync(join(root, '.githooks', 'pre-push'), 'utf8');

test('хук распознаёт дерево без установленных зависимостей', () => {
  assert.match(hook, /YARN_READY/, 'признак готовности окружения объявлен');
  assert.match(hook, /\[ ! -d node_modules \]/, 'проверка идёт по факту, а не по догадке');
});

test('пропуск объявляется вслух и называет, что именно пропущено', () => {
  assert.match(hook, /зависимости не установлены/i);
  assert.match(hook, /Пропущены проверки/i, 'молчаливое сокращение запрещено');
  assert.match(hook, /catalog:verify-client/, 'пропущенные шаги названы поимённо');
  assert.match(hook, /yarn install/, 'назван выход, а не только диагноз');
});

test('проверки на голом node продолжают работать без зависимостей', () => {
  const traceLine = hook.indexOf('node scripts/trace-gate.mjs lead-persona');
  assert.ok(traceLine > 0, 'гейт ответственности присутствует');
  const guardedBlockBeforeTrace = hook.slice(0, traceLine).lastIndexOf('if [ "$YARN_READY" = "1" ]');
  assert.ok(
    guardedBlockBeforeTrace === -1,
    'гейт ответственности НЕ спрятан за флагом окружения — ему нужен только node',
  );
});

test('все yarn-зависимые шаги закрыты флагом готовности', () => {
  for (const step of ['yarn catalog:verify-client', 'yarn kits:audit --mode latest', 'yarn verify:wire-sync']) {
    const at = hook.indexOf(step);
    assert.ok(at > 0, `шаг присутствует: ${step}`);
    const before = hook.slice(0, at);
    assert.ok(
      before.lastIndexOf('if [ "$YARN_READY" = "1" ]') > before.lastIndexOf('\nfi'),
      `шаг под флагом готовности: ${step}`,
    );
  }
});

test('аварийный выход целиком сохранён — но он больше не единственный', () => {
  assert.match(hook, /SKIP_PREPUSH/, 'ручной пропуск остаётся');
  assert.ok(
    hook.indexOf('YARN_READY') > hook.indexOf('SKIP_PREPUSH'),
    'мягкая деградация идёт после аварийного выхода, не подменяет его',
  );
});
