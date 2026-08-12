import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  PRUNE_LOG,
  buildManifest,
  incompleteCollections,
  isArtifactCandidate,
  inventoryFromListing,
  parseMongodVersion,
  resolveConfig,
  tailLines,
} from './archivarius-dump.mjs';
import { DB_NAME } from './lib/archive-inventory.mjs';
import {
  DEFAULT_RETENTION_POLICY,
  INVENTORY_SOURCES,
  formatArtifactName,
  isFitForRetention,
  manifestProblems,
  parseArtifactName,
} from './lib/mongo-dump-policy.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Докера здесь нет и не будет: зуб, «проверяющий» докер моком докера, проверял бы мок.
// Живой прогон — воспроизводимая команда блока local-proof с записанным вещдоком.
// Здесь проверяется ровно то, что чисто: разбор вывода, шов с политикой, настройка, глаголы.

// Вывод захвачен ДОСЛОВНО из живого прогона стенда 08.08 (mongodump 7.0.39), а не сочинён.
// Первая редакция этих зубов кормилась выдуманным форматом без обратных кавычек — и была
// зелёной, пока манифест первого настоящего дампа не показал db="`membrana_archivarius".
// Зуб, написанный против воображаемого вывода, проверяет воображение.
const STDERR_OK = [
  '2026-08-08T16:59:03.801+0000\twriting `admin.system.version` to `archive on stdout`',
  '2026-08-08T16:59:03.814+0000\tdone dumping `admin.system.version` (1 document)',
  '2026-08-08T16:59:03.814+0000\twriting `membrana_archivarius.spans` to `archive on stdout`',
  '2026-08-08T16:59:03.840+0000\tdone dumping `membrana_archivarius.runs` (1 document)',
  '2026-08-08T16:59:03.935+0000\tdone dumping `membrana_archivarius.spans` (5000 documents)',
].join('\n');

const seam = (over = {}) =>
  buildManifest({
    startedAt: '2026-08-08T16:16:31.042Z',
    finishedAt: '2026-08-08T16:17:03.500Z',
    mongoVersion: '7.0.14',
    sourceHost: 'office-vds',
    exitCode: 0,
    stderr: STDERR_OK,
    sha256: 'a'.repeat(64),
    sizeBytes: 4_194_304,
    // Опись с v2 приносит вызывающий — из конвейера дома, не из stderr.
    dbInventory: inventoryFromListing([{ name: 'runs', count: 1 }, { name: 'spans', count: 5000 }]),
    ...over,
  });

test('версия сервера читается из живой формы вывода mongod --version', () => {
  const real = 'db version v7.0.14\nBuild Info: {\n  "version": "7.0.14"\n}';
  assert.equal(parseMongodVersion(real), '7.0.14');
  assert.equal(parseMongodVersion('mongod --version\ndb version v8.0.0-rc1\n'), '8.0.0-rc1');
});

test('версия не прочиталась — это null, а не догадка: снимать вслепую нельзя', () => {
  for (const bad of ['', null, undefined, 'Cannot connect to Docker daemon', 'version 7']) {
    assert.equal(parseMongodVersion(bad), null, `«${String(bad)}» версией не является`);
  }
});

test('опись — из содержимого артефакта: маппинг листинга конвейера, db константой дома', () => {
  // Разбора stderr больше нет (#1814 закрыт): обратные кавычки mongodump и точки в именах —
  // не наша забота, форма листинга — контракт НАШЕГО скрипта снятия (lib/archive-inventory).
  assert.deepEqual(inventoryFromListing([{ name: 'spans', count: 5000 }, { name: 'runs', count: 1 }]), [
    { db: DB_NAME, collection: 'spans', documentCount: 5000 },
    { db: DB_NAME, collection: 'runs', documentCount: 1 },
  ]);
  assert.deepEqual(inventoryFromListing([]), [], 'пустой листинг — состояние, а не сбой');
  assert.deepEqual(inventoryFromListing(null), [], 'отсутствие листинга не валит маппинг — пригодность судит политика');
});

test('четвёртый дефект: начатая и не дописанная коллекция видна, хотя код возврата нулевой', () => {
  const oborvan = [
    '2026-08-08T16:59:03.801+0000	writing `membrana_archivarius.spans` to `archive on stdout`',
    '2026-08-08T16:59:03.814+0000	writing `membrana_archivarius.runs` to `archive on stdout`',
    '2026-08-08T16:59:03.840+0000	done dumping `membrana_archivarius.runs` (1 document)',
  ].join('\n');
  assert.deepEqual(incompleteCollections(oborvan), ['membrana_archivarius.spans'], 'начата и брошена — это неполный дамп');
  assert.deepEqual(incompleteCollections(STDERR_OK), [], 'полный дамп неполноты не заявляет');

  // Именно тот случай, который выглядит успехом: exit=0, опись непуста, а копия неполна.
  // Гард протокола с v2 живёт отдельным полем — источник описи он не подменяет.
  const m = seam({ stderr: oborvan });
  assert.equal(m.mongodumpExitCode, 0);
  assert.ok(m.dbInventory.length > 0);
  assert.deepEqual(m.protocolChecks.incompleteCollections, ['membrana_archivarius.spans']);
  assert.equal(isFitForRetention(m), false, 'частичная неполнота обязана отбраковывать артефакт');
});

test('источник описи назван полем — с v2 это содержимое артефакта, и только оно', () => {
  assert.equal(seam().inventorySource, 'archive-contents');
  assert.ok(INVENTORY_SOURCES.includes(seam().inventorySource), 'источник вне закрытого списка политика не примет');
  const forged = { ...seam(), inventorySource: 'mongodump-stderr' };
  assert.equal(isFitForRetention(forged), false, 'v2 со stderr-источником — возврат долга, политика отвергает');
});

test('шов исполнителя и политики сходится: собранный манифест политика принимает', () => {
  const m = seam();
  assert.deepEqual(manifestProblems(m, DEFAULT_RETENTION_POLICY), []);
  assert.equal(isFitForRetention(m), true);
  // Имя, построенное из тех же полей, разбирается обратно в них же — рассогласование
  // «исполнитель пишет одно, политика ждёт другого» видно здесь, а не на проде.
  const p = parseArtifactName(formatArtifactName({ startedAt: m.startedAt, mongoVersion: m.mongoVersion, sha256: m.sha256 }));
  assert.equal(p.ok, true);
  assert.equal(p.startedAt, m.startedAt);
  assert.equal(p.shortSha, m.sha256.slice(0, 8));
});

test('упавший mongodump политика отбраковывает — но манифест всё равно собирается', () => {
  // Упавший артефакт в стенд не накатывается — описи нет, и манифест честно несёт пустую:
  // след с причиной, а не тишина и не выдумка из лога.
  const m = seam({ exitCode: 1, stderr: `${STDERR_OK}\nFailed: error dumping metadata: connection refused`, dbInventory: [] });
  assert.equal(isFitForRetention(m), false, 'exitCode≠0 не может считаться копией');
  assert.match(m.mongodumpStderrTail, /connection refused/u, 'причина обязана сохраниться для человека');
  assert.deepEqual(m.dbInventory, [], 'опись упавшего дампа не снимается — пустота названа, не подделана');
});

test('пустой дамп живой базы отличим от полного — иначе «копия есть» ничего не значит', () => {
  const m = seam({ dbInventory: inventoryFromListing([]) });
  assert.deepEqual(m.dbInventory, []);
  assert.equal(isFitForRetention(m), false);
});

test('хвост stderr ограничен и не теряет последние строки — важен конец, а не начало', () => {
  const long = Array.from({ length: 40 }, (_, i) => `строка ${i}`).join('\n');
  const t = tailLines(long, 12);
  assert.equal(t.split('\n').length, 12);
  assert.match(t, /строка 39$/u);
  assert.equal(tailLines(null), '');
});

test('субъект хеша объявлен полем, а не подразумевается упаковкой', () => {
  assert.equal(seam().sha256Of, 'gzip-stream', 'смена упаковки обязана ломать зуб, а не расходиться молча');
});

test('настройка: дефолт ретенции живёт в политике, окружение только переопределяет', () => {
  const bare = resolveConfig({});
  assert.deepEqual(bare.policy.tiers, [...DEFAULT_RETENTION_POLICY.tiers]);
  assert.equal(bare.policy.hardCap, DEFAULT_RETENTION_POLICY.hardCap);
  assert.equal(bare.service, 'archivarius-mongo');
  assert.deepEqual(bare.composeFiles, ['packages/background-office/docker-compose.yml']);

  const over = resolveConfig({ ARCHIVARIUS_DUMP_MIN_COUNT: '3', ARCHIVARIUS_DUMP_HARD_CAP: '5', ARCHIVARIUS_MONGO_SERVICE: 'mongo-alt' });
  assert.equal(over.policy.tiers[0].minCount, 3);
  assert.equal(over.policy.hardCap, 5);
  assert.equal(over.service, 'mongo-alt');
});

test('мусор в окружении не сдвигает политику молча — пустое и нечисловое падают на дефолт', () => {
  for (const v of ['', '   ', 'семь', null, undefined]) {
    assert.equal(
      resolveConfig({ ARCHIVARIUS_DUMP_HARD_CAP: v }).policy.hardCap,
      DEFAULT_RETENTION_POLICY.hardCap,
      `«${String(v)}» не число — политика обязана остаться дефолтной`,
    );
  }
});

test('глаголы заведены и указывают на этот скрипт', () => {
  const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
  for (const [verb, cmd] of [
    ['backup:dump', 'dump'],
    ['backup:list', 'list'],
    ['backup:prune', 'prune'],
  ]) {
    assert.equal(pkg.scripts[verb], `node scripts/archivarius-dump.mjs ${cmd}`, `глагол ${verb} не заведён или ведёт не туда`);
  }
});

test('инструмент не считает своим предметом собственный журнал сноса', () => {
  // Найдено первым живым прогоном: prune-log.jsonl попадал в опись как испорченный
  // артефакт, и следующий `prune --apply` удалил бы собственную запись о сносе.
  assert.equal(isArtifactCandidate(PRUNE_LOG), false, 'журнал сноса артефактом не является');
  assert.equal(isArtifactCandidate('mongo-dump--20260808T170058956Z--7.0.39--1d1192d7.archive.gz.manifest.json'), false);
  assert.equal(isArtifactCandidate('.in-progress--20260808T170058956Z.archive.gz'), false, 'незавершённый дамп ротации не виден');
  assert.equal(isArtifactCandidate('mongo-dump--20260808T170058956Z--7.0.39--1d1192d7.archive.gz'), true);
  // Посторонний файл остаётся ВИДЕН как непригодный — фильтр перечисляет, а не угадывает.
  assert.equal(isArtifactCandidate('посторонний.tar.gz'), true, 'тихо отфильтрованный чужак — это невидимая проблема');
});

test('каталог дампов не уезжает в репозиторий', () => {
  const ignore = readFileSync(resolve(repoRoot, '.gitignore'), 'utf8');
  const dirFromConfig = resolveConfig({}).dir.replaceAll('\\', '/');
  assert.match(dirFromConfig, /var\/backups\/archivarius$/u, 'дефолтный каталог сменился — правило игнора обязано ехать следом');
  assert.match(ignore, /^var\/backups\//mu, 'копии базы в индексе — это утечка данных, а не неаккуратность');
});
