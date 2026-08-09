/**
 * Зубы прогона восстановления (блок b2, карточка archivarius-mongo-restore-drill, #1809).
 *
 * Docker здесь не нужен: адаптер окружения подменяется поддельным, и проверяется ровно
 * ОРКЕСТРАЦИЯ — что обе описи снимаются одним конвейером, что цель поднимается отдельным
 * проектом, что вердикт приходит из ядра, а не выдумывается здесь. Правила сравнения живут
 * в b1 и проверяются там; дублировать их значило бы завести второй словарь мерок.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  COMPOSE_FILE,
  MONGO_SERVICE,
  SOURCE_PROJECT,
  TARGET_PROJECT,
  buildInventory,
  invariantsOfCollection,
  latestArchive,
  parseArgs,
  runDrill,
} from './archivarius-restore-drill.mjs';

const sha = (c) => c.repeat(64);

/**
 * Поддельное окружение: помнит вызовы и отвечает заданными описями.
 * @param {{source: object[], restored: object[], hashes?: Record<string, Record<string,string>>}} data
 */
function fakeAdapter(data) {
  const calls = { up: [], down: [], restored: [], healthy: [] };
  const inventoryOf = (project) => (project === SOURCE_PROJECT ? data.source : data.restored);
  return {
    calls,
    up: (p) => calls.up.push(p),
    down: (p) => calls.down.push(p),
    waitHealthy: (p) => {
      calls.healthy.push(p);
      return data.healthy !== false;
    },
    restore: (p, archive) => calls.restored.push({ project: p, archive }),
    mongosh: (project, script) => {
      if (script.includes('getCollectionNames')) return JSON.stringify(inventoryOf(project));
      const name = /getCollection\("([^"]+)"\)/u.exec(script)?.[1];
      return (data.hashes?.[project]?.[name] ?? sha('a')) + '\n';
    },
  };
}

const c = (name, over = {}) => ({ name, count: 10, indexes: ['_id_', 'sessionId_1'], ...over });

test('happy path: описи сошлись → вердикт ядра ok, цель поднята ОТДЕЛЬНЫМ проектом', () => {
  const adapter = fakeAdapter({ source: [c('runs'), c('spans')], restored: [c('runs'), c('spans')] });
  const out = runDrill({ adapter, archive: '/tmp/a.gz' });

  assert.equal(out.verdict.ok, true);
  assert.deepEqual(adapter.calls.up, [TARGET_PROJECT], 'поднимается только цель — источник уже живёт');
  assert.deepEqual(adapter.calls.restored, [{ project: TARGET_PROJECT, archive: '/tmp/a.gz' }]);
  assert.equal(adapter.calls.up.includes(SOURCE_PROJECT), false, 'источник не трогаем');
});

test('тихая порча: счёт совпал, хеш нет → вердикт НЕ ok, род CONTENT_MISMATCH', () => {
  const adapter = fakeAdapter({
    source: [c('spans')],
    restored: [c('spans')],
    hashes: { [SOURCE_PROJECT]: { spans: sha('a') }, [TARGET_PROJECT]: { spans: sha('b') } },
  });
  const out = runDrill({ adapter, archive: '/tmp/a.gz' });

  assert.equal(out.verdict.ok, false);
  assert.equal(out.verdict.reason, 'CONTENT_MISMATCH');
  assert.equal(out.verdict.at.collection, 'spans');
});

test('пропавшая коллекция после восстановления ловится', () => {
  const adapter = fakeAdapter({ source: [c('runs'), c('spans')], restored: [c('spans')] });
  const out = runDrill({ adapter, archive: '/tmp/a.gz' });
  assert.equal(out.verdict.reason, 'COLLECTION_MISSING');
  assert.equal(out.verdict.at.collection, 'runs');
});

test('потерянный документ ловится счётом', () => {
  const adapter = fakeAdapter({ source: [c('spans')], restored: [c('spans', { count: 9 })] });
  const out = runDrill({ adapter, archive: '/tmp/a.gz' });
  assert.equal(out.verdict.reason, 'COUNT_MISMATCH');
});

test('потерянный индекс ловится инвариантами', () => {
  const adapter = fakeAdapter({ source: [c('spans')], restored: [c('spans', { indexes: ['_id_'] })] });
  const out = runDrill({ adapter, archive: '/tmp/a.gz' });
  assert.equal(out.verdict.reason, 'REQUIRED_INDEX_MISSING');
  assert.equal(out.verdict.expected, 'sessionId_1');
});

test('цель не стала healthy → прогон НЕ СОСТОЯЛСЯ, а не «не подтверждено»', () => {
  // Разница несущая: «восстановление не подтверждено» — суждение о данных, «прогон не
  // состоялся» — отказ инструмента. Смешать их значило бы обвинить бэкап в том, что не
  // поднялся контейнер.
  const adapter = fakeAdapter({ source: [c('spans')], restored: [c('spans')], healthy: false });
  assert.throws(() => runDrill({ adapter, archive: '/tmp/a.gz' }), /не стала healthy/u);
});

test('обе описи снимаются ОДНИМ конвейером — иначе сравнивали бы разное', () => {
  const seen = [];
  const adapter = fakeAdapter({ source: [c('spans')], restored: [c('spans')] });
  const wrapped = { ...adapter, mongosh: (p, s) => { seen.push({ p, kind: s.includes('getCollectionNames') ? 'inventory' : 'hash' }); return adapter.mongosh(p, s); } };
  runDrill({ adapter: wrapped, archive: '/tmp/a.gz' });

  const kinds = (proj) => seen.filter((x) => x.p === proj).map((x) => x.kind);
  assert.deepEqual(kinds(SOURCE_PROJECT), kinds(TARGET_PROJECT), 'у источника и цели одинаковая последовательность запросов');
});

test('инварианты коллекции: служебный индекс _id_ не считается обязательным', () => {
  const inv = invariantsOfCollection({ name: 'spans', indexes: ['_id_', 'b_1', 'a_1'] });
  assert.deepEqual(inv.requiredIndexes, ['a_1', 'b_1'], 'отсортированы, _id_ исключён');
  assert.equal(inv.pkField, '_id');
});

test('опись собирается отсортированной по имени — вход ядра требует порядка', () => {
  const inv = buildInventory([c('spans'), c('runs')], () => sha('a'), invariantsOfCollection);
  assert.deepEqual(inv.collections.map((x) => x.name), ['runs', 'spans']);
  assert.equal(inv.subject, 'collection-bson-sorted-by-id');
});

test('аргументы и выбор свежайшего архива', () => {
  const a = parseArgs(['--archive', 'var/x.gz', '--json', '--keep-up']);
  assert.equal(a.archive, 'var/x.gz');
  assert.equal(a.json, true);
  assert.equal(a.keepUp, true);
  assert.equal(latestArchive('нет-такого-каталога'), null, 'нет каталога — нет архива, а не бросок');
});

test('стенд переиспользуется, а не копируется: один compose-файл, два имени проекта', () => {
  assert.equal(COMPOSE_FILE, 'deploy/archivarius-backup/local-proof.compose.yml');
  assert.notEqual(SOURCE_PROJECT, TARGET_PROJECT, 'разные проекты → разные тома → изоляция');
  assert.equal(MONGO_SERVICE, 'archivarius-mongo-proof');
});
