import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrationDirName } from './prisma-migration-new.mjs';

test('migrationDirName: timestamp + snake_case', () => {
  const d = new Date('2026-07-08T13:05:09.000Z');
  assert.equal(migrationDirName(d, 'Tariff EntitledSkus'), '20260708130509_tariff_entitledskus');
});
test('migrationDirName: чистит спецсимволы и края', () => {
  const d = new Date('2026-07-08T00:00:00.000Z');
  assert.equal(migrationDirName(d, '  Add--Node.Field!  '), '20260708000000_add_node_field');
});
test('migrationDirName: пустое имя → ошибка', () => {
  assert.throws(() => migrationDirName(new Date(), '  '), /пустое|empty/i);
});
