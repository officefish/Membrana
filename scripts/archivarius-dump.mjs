#!/usr/bin/env node
/**
 * Дамп тома архивариуса: снятие, опись, ротация.
 *
 * Обёртка тонкая по построению. Все решения — «как назвать», «пригоден ли», «сколько
 * хранить» — задаёт `scripts/lib/mongo-dump-policy.mjs`; здесь только транспорт. Граница
 * названа резчиком при нарезке: политика не знает про пути и хосты, исполнитель не
 * принимает решений.
 *
 * ИМЯ ЧЕСТНОЕ: это ДАМП, не бэкап. Бэкапом пара имеет право называться только вместе с
 * проверкой отката — соседняя карточка `archivarius-mongo-restore-drill` (#1809). Пока она
 * открыта, всё, что даёт этот скрипт, — артефакт, о котором никто не знает, восстановится
 * он или нет. Так и написано в выводе, чтобы никто не прочитал «копия есть» как «мы застрахованы».
 *
 * Разбор Тарасова 08.08 (прогон контекста исполнителя) вошёл сюда четырьмя решениями:
 * однопроходный хеш потоком, манифест раньше переименования, след неудачной попытки вместо
 * тишины, и двухфазная ротация — см. комментарии по месту.
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readdir, readFile, rename, rm, writeFile, appendFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import { join, resolve } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';

import {
  DEFAULT_RETENTION_POLICY,
  MANIFEST_SCHEMA_VERSION,
  formatArtifactName,
  isFitForRetention,
  manifestProblems,
  parseArtifactName,
  planRetention,
} from './lib/mongo-dump-policy.mjs';
// Опись — из СОДЕРЖИМОГО артефакта, конвейером дома (#1814, блок b3): восстановление в
// изолированную цель и чтение той же дисциплиной, что у дрилла. Двух правд об одном
// архиве больше нет — parseDbInventory демонтирован.
import { DB_NAME, DUMP_INVENTORY_PROJECT, buildInventoryFromArchive, dockerAdapter } from './lib/archive-inventory.mjs';

const repoRoot = resolve(import.meta.dirname, '..');

/**
 * Код стопа: стенд описи недоступен → дампа НЕТ (решение резчика 10.08). Мягкий фолбэк на
 * stderr был бы возвратом к двум правдам через чёрный ход; докер и так жёсткая зависимость
 * тракта — сам mongodump ходит через `docker compose exec`.
 */
export const DUMP_INVENTORY_UNAVAILABLE = 'DUMP_INVENTORY_UNAVAILABLE';

/**
 * Маппинг листинга конвейера в форму описи манифеста. `db` — константой дома, не разбором
 * имени коллекции: архив режется `nsInclude DB_NAME.*`, второй источник истины на пустом
 * месте запрещён (решение держателя b3).
 * @param {Array<{name: string, count: number}>} listing
 * @returns {Array<{db: string, collection: string, documentCount: number}>}
 */
export function inventoryFromListing(listing) {
  return (listing ?? []).map((c) => ({ db: DB_NAME, collection: c.name, documentCount: c.count }));
}

/**
 * Настройка из окружения.
 *
 * Ответ на вопрос исполнителя блока: дефолт ретенции живёт в ПОЛИТИКЕ, переопределение —
 * здесь. Читать `process.env` внутри `mongo-dump-policy.mjs` было бы дырой в его чистоте:
 * модуль перестал бы быть проверяемым без подмены окружения, а зубы — детерминированными.
 */
export function resolveConfig(env = process.env) {
  const num = (v, d) => (Number.isFinite(Number(v)) && String(v ?? '').trim() !== '' ? Number(v) : d);
  const tier = DEFAULT_RETENTION_POLICY.tiers[0];
  return {
    dir: resolve(repoRoot, env.ARCHIVARIUS_DUMP_DIR ?? 'var/backups/archivarius'),
    service: env.ARCHIVARIUS_MONGO_SERVICE ?? 'archivarius-mongo',
    composeFiles: (env.ARCHIVARIUS_COMPOSE_FILES ?? 'packages/background-office/docker-compose.yml')
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean),
    sourceHost: env.ARCHIVARIUS_SOURCE_HOST ?? hostname(),
    policy: {
      tiers: [{ maxAgeHours: num(env.ARCHIVARIUS_DUMP_MAX_AGE_HOURS, tier.maxAgeHours), minCount: num(env.ARCHIVARIUS_DUMP_MIN_COUNT, tier.minCount) }],
      hardCap: num(env.ARCHIVARIUS_DUMP_HARD_CAP, DEFAULT_RETENTION_POLICY.hardCap),
      minSizeBytes: num(env.ARCHIVARIUS_DUMP_MIN_SIZE_BYTES, DEFAULT_RETENTION_POLICY.minSizeBytes),
    },
  };
}

const composeArgs = (cfg) => cfg.composeFiles.flatMap((f) => ['-f', f]);

/**
 * Версия сервера из вывода `mongod --version`. Чистая — потому и проверяемая зубом.
 * В имя артефакта она попадает как есть, поэтому `--` в ней запрещены политикой.
 */
export function parseMongodVersion(text) {
  // Дефис в версии допустим (`8.0.0-rc1`) — обрезать его значило бы соврать в манифесте о
  // том, чем снят дамп. Двойной дефис ловит уже политика: он разделитель в имени артефакта.
  const m = /db version v([0-9][0-9A-Za-z.-]*)/u.exec(String(text ?? ''));
  return m ? m[1] : null;
}

// parseDbInventory ДЕМОНТИРОВАН (#1814, b3): опись из stderr была разбором человекочитаемого
// лога чужой утилиты — формат не контракт, зуб вернулся бы на 7.1 (BLOCK Тарасова 08.08).
// Опись теперь снимается из содержимого артефакта (см. inventoryFromListing + дом
// lib/archive-inventory.mjs); от разбора stderr остался только гард протокола ниже.

/**
 * Коллекции, которые mongodump НАЧАЛ писать и не объявил законченными.
 *
 * Четвёртый дефект класса «код утверждает больше, чем знает», названный исполнителем блока
 * до того, как случился: `exitCode === 0` при коллекции, которая начата и не дописана,
 * читается как полный дамп. Разница между «writing X» и «done dumping X» — единственное
 * место, где эта неполнота видна, и молчать о ней нельзя.
 */
export function incompleteCollections(stderr) {
  const started = new Set();
  for (const m of String(stderr ?? '').matchAll(/writing `?([^\s`]+)`? to /gu)) started.add(m[1]);
  for (const m of String(stderr ?? '').matchAll(/done dumping `?([^\s`]+)`?\s+\(/gu)) started.delete(m[1]);
  return [...started].sort();
}

/**
 * Размер словами. Рунбук просит владельца записать эту величину как вещдок — «0.0 МиБ»
 * вместо 48 КиБ превратило бы вещдок в отсутствие вещдока. Поймано первым живым прогоном.
 */
export const humanBytes = (n) => {
  if (!Number.isFinite(n)) return '—';
  if (n < 1024) return `${n} Б`;
  if (n < 1_048_576) return `${(n / 1024).toFixed(1)} КиБ`;
  if (n < 1_073_741_824) return `${(n / 1_048_576).toFixed(1)} МиБ`;
  return `${(n / 1_073_741_824).toFixed(2)} ГиБ`;
};

/** Хвост stderr: без него «файл есть» не отличается от «дамп упал». */
export const tailLines = (text, n = 12) => String(text ?? '').trim().split('\n').slice(-n).join('\n');

/**
 * Сборка манифеста — вынесена чистой функцией нарочно.
 *
 * Это шов между блоками: политика решает, что делает манифест пригодным, исполнитель обязан
 * заполнить ровно это. Пока сборка сидела внутри `dump()`, шов был проверяем только живым
 * докером, то есть на практике не проверяем вовсе — и рассогласование «исполнитель пишет
 * одно, политика ждёт другого» всплыло бы на проде.
 */
export function buildManifest({ startedAt, finishedAt, mongoVersion, sourceHost, exitCode, stderr, sha256, sizeBytes, dbInventory }) {
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    startedAt,
    finishedAt,
    mongoVersion,
    sourceHost,
    mongodumpExitCode: exitCode,
    mongodumpStderrTail: tailLines(stderr),
    // Хешируется gzip-поток целиком — и это сказано полем, а не подразумевается. Ловушка,
    // названная до кода: «просто sha256» рассогласуется молча при первой же смене упаковки.
    sha256,
    sha256Of: 'gzip-stream',
    sizeBytes,
    // Источник описи объявлен ПОЛЕМ, как и субъект хеша. С v2 (#1814 закрыт) источник —
    // содержимое самого артефакта: листинг снят конвейером дома после восстановления в
    // изолированную цель, а не выужен регулярками из лога чужой утилиты. Опись приносит
    // ВЫЗЫВАЮЩИЙ (inventoryFromListing над listing конвейера): сборка манифеста остаётся
    // чистой функцией — шов политика/исполнитель проверяем без докера, как и был.
    inventorySource: 'archive-contents',
    dbInventory: dbInventory ?? [],
    // Гард протокола mongodump (v2 — отдельным полем, не смешивается с описью): «writing X»
    // без парного «done dumping X» — дамп неполон, что бы ни говорил код возврата.
    protocolChecks: { incompleteCollections: incompleteCollections(stderr) },
  };
}

/** Считает байты, не удерживая их: гигабайты идут потоком, а не в память. */
const counting = (state) =>
  new Transform({
    transform(chunk, _enc, cb) {
      state.bytes += chunk.length;
      state.hash.update(chunk);
      cb(null, chunk);
    },
  });

function run(cmd, args, { capture = 'stderr' } = {}) {
  return new Promise((done) => {
    const child = spawn(cmd, args, { stdio: ['ignore', capture === 'stdout' ? 'pipe' : 'ignore', 'pipe'] });
    let err = '';
    let out = '';
    child.stderr.on('data', (d) => (err += d));
    if (child.stdout) child.stdout.on('data', (d) => (out += d));
    child.on('error', (e) => done({ code: 127, stderr: String(e.message), stdout: '' }));
    child.on('close', (code) => done({ code: code ?? 1, stderr: err, stdout: out }));
  });
}

async function dump(cfg, argv) {
  // Каталог может быть непригоден раньше, чем что-либо снято: путь упирается в файл, прав
  // нет, диска нет. Найдено веткой отказа живого прогона — до перехвата здесь падал
  // стектрейс ENOTDIR, то есть на понятную причину отвечали шумом.
  try {
    await mkdir(cfg.dir, { recursive: true });
  } catch (e) {
    console.error(`backup:dump — каталог ${cfg.dir} недоступен (${e?.code ?? e?.message}); ничего не снято`);
    return 1;
  }

  const ver = await run('docker', ['compose', ...composeArgs(cfg), 'exec', '-T', cfg.service, 'mongod', '--version'], { capture: 'stdout' });
  const mongoVersion = parseMongodVersion(ver.stdout) ?? parseMongodVersion(ver.stderr);
  if (!mongoVersion) {
    console.error(`backup:dump — версия Mongo не прочитана, снимать вслепую нельзя:\n${tailLines(ver.stderr)}`);
    return 1;
  }

  const startedAt = new Date().toISOString();
  const tmp = join(cfg.dir, `.in-progress--${startedAt.replace(/[:.]/gu, '')}.archive.gz`);
  const state = { bytes: 0, hash: createHash('sha256') };

  // Однопроходно: тот же поток одновременно считается, хешируется и пишется на диск.
  // Второй проход по многогигабайтному архиву ради sha256 — плата ни за что.
  // Скоуп дампа = скоуп описи = скоуп отката (ревью 10.08): без `--db` mongodump снимал
  // весь инстанс, а опись и nsInclude отката держали только DB_NAME — манифест конструктивно
  // недоописывал артефакт (соседняя база уехала бы в архив невидимой для описи). Три скоупа
  // сведены к одному имени из дома; предмет бэкапа — база архивариуса, не инстанс.
  const child = spawn(
    'docker',
    ['compose', ...composeArgs(cfg), 'exec', '-T', cfg.service, 'sh', '-c', `mongodump --archive --gzip --db ${DB_NAME}`],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let stderr = '';
  child.stderr.on('data', (d) => (stderr += d));

  let transportProblem = null;
  try {
    await pipeline(child.stdout, counting(state), createWriteStream(tmp));
  } catch (e) {
    transportProblem = String(e?.message ?? e);
  }
  const exitCode = await new Promise((r) => child.on('close', (c) => r(c ?? 1)));

  const finishedAt = new Date().toISOString();
  const sha256 = state.hash.digest('hex');

  // Опись — read-back с ЗАКРЫТОГО tmp, до rename (уточнение держателя b3 к инварианту
  // «манифест раньше переименования»): это те же байты, которые атомарный rename получит
  // под финальным именем; описывается файл на диске, а не состояние потока. Читать есть
  // смысл только у состоявшегося дампа — упавший транспорт/ненулевой код описывать нечего,
  // пустая опись честно уронит пригодность ниже.
  let dbInventory = [];
  if (!transportProblem && exitCode === 0) {
    try {
      const { listing } = buildInventoryFromArchive({
        archivePath: tmp,
        adapter: dockerAdapter({ repoRoot }),
        // Своя цель и listing-only (ревью 10.08): дамп не делит проект с --keep-up-сессией
        // дрилла и не платит за канонизацию sha256, которую здесь никто не сравнивает.
        project: DUMP_INVENTORY_PROJECT,
        withHashes: false,
      });
      dbInventory = inventoryFromListing(listing);
    } catch (e) {
      // Стенд описи недоступен → дампа НЕТ (решение резчика: фолбэк на stderr — возврат
      // к двум правдам через чёрный ход). Манифеста нет; байты дампа НЕ прячутся под
      // in-progress-именем (ревью 10.08: невидимый для list/prune полноразмерный файл —
      // течь диска), а получают видимый след partial-- вне схемы имён — как у прочих
      // неудачных попыток: ротация его не тронет, человек увидит.
      console.error(`backup:dump — ${DUMP_INVENTORY_UNAVAILABLE}: опись из артефакта не снята (${String(e?.message ?? e).split('\n')[0]})`);
      const trace = `partial--${startedAt.replace(/[:.]/gu, '')}.archive.gz`;
      try {
        await rename(tmp, join(cfg.dir, trace));
        console.error(`backup:dump — дамп без честной описи не дамп; байты оставлены следом: ${trace}`);
      } catch {
        console.error('backup:dump — дамп без честной описи не дамп; временный файл оставлен как есть');
      }
      return 1;
    }
  }

  const manifest = buildManifest({
    startedAt,
    finishedAt,
    mongoVersion,
    sourceHost: cfg.sourceHost,
    exitCode: transportProblem ? 1 : exitCode,
    stderr: transportProblem ? `${stderr}\n${transportProblem}` : stderr,
    sha256,
    sizeBytes: state.bytes,
    dbInventory,
  });

  const ok = isFitForRetention(manifest, cfg.policy);
  // Неудачная попытка ОСТАВЛЯЕТ след. Имя нарочно вне схемы: `parseArtifactName` его
  // отвергнет, ротация не увидит, а человек увидит — вместе с причиной. «Тихо ничего не
  // случилось» — худший исход из возможных.
  const finalName = ok
    ? formatArtifactName({ startedAt, mongoVersion, sha256 })
    : `partial--${startedAt.replace(/[:.]/gu, '')}.archive.gz`;

  // Манифест ложится РАНЬШЕ переименования: увидев финальное имя, читатель обязан уже иметь
  // возможность прочесть, чем этот файл является. Опись — read-back с закрытого tmp, до
  // rename (см. выше): порядок манифест/rename этим не ломается, существо «опись описывает
  // файл на диске» соблюдено. Крэш между записью манифеста и rename оставляет пару
  // «манифест под финальным именем + tmp» — сироту обязан снести уборщик ротации парой.
  //
  // Отказ записи ловится отдельно и говорит по-человечески. Найдено веткой отказа «каталог
  // только для чтения», названной исполнителем блока local-proof: без этого перехвата скрипт
  // падал стектрейсом ENOENT/EACCES — то есть на непригодные права отвечал бы шумом, а не
  // причиной. Полуфайла под финальным именем при этом не остаётся: переименование не дошло.
  try {
    await writeFile(join(cfg.dir, `${finalName}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    await rename(tmp, join(cfg.dir, finalName));
  } catch (e) {
    console.error(`backup:dump — снято, но не сохранено: ${cfg.dir} недоступен для записи (${e?.code ?? e?.message})`);
    console.error('backup:dump — временный файл оставлен как есть, финального имени он не получил');
    return 1;
  }

  if (!ok) {
    console.error(`backup:dump — снято НЕПРИГОДНОЕ, оставлено следом: ${finalName}`);
    for (const p of manifestProblems(manifest, cfg.policy)) console.error(`  ✖ ${p}`);
    return 1;
  }
  const docs = manifest.dbInventory.reduce((s, e) => s + e.documentCount, 0);
  console.log(`backup:dump — ${finalName} · ${humanBytes(state.bytes)} · ${docs} документов`);
  console.log('backup:dump — это ДАМП, не страховка: откат не проверялся (см. #1809)');
  return argv.includes('--prune') ? prune(cfg, ['--apply']) : 0;
}

/** Журнал сноса. Имя вынесено константой, потому что его знают два места: писатель и фильтр. */
export const PRUNE_LOG = 'prune-log.jsonl';

/**
 * Файл в каталоге — кандидат в артефакты?
 *
 * Отделено чистой функцией после первого живого прогона 08.08. До него `prune-log.jsonl`
 * — журнал, который пишет сам инструмент, — попадал в опись как испорченный артефакт, и
 * следующий `prune --apply` удалил бы собственную запись о сносе. Классический случай:
 * инструмент считал своим предметом всё, что видит, включая себя.
 *
 * Правило нарочно перечисляющее, а не «угадывающее по расширению»: неизвестный файл в
 * каталоге дампов обязан быть ВИДЕН как непригодный, а не тихо отфильтрован.
 */
export const isArtifactCandidate = (name) =>
  typeof name === 'string' &&
  name !== PRUNE_LOG &&
  !name.endsWith('.manifest.json') &&
  !name.startsWith('.in-progress--');

/** Каталог как данные: имя + манифест рядом. Непарные файлы не прячутся, а называются. */
async function readArtifacts(cfg) {
  let names = [];
  try {
    names = await readdir(cfg.dir);
  } catch (e) {
    // «Каталога нет» и «каталог не читается» — разные вещи, и путать их нельзя. Первое
    // честно означает ноль копий. Второе означает, что мы НЕ ЗНАЕМ, сколько их, — и
    // отвечать на это «копий нет» значит выдавать незнание за пустоту. Ровно так молчаливая
    // зелёнка и заводится.
    if (e?.code === 'ENOENT') return { ok: true, artifacts: [], absent: true };
    return { ok: false, problem: `${cfg.dir} не читается (${e?.code ?? e?.message})`, artifacts: [] };
  }
  const out = [];
  for (const name of names) {
    if (!isArtifactCandidate(name)) continue;
    let manifest = null;
    try {
      manifest = JSON.parse(await readFile(join(cfg.dir, `${name}.manifest.json`), 'utf8'));
    } catch {
      manifest = null;
    }
    out.push({ name, manifest });
  }
  return { ok: true, artifacts: out };
}

async function list(cfg) {
  const read = await readArtifacts(cfg);
  if (!read.ok) {
    console.error(`backup:list — ${read.problem}; сколько копий есть, неизвестно`);
    return 1;
  }
  const { artifacts } = read;
  if (artifacts.length === 0) {
    // Разные слова для разных фактов: каталога нет ≠ каталог пуст. Опечатка в пути иначе
    // читается как «копий нет» — самое опасное направление ошибки для этого инструмента.
    console.log(read.absent ? `backup:list — каталога ${cfg.dir} не существует` : `backup:list — в ${cfg.dir} копий нет`);
    return 0;
  }
  for (const a of artifacts.sort((x, y) => x.name.localeCompare(y.name))) {
    const parsed = parseArtifactName(a.name);
    const problems = parsed.ok ? manifestProblems(a.manifest, cfg.policy) : [parsed.problem];
    const size = humanBytes(a.manifest?.sizeBytes);
    console.log(`${problems.length === 0 ? '✔' : '✖'} ${a.name} · ${size}`);
    for (const p of problems) console.log(`    ${p}`);
  }
  console.log('backup:list — пригодность здесь означает «снято и внутренне непротиворечиво», а не «откат сработает» (#1809)');
  return 0;
}

/**
 * Ротация в две фазы: печать плана — всегда, удаление — только по `--apply`.
 *
 * Это первый в доме инструмент, который удаляет данные. Цена одноходового сноса уже
 * оплачена: ADR-0020 и прецедент 06.08 (2152 файла мимо контролируемого сноса). Поэтому
 * план виден до, а не после, и каждое удаление уходит в журнал с причиной.
 */
async function prune(cfg, argv) {
  const read = await readArtifacts(cfg);
  if (!read.ok) {
    console.error(`backup:prune — ${read.problem}; ротация вслепую запрещена`);
    return 1;
  }
  const { artifacts } = read;
  const { keep, drop, reasons } = planRetention({ now: new Date().toISOString(), artifacts, policy: cfg.policy });
  for (const n of [...keep, ...drop].sort()) console.log(`${keep.includes(n) ? 'оставить ' : 'удалить  '} ${n} · ${reasons[n]}`);
  if (!argv.includes('--apply')) {
    console.log(`backup:prune — план: оставить ${keep.length}, удалить ${drop.length}. Удаление — только с --apply`);
    return 0;
  }
  if (keep.length === 0 && drop.length > 0) {
    console.error('backup:prune — план оставляет ноль копий; это не ротация, а потеря. Отказ');
    return 1;
  }
  for (const n of drop) {
    await rm(join(cfg.dir, n), { force: true });
    await rm(join(cfg.dir, `${n}.manifest.json`), { force: true });
    await appendFile(join(cfg.dir, PRUNE_LOG), `${JSON.stringify({ at: new Date().toISOString(), removed: n, reason: reasons[n] })}\n`, 'utf8');
  }
  console.log(`backup:prune — удалено ${drop.length}, оставлено ${keep.length}; каждая причина записана в prune-log.jsonl`);
  return 0;
}

const COMMANDS = { dump, list, prune };

async function main() {
  const [cmd, ...argv] = process.argv.slice(2);
  const handler = COMMANDS[cmd];
  if (!handler) {
    console.error(`archivarius-dump — глагол «${cmd ?? '—'}» не знаю. Есть: ${Object.keys(COMMANDS).join(', ')}`);
    return 2;
  }
  // Каталог создаёт только `dump`. Чтение не должно оставлять следов: пустой каталог,
  // созданный командой `list`, — это уже утверждение о состоянии, которого не было.
  return handler(resolveConfig(), argv);
}

if (pathToFileURL(process.argv[1] ?? '').href === import.meta.url) {
  main().then((code) => process.exit(code ?? 0));
}
