/**
 * Зубы политики восстановления (блок b1, карточка archivarius-mongo-restore-drill, #1809).
 *
 * Корпус назван исполнителем блока при прогоне контекста
 * (docs/discussions/block-b1-restore-policy-dynin.md). Ключевой зуб — частичная порча при
 * ВЕРНОМ счёте: без него трёхслойная мерка декоративна, а «бэкап» снова означает «файл есть».
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  InvalidInventoryError,
  MISMATCH_REASONS,
  RESTORE_SHA256_SUBJECT,
  assertInventory,
  formatRestoreVerdict,
  verifyRestore,
} from './mongo-restore-policy.mjs';

const sha = (c) => c.repeat(64);

const coll = (name, over = {}) => ({
  name,
  count: 10,
  sha256: sha('a'),
  invariants: { schemaVersion: 1, pkField: '_id', requiredIndexes: ['sessionId_1'], extras: {} },
  ...over,
});

const inv = (...collections) => ({
  subject: RESTORE_SHA256_SUBJECT,
  source: 'archive-contents',
  takenAt: 1767225600000,
  collections,
});

test('равные непустые описи → восстановление подтверждено', () => {
  const v = verifyRestore(inv(coll('runs'), coll('spans')), inv(coll('runs'), coll('spans')));
  assert.deepEqual(v, { ok: true });
  assert.match(formatRestoreVerdict(v), /восстановление подтверждено/u);
});

test('КЛЮЧЕВОЙ: счёт совпал, содержимое нет → CONTENT_MISMATCH, а не «всё сошлось»', () => {
  // Тихая порча: документов столько же, но один из них другой. Ровно ради этого случая
  // заведён слой sha — «файл создан, размер ненулевой» такого не ловит никогда.
  const v = verifyRestore(inv(coll('spans')), inv(coll('spans', { sha256: sha('b') })));
  assert.equal(v.ok, false);
  assert.equal(v.reason, 'CONTENT_MISMATCH');
  assert.equal(v.at.collection, 'spans');
  assert.equal(v.at.layer, 'sha');
  assert.match(formatRestoreVerdict(v), /тихая порча/u);
});

test('порядок слоёв: пропавший документ — COUNT_MISMATCH, а не «содержимое разное»', () => {
  const v = verifyRestore(inv(coll('spans')), inv(coll('spans', { count: 9, sha256: sha('b') })));
  assert.equal(v.reason, 'COUNT_MISMATCH');
  assert.equal(v.at.layer, 'count', 'мощность объясняет расхождение проще — её и называем');
});

test('коллекция пропала при восстановлении → COLLECTION_MISSING раньше прочих слоёв', () => {
  const v = verifyRestore(inv(coll('runs'), coll('spans')), inv(coll('spans')));
  assert.equal(v.reason, 'COLLECTION_MISSING');
  assert.equal(v.at.collection, 'runs');
});

test('лишняя коллекция после восстановления тоже расхождение', () => {
  const v = verifyRestore(inv(coll('spans')), inv(coll('extra'), coll('spans')));
  assert.equal(v.reason, 'COLLECTION_EXTRA');
  assert.equal(v.at.collection, 'extra');
});

test('инварианты: версия схемы, поле ключа, обязательный индекс — каждый со своим родом', () => {
  const bad = (over) => verifyRestore(inv(coll('spans')), inv(coll('spans', { invariants: { ...coll('spans').invariants, ...over } })));

  const ver = bad({ schemaVersion: 2 });
  assert.equal(ver.reason, 'SCHEMA_VERSION_MISMATCH');
  assert.equal(ver.expected, 1);
  assert.equal(ver.actual, 2);

  const pk = bad({ pkField: 'id' });
  assert.equal(pk.reason, 'PK_FIELD_MISMATCH');

  const idx = bad({ requiredIndexes: [] });
  assert.equal(idx.reason, 'REQUIRED_INDEX_MISSING');
  assert.equal(idx.expected, 'sessionId_1');
});

test('дополнительный инвариант сверяется по значению', () => {
  const src = inv(coll('spans', { invariants: { ...coll('spans').invariants, extras: { sessions: 97 } } }));
  const got = inv(coll('spans', { invariants: { ...coll('spans').invariants, extras: { sessions: 96 } } }));
  const v = verifyRestore(src, got);
  assert.equal(v.reason, 'EXTRA_INVARIANT_MISMATCH');
  assert.equal(v.at.field, 'extras.sessions');
});

test('отсутствие слоя — ОТКАЗ ВХОДА, не расхождение и не unknown', () => {
  // Если sha не посчитан, это дефект сборщика описи, а не свойство базы. Вернуть ok:false
  // значило бы обвинить восстановление в том, чего не мерили; ok:true — пропустить
  // непроверенное. Оба — ложь, поэтому громкий отказ.
  const noSha = { ...coll('spans') };
  delete noSha.sha256;
  assert.throws(() => verifyRestore(inv(coll('spans')), inv(noSha)), (e) => {
    assert.ok(e instanceof InvalidInventoryError);
    assert.equal(e.missingLayer, 'sha');
    assert.equal(e.collection, 'spans');
    return true;
  });

  const noInv = { ...coll('spans') };
  delete noInv.invariants;
  assert.throws(() => verifyRestore(inv(noInv), inv(coll('spans'))), (e) => e.missingLayer === 'invariant');

  const noCount = { ...coll('spans') };
  delete noCount.count;
  assert.throws(() => verifyRestore(inv(noCount), inv(coll('spans'))), (e) => e.missingLayer === 'count');
});

test('неотсортированная или дублирующая опись — отказ входа, а не тихая сортировка внутри', () => {
  assert.throws(() => assertInventory(inv(coll('spans'), coll('runs')), 'source'), /не отсортированы/u);
  assert.throws(() => assertInventory(inv(coll('runs'), coll('runs')), 'source'), /повторяются/u);
});

test('sha не шестнадцатеричный или счёт отрицательный — отказ входа', () => {
  assert.throws(() => assertInventory(inv(coll('spans', { sha256: 'нет' })), 'restored'), InvalidInventoryError);
  assert.throws(() => assertInventory(inv(coll('spans', { count: -1 })), 'restored'), InvalidInventoryError);
});

test('детерминизм: два прогона одного входа дают побитово равный вердикт', () => {
  const a = inv(coll('runs'), coll('spans', { sha256: sha('c') }));
  const b = inv(coll('runs'), coll('spans', { sha256: sha('d') }));
  assert.equal(JSON.stringify(verifyRestore(a, b)), JSON.stringify(verifyRestore(a, b)));
});

test('закрытые списки объявлены и субъект хеша назван', () => {
  assert.ok(MISMATCH_REASONS.includes('CONTENT_MISMATCH'));
  assert.ok(MISMATCH_REASONS.includes('COUNT_MISMATCH'));
  assert.equal(Object.isFrozen(MISMATCH_REASONS), true);
  assert.equal(RESTORE_SHA256_SUBJECT, 'collection-bson-sorted-by-id');
});
