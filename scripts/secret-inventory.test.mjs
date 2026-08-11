/**
 * Зубы b5 s-queue-2026-08-11 (#1266): инвентарь засвеченного.
 * Три инварианта DoD: детерминизм · синтетика всех классов ловится ·
 * ни одно значение не попадает в вывод.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildSecretInventory, renderInventoryTable } from './secret-inventory.mjs';

const CLI = join(dirname(fileURLToPath(import.meta.url)), 'secret-inventory.mjs');

// Синтетические образцы. Значения выдуманы; PEM собран конкатенацией, чтобы
// сам этот файл не светился находкой у гейтов.
const FAKE_PEM_VALUE = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ')
  + '\nMIIfakefakefakefakefakefakefake\n'
  + ['-----END', 'PRIVATE KEY-----'].join(' ');
const FAKE_TOKEN_VALUE = 'synthetic-token-value-a1b2c3';

function fixtureEntries() {
  return [
    { path: 'a/keys.txt', text: `до\n${FAKE_PEM_VALUE}\nпосле\n` },
    { path: 'b/config.json', text: JSON.stringify({ api_key: FAKE_TOKEN_VALUE, nested: { password: FAKE_TOKEN_VALUE } }) },
    { path: 'c/clean.md', text: 'здесь чисто\n' },
  ];
}

test('детерминизм: два прогона на одном входе — байт в байт', () => {
  const a = buildSecretInventory(fixtureEntries());
  const b = buildSecretInventory(fixtureEntries());
  assert.deepEqual(a, b);
  const ra = renderInventoryTable(a, { target: 'fx', filesScanned: 3 });
  const rb = renderInventoryTable(b, { target: 'fx', filesScanned: 3 });
  assert.equal(ra, rb);
});

test('синтетика классов ловится: PEM-текст и чувствительные JSON-ключи', () => {
  const rows = buildSecretInventory(fixtureEntries());
  assert.ok(rows.some((r) => r.file === 'a/keys.txt' && r.count >= 1), 'PEM-класс не пойман');
  assert.ok(rows.some((r) => r.file === 'b/config.json' && r.class.startsWith('json:') && r.count >= 1),
    'чувствительный JSON-ключ не пойман');
  assert.ok(!rows.some((r) => r.file === 'c/clean.md'), 'чистый файл дал находку');
});

test('ни одно значение не попадает в вывод — ни в таблицу, ни в --json', () => {
  const rows = buildSecretInventory(fixtureEntries());
  const table = renderInventoryTable(rows, { target: 'fx', filesScanned: 3 });
  const asJson = JSON.stringify(rows);
  for (const leak of ['MIIfakefake', FAKE_TOKEN_VALUE]) {
    assert.ok(!table.includes(leak), `значение в таблице: ${leak.slice(0, 8)}…`);
    assert.ok(!asJson.includes(leak), `значение в json: ${leak.slice(0, 8)}…`);
  }
  assert.match(table, /ВЕРХНЯЯ ГРАНИЦА/u, 'честная оговорка обязана печататься');
});

test('CLI живьём: каталог-фикстура, exit 0, значения не выходят наружу', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sec-inv-'));
  mkdirSync(join(dir, 'sub'), { recursive: true });
  writeFileSync(join(dir, 'sub', 'cfg.json'), JSON.stringify({ token: FAKE_TOKEN_VALUE }));
  const out = execFileSync(process.execPath, [CLI, dir, '--json'], { encoding: 'utf8' });
  const parsed = JSON.parse(out);
  assert.equal(parsed.upperBound, true);
  assert.ok(parsed.rows.length >= 1);
  assert.ok(!out.includes(FAKE_TOKEN_VALUE), 'значение вышло в stdout');
  rmSync(dir, { recursive: true, force: true });
});

test('ошибка входа: несуществующая цель и неизвестный флаг — код 2 с причиной', () => {
  for (const argv of [['нет/такого/пути'], ['docs', '--такого-нет']]) {
    let code = 0; let err = '';
    try {
      execFileSync(process.execPath, [CLI, ...argv], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) { code = e.status; err = String(e.stderr); }
    assert.equal(code, 2, argv.join(' '));
    assert.match(err, /ошибка входа/u);
  }
});

test('контрольная подсадка: чистый корпус + один синтетический ключ = ровно одна находка', () => {
  // Негативный контроль (п.4 ревью dynin): «0 находок» на корпусе доказуем
  // только если подсадка в тот же корпус даёт ровно одну ожидаемую находку.
  const clean = [{ path: 'x/a.md', text: 'чисто\n' }, { path: 'x/b.md', text: 'тоже чисто\n' }];
  assert.equal(buildSecretInventory(clean).length, 0);
  const planted = [...clean, { path: 'x/planted.json', text: JSON.stringify({ token: FAKE_TOKEN_VALUE }) }];
  const rows = buildSecretInventory(planted);
  assert.equal(rows.length, 1, 'подсадка обязана дать ровно одну строку');
  assert.equal(rows[0].file, 'x/planted.json');
  assert.ok(rows[0].class.startsWith('json:'));
  assert.equal(rows[0].count, 1);
});
