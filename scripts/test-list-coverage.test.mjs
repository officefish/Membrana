/**
 * Мета-гвард: каждый scripts/*.test.mjs должен быть в `test:scripts` (package.json).
 *
 * Трение 17.07 (заседание scripts-boundary): список test:scripts ведётся рукой →
 * 4 теста-сироты (anthropic-env, meeting-agenda, meeting-walk, net-diag) написаны
 * и НЕ гонялись в CI. Ручной список неизбежно дрейфует (тот же класс, что реестр
 * без чекера). Этот тест ловит дрейф: добавил тест, забыл в список — красный.
 *
 * Почему не glob в самом test:scripts: явный список — сознательный контроль
 * (флейки можно временно исключить строкой), а гвард держит его честным.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptsDir, '..');

test('каждый scripts/*.test.mjs присутствует в test:scripts', () => {
  const list = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')).scripts['test:scripts'];
  const onDisk = readdirSync(scriptsDir).filter((f) => f.endsWith('.test.mjs'));
  const orphans = onDisk.filter((f) => !list.includes(f));
  assert.deepEqual(
    orphans,
    [],
    `тесты на диске, но не в test:scripts (осиротели, не гоняются в CI): ${orphans.join(', ')}`,
  );
});
