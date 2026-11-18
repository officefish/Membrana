/**
 * Тесты проверки свежести секретов (#2662): правила — на подменных входах, живой прогон по
 * реестру ствола — последним тестом.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  checkFreshness,
  END,
  expiryKind,
  parseRegistry,
  START,
  workflowSecretNames,
} from './lib/secrets-freshness.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = resolve(ROOT, 'scripts/verify-secrets-freshness.mjs');

function registry(rows) {
  return [
    '# x',
    START,
    '| Имя | Где лежит | Кто использует | Кто выпустил | Обновлён | Истекает | Как ротировать |',
    '|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| \`${r[0]}\` | ${r[1]} | wf | владелец | 2026-11-01 | ${r[2]} | рукой |`),
    END,
  ].join('\n');
}

test('parseRegistry: имя из бэктиков, место и срок по заголовкам колонок', () => {
  const rows = parseRegistry(registry([['A_TOKEN', 'GitHub secret', '2027-01-01']]));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'A_TOKEN');
  assert.equal(rows[0].where, 'GitHub secret');
  assert.equal(rows[0].expires, '2027-01-01');
});

test('parseRegistry: без маркеров — ошибка входа, а не пустой зелёный', () => {
  assert.throws(() => parseRegistry('| Имя |\n|---|\n'), /маркеров/u);
});

test('workflowSecretNames: все secrets.* файла', () => {
  const names = workflowSecretNames('a: ${{ secrets.X_KEY }}\nb: ${{ secrets.WEEKLY_PLAN_TOKEN || secrets.GITHUB_TOKEN }}');
  assert.deepEqual([...names].sort(), ['GITHUB_TOKEN', 'WEEKLY_PLAN_TOKEN', 'X_KEY']);
});

test('expiryKind: дата / неизвестно / не истекает / мусор', () => {
  assert.equal(expiryKind('2026-12-01'), 'date');
  assert.equal(expiryKind('неизвестно — спросить владельца'), 'unknown');
  assert.equal(expiryKind('не истекает'), 'none');
  assert.equal(expiryKind('на прогон'), 'none');
  assert.equal(expiryKind('скоро'), 'invalid');
});

test('красный: секрет workflow без строки реестра называет имя и файл', () => {
  const rows = parseRegistry(registry([['A_TOKEN', 'GitHub secret', 'не истекает']]));
  const r = checkFreshness(rows, new Map([['B_TOKEN', ['x.yml']]]), { today: '2026-11-18' });
  assert.equal(r.ok, false);
  assert.deepEqual(r.errors, [{ kind: 'unregistered', name: 'B_TOKEN', files: ['x.yml'] }]);
});

test('красный: строка с тем же именем, но не GitHub (хост) — не регистрация секрета Actions', () => {
  const rows = parseRegistry(registry([['A_TOKEN', '`/etc/membrana/office.env`', 'не истекает']]));
  const r = checkFreshness(rows, new Map([['A_TOKEN', ['x.yml']]]), { today: '2026-11-18' });
  assert.equal(r.errors[0]?.kind, 'unregistered');
});

test('предупреждение за 14 дней, на 15-й — тихо; прошедшая дата — красный', () => {
  const rows = parseRegistry(
    registry([
      ['SOON', 'GitHub secret', '2026-12-02'],
      ['LATER', 'GitHub secret', '2026-12-03'],
      ['GONE', 'GitHub secret', '2026-11-17'],
    ]),
  );
  const r = checkFreshness(rows, new Map(), { today: '2026-11-18', warnDays: 14 });
  assert.deepEqual(r.warnings.map((w) => [w.name, w.days]), [['`SOON`', 14]]);
  assert.deepEqual(r.errors.map((e) => [e.kind, e.name]), [['expired', '`GONE`']]);
});

test('неизвестный срок — в сводку, не в красный', () => {
  const rows = parseRegistry(registry([['A_TOKEN', 'GitHub secret', 'неизвестно — спросить владельца']]));
  const r = checkFreshness(rows, new Map([['A_TOKEN', ['x.yml']]]), { today: '2026-11-18' });
  assert.equal(r.ok, true);
  assert.equal(r.unknown.length, 1);
});

test('живой прогон: каждый secrets.* из workflows ствола записан в реестре, дат-просрочек нет', () => {
  // `--today` прибит к дате заведения реестра НАМЕРЕННО: тест судит регистрацию (новый
  // secrets.X без строки реестра) и формат дат, а не календарь. Иначе ствол краснел бы сам
  // собой в день истечения ключа, в PR, который к ключу отношения не имеет. Сроки судит
  // запуск без `--today` (утро/ежемесячно — см. SECRETS_REGISTRY.md «Как подключить»).
  let out;
  try {
    out = execFileSync(process.execPath, [TOOL, '--json', '--today', '2026-11-18'], { encoding: 'utf8' });
  } catch (e) {
    out = String(e.stdout ?? '');
    assert.ok(out.trim(), `проверка упала без отчёта: ${e.stderr ?? e.message}`);
  }
  const r = JSON.parse(out);
  assert.ok(r.used > 0 && r.total > 0, 'реестр или workflows пусты — судить нечего');
  assert.deepEqual(r.errors, [], 'секрет workflow без строки реестра или просроченная дата');
  assert.equal(r.ok, true);
});
