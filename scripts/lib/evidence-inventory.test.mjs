/**
 * Зуб описи вещдоков (#1303, №9 хендофа 28.07): абсолютный путь красный,
 * запись без sha/адреса красная, индекс воспроизводим, живые ≠ история.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { recordProblems, parseRegistry } from './evidence-index.mjs';
import {
  isAbsoluteRef,
  kindOf,
  liveRecords,
  portabilityProblems,
  renderIndex,
  revisionOf,
} from './evidence-inventory.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REGISTRY = readFileSync(join(repoRoot, 'docs/evidence/registry.jsonl'), 'utf8');
const INDEX = readFileSync(join(repoRoot, 'docs/evidence/INDEX.md'), 'utf8');
const { records } = parseRegistry(REGISTRY);

test('ЖИВОЙ реестр: ни одной живой записи с абсолютным путём (переносимость)', () => {
  assert.deepEqual(portabilityProblems(records), []);
});

test('абсолютный путь ловится в любой форме: Windows-диск, POSIX-корень, UNC', () => {
  assert.ok(isAbsoluteRef('C:/Users/x/f.pdf'));
  assert.ok(isAbsoluteRef('/home/x/f.pdf'));
  assert.ok(isAbsoluteRef('\\\\server\\share\\f.pdf'));
  assert.ok(!isAbsoluteRef('docs/evidence/store/f.pdf'));
  const problems = portabilityProblems([{ id: 'x', location: { kind: 'local', ref: 'C:/Users/u/f.pdf' } }]);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /x-r2/u, 'отказ называет команду поправки');
});

test('история не судится: старая абсолютная запись под поправкой -rN красной не делает', () => {
  const rows = [
    { id: 'doc', location: { kind: 'local', ref: 'C:/Users/u/f.pdf' } },
    { id: 'doc-r2', location: { kind: 'local', ref: 'docs/evidence/store/f.pdf' } },
  ];
  assert.deepEqual(portabilityProblems(rows), []);
  const { live, superseded } = liveRecords(rows);
  assert.deepEqual(live.map((r) => r.id), ['doc-r2']);
  assert.deepEqual(superseded, [{ id: 'doc', by: 'doc-r2' }]);
});

test('запись без sha или без адреса — красная (несущий предикат дома)', () => {
  assert.ok(recordProblems({ id: 'x', bytes: 1, source: 's', addedAt: '2026-07-28', location: { kind: 'local', ref: 'a' } })
    .some((p) => p.includes('sha256')));
  assert.ok(recordProblems({ id: 'x', sha256: 'a'.repeat(64), bytes: 1, source: 's', addedAt: '2026-07-28' })
    .some((p) => p.includes('location')));
});

test('индекс воспроизводим: перегенерация из того же реестра даёт тот же файл', () => {
  assert.equal(renderIndex(records), INDEX);
  assert.equal(renderIndex(records), renderIndex(records));
});

test('индекс несёт шапку-предупреждение и только живые записи', () => {
  assert.match(INDEX, /ГЕНЕРИРУЕТСЯ из `registry.jsonl`/u);
  assert.match(INDEX, /Руками не править/u);
  const { superseded } = liveRecords(records);
  for (const s of superseded) {
    assert.ok(!new RegExp(`\\| ${s.id} \\|`, 'u').test(INDEX), `исправленная ${s.id} не в теле описи`);
  }
});

test('чувствительная запись: легальное «нет» переносимости с причиной, адрес в опись не печатается', () => {
  const rows = [{
    id: 'partner-doc', sha256: 'a'.repeat(64), bytes: 10, addedAt: '2026-07-28', source: 'партнёр',
    about: 'внешний материал', location: { kind: 'local', ref: 'C:/Users/u/Downloads/секрет.pdf' },
    sensitive: { reason: 'репозиторий публичный — байты в git не уезжают', decidedAt: '2026-07-28' },
  }];
  assert.deepEqual(portabilityProblems(rows), [], 'sensitive не краснеет — причина названа');
  const idx = renderIndex(rows);
  assert.ok(!idx.includes('C:/Users'), 'адрес чувствительного материала в опись не попадает');
  assert.match(idx, /чувствительное/u);
  // без причины пометка не работает: молчаливый sensitive — снова красный
  const noReason = [{ ...rows[0], sensitive: { decidedAt: 'x' } }];
  assert.equal(portabilityProblems(noReason).length, 1);
});

test('ЖИВОЙ индекс не несёт абсолютных путей вовсе (публичный репозиторий)', () => {
  assert.ok(!/[A-Za-z]:[\\/]/u.test(INDEX), 'ни одного машинного пути в опубликованной описи');
});

test('вид — проекция таксономии README, не новое поле записи', () => {
  assert.equal(kindOf({ location: { kind: 'local', ref: 'docs/memos/2026-07-28.md' } }), 'изъятие');
  assert.equal(kindOf({ location: { kind: 'archivarius', ref: 'span://x' } }), 'изъятие');
  assert.equal(kindOf({ location: { kind: 'local', ref: 'docs/evidence/store/чек.pdf' } }), 'поступление');
  assert.deepEqual(revisionOf('x-r3'), { base: 'x', rev: 3 });
  assert.deepEqual(revisionOf('x'), { base: 'x', rev: 1 });
});
