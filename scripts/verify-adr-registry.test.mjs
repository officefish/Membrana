/**
 * Тесты зуба полноты реестра ADR (#2412).
 *
 * Правило проверяется на подменных входах — падение обязано говорить о правиле, а не о
 * состоянии каталога. Живой прогон по дереву — отдельной строкой: он и есть предмет.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { linkedFiles, recordFiles, recordNumber, registryGaps } from './lib/adr-registry.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ADR_DIR = join(ROOT, 'docs', 'adr');
const ADR_README = join(ADR_DIR, 'README.md');
const TOOL = resolve(ROOT, 'scripts/verify-adr-registry.mjs');

test('предмет зуба: каталог ADR и его реестр на месте', () => {
  assert.ok(existsSync(ADR_DIR), `предмет зуба потерян: нет каталога ${ADR_DIR}`);
  assert.ok(existsSync(ADR_README), `предмет зуба потерян: нет реестра ${ADR_README}`);
});

test('предмет зуба: реестр по-прежнему ТРЕБУЕТ полноты — зуб исполняет чужое правило', () => {
  // Если требование из README уйдёт, зуб перестанет быть исполнением правила и станет
  // собственной выдумкой. Тогда сначала разговор, а не молчаливый зелёный.
  const text = readFileSync(ADR_README, 'utf8');
  assert.match(text, /Реестр обязан содержать/u, 'README больше не объявляет полноту реестра');
});

test('recordFiles: README и шаблон записями не считаются', () => {
  const files = ['README.md', 'ADR_TEMPLATE.md', 'ADR-0001-x.md', 'note.txt'];
  assert.deepEqual(recordFiles(files), ['ADR-0001-x.md']);
});

test('recordNumber: номер берётся только у канонической формы имени', () => {
  assert.equal(recordNumber('ADR-0027-field-node.md'), '0027');
  // Историческая форма без префикса номера в последовательности ADR не несёт —
  // реестр и озаглавливает её иначе. Обоснование — в scripts/lib/adr-registry.mjs.
  assert.equal(recordNumber('0006-benchmark-runs-calibrated-preset.md'), null);
  assert.equal(recordNumber('ADR_TEMPLATE.md'), null);
});

test('linkedFiles: считается markdown-ссылка, а не упоминание номера прозой', () => {
  const text = '| [ADR-0027](./ADR-0027-x.md) | … |\nтут просто ADR-0028 словами\n';
  assert.deepEqual([...linkedFiles(text)], ['ADR-0027-x.md']);
});

test('registryGaps: запись без строки — находка (ровно случай 0027/0028)', () => {
  const gaps = registryGaps(
    ['README.md', 'ADR-0027-a.md', 'ADR-0028-b.md'],
    '| [ADR-0027](./ADR-0027-a.md) |',
  );
  assert.deepEqual(gaps.missingRows, ['ADR-0028-b.md']);
  assert.deepEqual(gaps.danglingRows, []);
});

test('registryGaps: строка без файла — тоже находка, реестр врёт о наличии', () => {
  const gaps = registryGaps(['README.md', 'ADR-0027-a.md'], '[x](./ADR-0027-a.md) [y](./ADR-0099-ghost.md)');
  assert.deepEqual(gaps.missingRows, []);
  assert.deepEqual(gaps.danglingRows, ['ADR-0099-ghost.md']);
});

test('registryGaps: номер занят дважды — находка', () => {
  const gaps = registryGaps(
    ['README.md', 'ADR-0007-a.md', 'ADR-0007-b.md'],
    '[a](./ADR-0007-a.md) [b](./ADR-0007-b.md)',
  );
  assert.deepEqual(gaps.duplicateNumbers, [{ number: '0007', files: ['ADR-0007-a.md', 'ADR-0007-b.md'] }]);
});

test('registryGaps: полный реестр находок не даёт', () => {
  const gaps = registryGaps(
    ['README.md', 'ADR_TEMPLATE.md', 'ADR-0001-a.md'],
    '| [ADR-0001](./ADR-0001-a.md) | … |',
  );
  assert.deepEqual(gaps, { missingRows: [], danglingRows: [], duplicateNumbers: [] });
});

test('живой прогон по дереву зелёный: каждая запись docs/adr имеет строку реестра', () => {
  // Инструмент выходит с 1 на находках: отчёт нужен и при красном, иначе падение
  // сообщает номер выхода вместо имени записи.
  let out;
  try {
    out = execFileSync(process.execPath, [TOOL, '--json'], { encoding: 'utf8' });
  } catch (e) {
    out = String(e.stdout ?? '');
    assert.ok(out.trim(), `зуб упал без отчёта: ${e.stderr ?? e.message}`);
  }
  const report = JSON.parse(out);
  assert.deepEqual(report.missingRows, [], 'запись лежит в каталоге без строки реестра — она невидима');
  assert.deepEqual(report.danglingRows, [], 'реестр ссылается на несуществующий файл');
  assert.deepEqual(report.duplicateNumbers, [], 'номер ADR занят дважды');
  assert.equal(report.ok, true);
});

test('живой прогон видит все записи каталога, а не подмножество', () => {
  // Зуб, который ничего не читает, зелен всегда. Предмет сверяется со счётом файлов.
  const files = readdirSync(ADR_DIR).filter((f) => f.endsWith('.md'));
  assert.ok(recordFiles(files).length >= 25, `записей в каталоге подозрительно мало: ${files.length}`);
});
