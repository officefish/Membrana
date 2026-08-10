/**
 * Зубы дома archive-inventory (блок b1 спринта `dump-inventory-from-archive`, #1814).
 *
 * Fake-адаптер — та же форма, что у настоящего dockerAdapter; фикстуры листинга — форма
 * зубов дрилла (наш контракт INVENTORY_SCRIPT, не чужой формат — «дословность» тут
 * означает совпадение с формой, которую печатает НАШ скрипт снятия).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DB_NAME,
  DUMP_INVENTORY_PROJECT,
  HASH_SCRIPT,
  INVENTORY_SCRIPT,
  TARGET_PROJECT,
  buildInventory,
  buildInventoryFromArchive,
  invariantsOfCollection,
  readProjectInventory,
} from './lib/archive-inventory.mjs';

const c = (name, over = {}) => ({ name, count: 10, indexes: ['_id_', 'sessionId_1'], ...over });

/** Fake-адаптер с журналом вызовов: зубы проверяют оркестрацию, не докер. */
function fakeAdapter({ listing, failRestore = false, healthy = true } = {}) {
  const calls = [];
  return {
    calls,
    up: (p) => calls.push(['up', p]),
    down: (p) => calls.push(['down', p]),
    waitHealthy: (p) => {
      calls.push(['waitHealthy', p]);
      return healthy;
    },
    restore: (p, archive) => {
      calls.push(['restore', p, archive]);
      if (failRestore) throw new Error('mongorestore упал');
    },
    mongosh: (p, script) => {
      calls.push(['mongosh', p, script.includes('getCollectionNames') ? 'inventory' : 'hash']);
      if (script.includes('getCollectionNames')) return `${JSON.stringify(listing ?? [c('spans'), c('events', { count: 3 })])}\n`;
      return 'deadbeef\n';
    },
  };
}

test('buildInventoryFromArchive: жизненный цикл — ПРЕ-КЛИН, up, healthy, restore, чтение, down', () => {
  const adapter = fakeAdapter({});
  const { inventory, listing } = buildInventoryFromArchive({ archivePath: '/tmp/a.gz', adapter });
  // Пре-клин первым (ревью 10.08): --drop не роняет коллекции, которых нет в архиве, —
  // остатки прошлой сессии досыпали бы в опись чужое.
  assert.deepEqual(
    adapter.calls.map((x) => x[0]),
    ['down', 'up', 'waitHealthy', 'restore', 'mongosh', 'mongosh', 'mongosh', 'down'],
  );
  assert.equal(adapter.calls[3][2], '/tmp/a.gz');
  assert.equal(inventory.source, 'archive-contents');
  assert.equal(inventory.subject, 'collection-bson-sorted-by-id');
  // Листинг — сырьё потребителя: та же длина, форма {name, count, indexes}.
  assert.equal(listing.length, 2);
  assert.deepEqual(Object.keys(listing[0]).sort(), ['count', 'indexes', 'name']);
});

test('умолчания: цель — изолированный проект дрилла, база — та же', () => {
  const adapter = fakeAdapter({});
  buildInventoryFromArchive({ archivePath: '/tmp/a.gz', adapter });
  assert.ok(adapter.calls.every(([, p]) => p === TARGET_PROJECT));
  assert.equal(DB_NAME, 'membrana_archivarius');
});

test('падение наката: пре-клин + финальный down (стенд не течёт), ошибка проброшена', () => {
  const adapter = fakeAdapter({ failRestore: true });
  assert.throws(() => buildInventoryFromArchive({ archivePath: '/tmp/a.gz', adapter }), /mongorestore упал/u);
  assert.deepEqual(adapter.calls.filter(([v]) => v === 'down').length, 2, 'пре-клин до up и уборка в finally');
});

test('keepUp: true — цель НЕ гасится после прогона (escape-хатч), пре-клин остаётся', () => {
  const ok = fakeAdapter({});
  buildInventoryFromArchive({ archivePath: '/tmp/a.gz', adapter: ok, keepUp: true });
  assert.deepEqual(ok.calls.map((x) => x[0]).filter((v) => v === 'down'), ['down'], 'ровно пре-клин, финального down нет');
  assert.equal(ok.calls[0][0], 'down', 'единственный down — ДО up');

  const bad = fakeAdapter({ failRestore: true });
  assert.throws(() => buildInventoryFromArchive({ archivePath: '/tmp/a.gz', adapter: bad, keepUp: true }));
  assert.equal(bad.calls.filter(([v]) => v === 'down').length, 1, 'и в error-пути цель остаётся для разбора');
});

test('нездоровая цель — прогон не состоялся, накат запрещён, уборка состоялась', () => {
  const adapter = fakeAdapter({ healthy: false });
  assert.throws(() => buildInventoryFromArchive({ archivePath: '/tmp/a.gz', adapter }), /не стала healthy/u);
  assert.equal(adapter.calls.filter(([v]) => v === 'restore').length, 0, 'накат в нездоровую цель запрещён');
  assert.equal(adapter.calls.filter(([v]) => v === 'down').length, 2, 'пре-клин + finally');
});

test('withHashes: false — listing-only: один mongosh, канонизация не оплачивается, inventory честно null', () => {
  const adapter = fakeAdapter({});
  const { inventory, listing } = buildInventoryFromArchive({ archivePath: '/tmp/a.gz', adapter, withHashes: false });
  assert.equal(inventory, null, 'опись без хешей — не «опись с дырками», её нет');
  assert.equal(listing.length, 2);
  assert.equal(adapter.calls.filter(([v]) => v === 'mongosh').length, 1, 'только листинг, ни одного HASH_SCRIPT');
});

test('цель дампа — СВОЙ проект, не цель дрилла: два глагола не сносят друг друга', () => {
  assert.notEqual(DUMP_INVENTORY_PROJECT, TARGET_PROJECT);
  const adapter = fakeAdapter({});
  buildInventoryFromArchive({ archivePath: '/tmp/a.gz', adapter, project: DUMP_INVENTORY_PROJECT, withHashes: false });
  assert.ok(adapter.calls.every(([, p]) => p === DUMP_INVENTORY_PROJECT));
});

test('readProjectInventory: коллекции отсортированы, хеш и инварианты сняты тем же адаптером', () => {
  const adapter = fakeAdapter({ listing: [c('zzz'), c('aaa', { count: 1, indexes: ['_id_', 'b_1', 'a_1'] })] });
  const { inventory } = readProjectInventory({ adapter, project: 'p' });
  assert.deepEqual(inventory.collections.map((x) => x.name), ['aaa', 'zzz']);
  assert.equal(inventory.collections[0].sha256, 'deadbeef');
  assert.deepEqual(inventory.collections[0].invariants.requiredIndexes, ['a_1', 'b_1'], '_id_ не индекс-требование, порядок канонизирован');
});

test('форма скриптов снятия — контракт: листинг фильтрует system.*, хеш сортирует по _id', () => {
  assert.match(INVENTORY_SCRIPT, /system\./u);
  assert.match(INVENTORY_SCRIPT, /sort\(\)/u);
  assert.match(HASH_SCRIPT('spans'), /sort\(\{_id:1\}\)/u);
  assert.match(HASH_SCRIPT('spans'), /relaxed:false/u);
});

test('buildInventory детерминирована и не зависит от порядка входа', () => {
  const inv = (order) => buildInventory(order, () => 'h', invariantsOfCollection);
  assert.deepEqual(inv([c('b'), c('a')]), inv([c('a'), c('b')]));
});
