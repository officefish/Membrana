/**
 * archive-inventory — единственная правда «опись-из-артефакта» (иссью #1814, блок b1
 * спринта `dump-inventory-from-archive`; решение резчика 10.08: дом общего конвейера).
 *
 * До этого дома конвейер жил внутри скрипта `archivarius-restore-drill.mjs`, и второй
 * потребитель (дамп) мог получить его только импортом скрипт-к-скрипту — «тайное API»
 * (класс #1638/#1681). Здесь живут стенд, скрипты снятия, каноническая форма описи и
 * оркестрация «поднять цель → накатить архив → прочитать → погасить». Оба скрипта —
 * дрилл и дамп — потребляют ЭТОТ дом; правило иссью: чтение содержимого архива и есть
 * восстановление, и делаться оно обязано одним конвейером, иначе две правды.
 *
 * Дисциплина описи неизменна: subject `collection-bson-sorted-by-id`, source
 * `archive-contents` — тот самый fence, под который написано ядро сравнения
 * `lib/mongo-restore-policy.mjs` (ядро сравнения сюда НЕ переезжает — оно не про архив).
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

/** Стенд ПЕРЕИСПОЛЬЗУЕТСЯ (решение исполнителя #1809: изоляция именем проекта, не копией файла). */
export const COMPOSE_FILE = 'deploy/archivarius-backup/local-proof.compose.yml';
export const SOURCE_PROJECT = 'archivarius-dump-proof';
export const TARGET_PROJECT = 'archivarius-restore-drill';
export const MONGO_SERVICE = 'archivarius-mongo-proof';
export const DB_NAME = 'membrana_archivarius';

/**
 * Канонизация коллекции для слоя `sha`: документы сортируются по `_id` и печатаются
 * каноническим EJSON (типы BSON сохраняются). Сортировка обязательна — природный порядок
 * у источника и восстановленного разный по построению, хеш без неё обвинял бы исправное
 * восстановление. Текст скрипта — ДОСЛОВНО из дрилла (живой прогон #1809 09.08): при
 * переезде в дом не изменён ни символ, дрейф формы ловится байтовым равенством описи.
 * Отклонено (решение исполнителя #1809): хеш через `$out` — мерка не имеет права менять
 * предмет.
 * @param {string} coll
 */
export const HASH_SCRIPT = (coll) =>
  `const c=db.getCollection(${JSON.stringify(coll)});` +
  `const h=require('crypto').createHash('sha256');` +
  `c.find().sort({_id:1}).forEach(d=>h.update(EJSON.stringify(d,{relaxed:false})));` +
  `print(h.digest('hex'));`;

/** Листинг коллекций БЕЗ системных: имя, счётчик, индексы. Форма листинга — наш контракт. */
export const INVENTORY_SCRIPT =
  `const out=db.getCollectionNames().filter(n=>!n.startsWith('system.')).sort().map(n=>({` +
  `name:n,count:db.getCollection(n).countDocuments(),` +
  `indexes:db.getCollection(n).getIndexes().map(i=>i.name).sort()}));` +
  `print(JSON.stringify(out));`;

/**
 * Опись стороны в форме, которую понимает ядро сравнения. Обе стороны любого сравнения
 * снимаются ЭТИМ конвейером — иначе расхождение находится там, где его нет.
 */
export function buildInventory(rawCollections, hashOf, invariantsOf) {
  return {
    subject: 'collection-bson-sorted-by-id',
    source: 'archive-contents',
    takenAt: 0,
    collections: [...rawCollections]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({
        name: c.name,
        count: c.count,
        sha256: hashOf(c.name),
        invariants: invariantsOf(c),
      })),
  };
}

/** Инварианты коллекции: версия схемы, поле ключа, обязательные индексы. */
export function invariantsOfCollection(c) {
  return {
    schemaVersion: 1,
    pkField: '_id',
    requiredIndexes: (c.indexes ?? []).filter((i) => i !== '_id_').sort(),
    extras: {},
  };
}

/**
 * Опись проекта (бывший `readSide` дрилла): листинг + канонизация одним заходом.
 * @param {{adapter: {mongosh: Function}, project: string}} input
 * @returns {{inventory: object, listing: Array<{name: string, count: number, indexes: string[]}>}}
 */
export function readProjectInventory({ adapter, project }) {
  const listing = JSON.parse(String(adapter.mongosh(project, INVENTORY_SCRIPT)).trim());
  const inventory = buildInventory(
    listing,
    (name) => String(adapter.mongosh(project, HASH_SCRIPT(name))).trim(),
    invariantsOfCollection,
  );
  return { inventory, listing };
}

/**
 * Опись ИЗ АРТЕФАКТА: поднять изолированную цель, накатить архив, прочитать, погасить.
 *
 * `keepUp` — явный escape-хатч (решение держателя b1): инвариант «стенд не течёт между
 * прогонами» дороже удобства разбора, поэтому `down` идёт в finally; при `keepUp: true`
 * down не зовётся ни в happy-, ни в error-пути — разбор руками через
 * `docker compose -p <project> …`. Ошибка наката НЕ глотается: пробрасывается после down.
 *
 * Возврат — обе формы (решение держателя): `inventory` стабильна по контракту дома,
 * `listing` — сырьё под маппинг потребителя (манифест дампа знает свою схему сам,
 * знание о ней сюда не затекает).
 *
 * @param {{archivePath: string, adapter: object, project?: string, keepUp?: boolean}} input
 * @returns {{inventory: object, listing: object[]}}
 */
export function buildInventoryFromArchive({ archivePath, adapter, project = TARGET_PROJECT, keepUp = false }) {
  adapter.up(project);
  try {
    if (!adapter.waitHealthy(project)) {
      throw new Error(`цель ${project} не стала healthy — опись из артефакта не снята`);
    }
    adapter.restore(project, archivePath);
    return readProjectInventory({ adapter, project });
  } finally {
    if (!keepUp) adapter.down(project);
  }
}

/**
 * Адаптер окружения (docker). Вынесен, чтобы зубы проверяли оркестрацию без докера —
 * потребители инъектируют fake-адаптер той же формы.
 * @param {{repoRoot: string}} input
 */
export function dockerAdapter({ repoRoot }) {
  const sh = (cmd, args, opts = {}) =>
    String(execFileSync(cmd, args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts }));
  const compose = (project, args) => sh('docker', ['compose', '-f', COMPOSE_FILE, '-p', project, ...args]);
  return {
    up: (project) => compose(project, ['up', '-d', MONGO_SERVICE]),
    down: (project) => compose(project, ['down', '-v']),
    waitHealthy: (project) => {
      // Healthcheck объявлен в стенде; ждём его, а не «sleep на всякий случай».
      for (let i = 0; i < 60; i += 1) {
        const out = compose(project, ['ps', '--format', '{{.Health}}']).trim();
        if (out.includes('healthy')) return true;
        try {
          execFileSync('node', ['-e', 'Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,2000)']);
        } catch {
          /* пауза не критична */
        }
      }
      return false;
    },
    mongosh: (project, script) =>
      compose(project, ['exec', '-T', MONGO_SERVICE, 'mongosh', '--quiet', DB_NAME, '--eval', script]),
    restore: (project, archivePath) =>
      sh(
        'docker',
        ['compose', '-f', COMPOSE_FILE, '-p', project, 'exec', '-T', MONGO_SERVICE, 'sh', '-c', `mongorestore --archive --gzip --nsInclude='${DB_NAME}.*' --drop`],
        { input: readFileSync(archivePath) },
      ),
  };
}
