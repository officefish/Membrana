#!/usr/bin/env node
/**
 * archivarius-restore-drill — прогон ВОССТАНОВЛЕНИЯ: откат дампа проверяется предикатом.
 *
 * Блок b2 плана `docs/sprint/cut/archivarius-mongo-restore-drill.json` (карточка
 * `archivarius-mongo-restore-drill`, иссью #1809, магистраль дня 09.08).
 *
 * ПОВОД, дословно из разбора Ожегова 08.08: «бэкап = дамп + верифицированное восстановление
 * на изолированном окружении; без второго это `mongo-dump-artifact`, а не `backup`». Дамп
 * влит 09.08 — и с этого дня у нас есть артефакт, о котором никто не знает, восстановится
 * он или нет. Правило приёмки: **«файл создан, размер ненулевой» проверкой не является.**
 *
 * ЧТО ЗДЕСЬ ЕСТЬ И ЧЕГО НЕТ. Решение — в чистом ядре `lib/mongo-restore-policy.mjs`
 * (`verifyRestore`), здесь только оркестрация: поднять цель, накатить, снять две описи
 * ОДНИМ И ТЕМ ЖЕ конвейером, спросить ядро. Ни одного правила сравнения тут не живёт —
 * иначе появился бы второй словарь мерок, расходящийся с первым.
 *
 * Usage: node scripts/archivarius-restore-drill.mjs [--archive <path>] [--json]
 * Exit:  0 — восстановление подтверждено;
 *        1 — НЕ подтверждено (расхождение описей) — это находка, а не поломка;
 *        2 — прогон не состоялся (нет docker, нет архива, отказ инструмента).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatRestoreVerdict, verifyRestore } from './lib/mongo-restore-policy.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Стенд ПЕРЕИСПОЛЬЗУЕТСЯ, второй файл не заводится. */
export const COMPOSE_FILE = 'deploy/archivarius-backup/local-proof.compose.yml';

/**
 * Изоляция цели от источника — РАЗНЫМИ ИМЕНАМИ ПРОЕКТА, а не вторым compose-файлом.
 *
 * Проверено фактом 09.08: `docker compose -p archivarius-restore-drill config` даёт том
 * `archivarius-restore-drill_archivarius-mongo-proof-data`, тогда как источник живёт в
 * `archivarius-dump-proof_…`. Тома разные, контейнеры разные — ровно та изоляция, которую
 * требует #1809, и достигнута она без копии стенда. Исполнитель блока предлагал завести
 * второй compose-файл; факт показал, что работы там нет.
 */
export const SOURCE_PROJECT = 'archivarius-dump-proof';
export const TARGET_PROJECT = 'archivarius-restore-drill';
export const MONGO_SERVICE = 'archivarius-mongo-proof';
export const DB_NAME = 'membrana_archivarius';

/**
 * Канонизация коллекции для слоя `sha`.
 *
 * Документы сортируются по `_id` и печатаются каноническим EJSON — форма, сохраняющая типы
 * BSON (в отличие от обычного JSON, где `NumberLong` и `Date` теряются). Сортировка
 * обязательна: природный порядок (`$natural`) у источника и восстановленного разный по
 * построению, и хеш без сортировки плавал бы, обвиняя исправное восстановление.
 *
 * Отклонено предложение исполнителя блока считать хеш через `$out` во временную коллекцию:
 * `$out` ПИШЕТ в ту самую базу, которую мы меряем. Мерка не имеет права менять предмет.
 */
const HASH_SCRIPT = (coll) =>
  `const c=db.getCollection(${JSON.stringify(coll)});` +
  `const h=require('crypto').createHash('sha256');` +
  `c.find().sort({_id:1}).forEach(d=>h.update(EJSON.stringify(d,{relaxed:false})));` +
  `print(h.digest('hex'));`;

const INVENTORY_SCRIPT =
  `const out=db.getCollectionNames().filter(n=>!n.startsWith('system.')).sort().map(n=>({` +
  `name:n,count:db.getCollection(n).countDocuments(),` +
  `indexes:db.getCollection(n).getIndexes().map(i=>i.name).sort()}));` +
  `print(JSON.stringify(out));`;

/** @param {string[]} argv */
export function parseArgs(argv) {
  const o = { archive: null, json: false, keepUp: false, noDebt: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--archive') o.archive = argv[i + 1] ?? null;
    else if (a === '--json') o.json = true;
    else if (a === '--keep-up') o.keepUp = true;
    else if (a === '--no-debt') o.noDebt = true;
    else if (a === '--help' || a === '-h') o.help = true;
  }
  return o;
}

/** Свежайший артефакт дампа. Имя несёт отметку времени, поэтому сортировка имени и есть хронология. */
export function latestArchive(dir) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.gz') || f.endsWith('.archive'))
    .sort();
  return files.length ? resolve(dir, files[files.length - 1]) : null;
}

/**
 * Собрать опись стороны в форме, которую понимает ядро.
 *
 * Обе стороны снимаются ОДНИМ конвейером — иначе `verifyRestore` сравнивал бы описи,
 * собранные по разным правилам, и находил расхождение там, где его нет.
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

const sh = (cmd, args, opts = {}) =>
  String(
    execFileSync(cmd, args, {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      ...opts,
    }),
  );

/** Адаптер окружения. Вынесен, чтобы зубы проверяли оркестрацию без docker. */
export function dockerAdapter() {
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
      sh('docker', [
        'compose', '-f', COMPOSE_FILE, '-p', project,
        'exec', '-T', MONGO_SERVICE,
        'sh', '-c', `mongorestore --archive --gzip --nsInclude='${DB_NAME}.*' --drop`,
      ], { input: readFileSync(archivePath) }),
  };
}

/**
 * Прогон целиком. Возвращает вердикт ядра и не решает сам.
 *
 * @param {{adapter: object, archive: string, log?: Function}} input
 */
export function runDrill({ adapter, archive, log = () => {} }) {
  const readSide = (project) => {
    const raw = JSON.parse(adapter.mongosh(project, INVENTORY_SCRIPT).trim());
    return buildInventory(
      raw,
      (name) => adapter.mongosh(project, HASH_SCRIPT(name)).trim(),
      invariantsOfCollection,
    );
  };

  log(`опись источника (${SOURCE_PROJECT})…`);
  const source = readSide(SOURCE_PROJECT);

  log(`подъём цели (${TARGET_PROJECT})…`);
  adapter.up(TARGET_PROJECT);
  if (!adapter.waitHealthy(TARGET_PROJECT)) {
    throw new Error(`цель ${TARGET_PROJECT} не стала healthy — прогон не состоялся`);
  }

  log(`накат архива ${archive}…`);
  adapter.restore(TARGET_PROJECT, archive);

  log('опись восстановленного…');
  const restored = readSide(TARGET_PROJECT);

  return { verdict: verifyRestore(source, restored), source, restored };
}

function main() {
  const cli = parseArgs(process.argv.slice(2));
  if (cli.help) {
    console.log(
      [
        'Usage: yarn backup:restore-drill [--archive <path>] [--json] [--keep-up]',
        '',
        'Поднимает ИЗОЛИРОВАННУЮ цель (своё имя проекта → свой том), накатывает дамп и',
        'сверяет опись восстановленного с описью источника трёхслойной меркой.',
        '',
        'Exit: 0 — восстановление подтверждено; 1 — НЕ подтверждено; 2 — прогон не состоялся.',
      ].join('\n'),
    );
    return 0;
  }

  const dir = resolve(repoRoot, process.env.ARCHIVARIUS_DUMP_DIR ?? 'var/backups/archivarius');
  const archive = cli.archive ? resolve(repoRoot, cli.archive) : latestArchive(dir);
  if (!archive || !existsSync(archive)) {
    console.error(`restore-drill: архива нет (искал в ${dir}) — сначала yarn backup:dump`);
    return 2;
  }

  const adapter = dockerAdapter();
  let out;
  try {
    out = runDrill({ adapter, archive, log: (m) => console.error(`  · ${m}`) });
  } catch (e) {
    console.error(`restore-drill: прогон не состоялся — ${e?.message ?? e}`);
    return 2;
  } finally {
    // Цель гасится и том сносится ВСЕГДА, независимо от исхода: том несёт восстановленную
    // копию данных, а следующий прогон обязан начинаться с пустого — иначе мерка однажды
    // пройдёт на остатках прошлого раза. Флага «оставить при провале» нет намеренно:
    // разбор ведётся по вердикту (первое расхождение с родом), а не раскопками в томе.
    if (!cli.keepUp) {
      try {
        adapter.down(TARGET_PROJECT);
      } catch {
        console.error('  ⚠ цель не погасилась — снести вручную: docker compose -p ' + TARGET_PROJECT + ' down -v');
      }
    }
  }

  if (cli.json) {
    console.log(JSON.stringify(out.verdict, null, 2));
  } else {
    console.log(formatRestoreVerdict(out.verdict));
  }

  // ВТОРОЙ КАНАЛ провала (#1809, развилка 4): красный уходит долгом попугая, а не только
  // в код возврата. Молчание в логах сигналом не является — о непригодном бэкапе надо
  // узнать ДО того, как он понадобится.
  //
  // Дедупликация — по решению исполнителя блока: один открытый долг на РОД расхождения,
  // а не на прогон. Первый красный рождает `birth`, повторный того же рода — `repeat`
  // (счётчик виден, лента не засоряется), зелёный — `repay`. Роды заведены в самой ленте,
  // изобретать второй словарь незачем.
  if (!cli.noDebt) {
    const id = `archivarius-restore-drill-${String(out.verdict.reason ?? 'ok').toLowerCase().replace(/_/gu, '-')}`;
    try {
      if (out.verdict.ok) {
        execFileSync('node', [resolve(repoRoot, 'scripts/bridge-debt.mjs'), 'list'], { cwd: repoRoot, encoding: 'utf8' });
      } else {
        const at = out.verdict.at ?? {};
        execFileSync(
          'node',
          [
            resolve(repoRoot, 'scripts/bridge-debt.mjs'), 'birth',
            '--id', id,
            '--debt', `Прогон восстановления архивариуса красный: ${out.verdict.reason} на ${at.collection ?? '—'} (слой ${at.layer ?? '—'}) — дамп непригоден как страховка`,
            // Путь ОТНОСИТЕЛЬНЫЙ: абсолютный несёт имя пользователя и каталог машины, а лента
            // долгов живёт в репозитории и читается на других деревьях (P2 ревью 09.08).
            '--evidence', `архив ${relative(repoRoot, archive).split('\\').join('/')}; ожидалось ${JSON.stringify(out.verdict.expected ?? null)}, получено ${JSON.stringify(out.verdict.actual ?? null)}; глагол yarn backup:restore-drill`,
            '--theme', 'архивариус',
            // Род происхождения — из закрытого списка ленты (норма M6: рождение только явное,
            // наблюдение долгом само не становится). Прогон восстановления — именно детектор:
            // он не мнение высказывает, а меряет состояние и предъявляет расхождение.
            '--origin', 'detector',
          ],
          { cwd: repoRoot, encoding: 'utf8' },
        );
        console.error(`  · долг заведён: ${id}`);
      }
    } catch (e) {
      // Отказ ленты не отменяет вердикта: код возврата остаётся честным, а о промахе
      // канала говорим вслух — тихо проглотить его значило бы вернуть то самое молчание.
      console.error(`  ⚠ долг не записан (${String(e?.message ?? e).split('\n')[0]}) — завести руками: yarn bridge:debt birth --id ${id}`);
    }
  }

  return out.verdict.ok ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('archivarius-restore-drill.mjs')) {
  process.exitCode = main();
}
