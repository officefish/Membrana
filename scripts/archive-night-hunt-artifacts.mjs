/**
 * Вечерняя архивация night-hunt отчётов → docs/archive/night-hunt/<YYYY-MM-DD>/
 * Исходники в docs/seanses/night-hunt/ не удаляются.
 *
 * ВЕЩДОК ≠ КОПИЯ (вердикт M2 заседания `hunt-and-canon`, 27.08). Прежняя редакция
 * копировала всё подряд и штамповала датированную папку с манифестом — полтора месяца
 * из отчёта, рождённого 12.07. Теперь свежесть источника судит предикат `V(s,d)` по
 * маркеру рождения (`scripts/lib/night-hunt-veracity.mjs`), а не факт наличия файла.
 *
 * Исходы:
 *   0 — вещдоки зачеканены (или --help / --mark-tainted)
 *   3 — НАХОДКА, не поломка: источник протух / без маркера — вещдок не чеканится,
 *       папка не создаётся. Ровно тот случай, ради которого шаг и живёт.
 *   1 — настоящая ошибка инструмента (нет каталога источника, кривой аргумент)
 *
 * Почему 3 — находка, а не провал: шаг СДЕЛАЛ свою работу и ему есть что сказать
 * (`scripts/lib/step-status.mjs`, урок живого прогона 18.07). Провалом он был бы, если
 * бы сломался сам. Ложное «ok» здесь тоже исключено — папки нет, чеканить нечего.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

import {
  classifySources,
  evidenceClassOf,
  localDayKey,
  parseBornAt,
  refusalLine,
  veracity,
} from './lib/night-hunt-veracity.mjs';

const SOURCE_REL = 'docs/seanses/night-hunt';
const ARCHIVE_ROOT = 'docs/archive/night-hunt';

const EXIT_OK = 0;
const EXIT_ERROR = 1;
const EXIT_REFUSED = 3;

/**
 * Последний зачеканенный день архива — нижняя (исключённая) граница окна «с прошлого
 * архива» (#2418). Имя папки и есть дата: каталог архива сам себе указатель, и заводить
 * рядом файл-состояние значило бы завести вторую правду о том же.
 *
 * Архива нет вовсе → `null`, и окно честно падает обратно к суткам: пустой архив не
 * повод вымести в него полтора месяца старых отчётов одним вечером.
 *
 * @param {string} cwd
 * @returns {string|null}
 */
export function lastArchivedDay(cwd) {
  const root = resolve(cwd, ARCHIVE_ROOT);
  if (!existsSync(root)) return null;
  const days = readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/u.test(e.name))
    .map((e) => e.name)
    .sort();
  return days.length === 0 ? null : days[days.length - 1];
}

/** @param {string} content */
function sha256(content) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/** @param {string[]} argv @param {string} flag */
function flagValue(argv, flag) {
  const i = argv.indexOf(flag);
  if (i === -1) return null;
  const v = argv[i + 1];
  return typeof v === 'string' && !v.startsWith('--') ? v : null;
}

/**
 * Пометить УЖЕ наштампованные папки: манифест каждой получает разбор по маркеру
 * рождения. Сами отчёты не трогаются — переписывать архив задним числом запрещено
 * (правило 6 регламента заседания: ретроактивность лжёт об основании). Помечается
 * ПРЕДИКАТОМ, а не диапазоном дат: заседание исходило из 12.08–23.08, но рождение 12.07
 * означает, что копии пошли с 13.07, и честная метка обязана накрыть всё, что протухло.
 *
 * @param {string} cwd
 * @returns {number} exit code
 */
function markExisting(cwd) {
  const root = resolve(cwd, ARCHIVE_ROOT);
  if (!existsSync(root)) {
    console.error(`Нет каталога ${ARCHIVE_ROOT} — метить нечего.`);
    return EXIT_OK;
  }
  const days = readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  let tainted = 0;
  let exhibits = 0;
  const taintedDays = [];

  for (const day of days) {
    const dir = join(root, day);
    const names = readdirSync(dir).filter((f) => f.endsWith('.md'));
    if (names.length === 0) continue;

    const entries = names.map((name) => {
      const content = readFileSync(join(dir, name), 'utf8');
      const parsed = parseBornAt(content);
      const v = veracity({ bornAt: parsed.bornAt, reason: parsed.reason, day });
      return {
        name,
        bornAt: parsed.bornAt,
        contentHash: sha256(content),
        evidenceClass: evidenceClassOf(v),
        verdict: v.reason,
      };
    });

    const dayTainted = entries.filter((e) => e.evidenceClass !== 'exhibit').length;
    tainted += dayTainted;
    exhibits += entries.length - dayTainted;
    if (dayTainted > 0) taintedDays.push(day);

    const manifestPath = join(dir, 'manifest.json');
    /** @type {Record<string, unknown>} */
    let manifest = {};
    if (existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      } catch {
        manifest = {};
      }
    }
    // Прежние поля сохраняем как есть: `archivedAt` был честен — врала папка, не он.
    manifest.day = manifest.day ?? day;
    manifest.files = manifest.files ?? names;
    manifest.entries = entries;
    manifest.evidenceClass =
      dayTainted === 0 ? 'exhibit' : dayTainted === entries.length ? 'copy_not_exhibit' : 'mixed';
    manifest.veritySealedAt = new Date().toISOString();
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  console.error(`Метка достоверности проставлена: ${days.length} папок.`);
  console.error(`  вещдоков: ${exhibits} · копий (не вещдок): ${tainted}`);
  if (taintedDays.length > 0) {
    console.error(`  затронуты дни: ${taintedDays[0]} … ${taintedDays[taintedDays.length - 1]}`);
    console.error('  папки НЕ удаляются: они улика класса, а не мусор.');
  }
  return EXIT_OK;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`Usage: yarn archive:night-hunt [--window-hours N] [--mark-tainted]

Чеканит вещдок из ${SOURCE_REL}/ в ${ARCHIVE_ROOT}/<день РОЖДЕНИЯ отчёта>/.
Вещдок — отчёт, родившийся ПОСЛЕ последней зачеканенной папки и не позже сегодня
(#2418: охота ходит 2–3 раза в неделю, окно суток отказывало каждый вечер).
Архив пуст → окно падает к суткам. Протухший источник — отказ (exit 3), не папка.

  --window-hours N   судить по возрасту в часах (сильнее окна «с прошлого архива»)
  --mark-tainted     разово разобрать УЖЕ существующие папки и проставить им
                     evidenceClass в манифест (сами отчёты не трогаются)`);
    return EXIT_OK;
  }

  const cwd = process.cwd();
  if (argv.includes('--mark-tainted')) return markExisting(cwd);

  const sourceDir = resolve(cwd, SOURCE_REL);
  if (!existsSync(sourceDir)) {
    console.error(`✗ Нет каталога ${SOURCE_REL} — архивировать нечего (ошибка среды, не находка).`);
    return EXIT_ERROR;
  }

  const names = readdirSync(sourceDir).filter((f) => f.endsWith('.md') && f !== 'README.md');
  if (names.length === 0) {
    console.error('✗ ОТКАЗ: в источнике нет ни одного отчёта охоты — чеканить нечего (missing_source).');
    console.error('  что делать: проверить, ходила ли охота; её запуск — вердикт M4 (карточка К4).');
    return EXIT_REFUSED;
  }

  const day = localDayKey(new Date());
  const windowRaw = flagValue(argv, '--window-hours');
  const windowHours = windowRaw === null ? null : Number(windowRaw);
  if (windowRaw !== null && !Number.isFinite(windowHours)) {
    console.error(`✗ --window-hours ждёт число, получено «${windowRaw}».`);
    return EXIT_ERROR;
  }

  const sources = names.map((name) => ({
    name,
    content: readFileSync(join(sourceDir, name), 'utf8'),
  }));

  // #2418: окно «с прошлого архива» вместо суток — охота ходит 2–3 раза в неделю, и
  // требование «родись сегодня» отказывало каждый вечер. Явный --window-hours сильнее.
  const sinceDay = windowRaw === null ? lastArchivedDay(cwd) : null;
  const { exhibits, refused } = classifySources(sources, { day, windowHours, sinceDay });

  if (exhibits.length === 0) {
    const window = sinceDay ? `после ${sinceDay} и по ${day}` : `за ночь ${day}`;
    console.error(`✗ ОТКАЗ: вещдоков ${window} нет — папка НЕ создаётся.`);
    for (const item of refused) console.error(`  · ${refusalLine(item, day)}`);
    console.error('  что делать: это не поломка архиватора, а молчание охоты.');
    console.error('  чинить не здесь: запуск и форма обходчика — вердикт M4 (карточка К4).');
    return EXIT_REFUSED;
  }

  // Папка — по дню РОЖДЕНИЯ вещдока, не по дню архивации (#2418). Прежде оба совпадали
  // по построению окна суток, и поэтому вопрос не стоял; с окном «с прошлого архива»
  // они расходятся, и выбор «сегодняшняя папка» вернул бы ровно ту ложь, ради которой
  // предикат V(s,d) и заводился: имя папки читалось бы как ночь, которой не было.
  const byBornDay = new Map();
  for (const item of exhibits) {
    const bornDay = item.verity.bornDay ?? day;
    if (!byBornDay.has(bornDay)) byBornDay.set(bornDay, []);
    byBornDay.get(bornDay).push(item);
  }

  const archivedAt = new Date().toISOString();
  const runRefused = refused.map((item) => ({
    name: item.name,
    bornAt: item.bornAt,
    verdict: item.verity.reason,
    ageHours: item.verity.ageHours === null ? null : Math.round(item.verity.ageHours),
  }));

  let total = 0;
  for (const [bornDay, items] of [...byBornDay.entries()].sort()) {
    const destDir = resolve(cwd, ARCHIVE_ROOT, bornDay);
    mkdirSync(destDir, { recursive: true });

    const entries = [];
    for (const item of items) {
      writeFileSync(join(destDir, item.name), item.content, 'utf8');
      entries.push({
        name: item.name,
        bornAt: item.bornAt,
        contentHash: sha256(item.content),
        evidenceClass: evidenceClassOf(item.verity),
        verdict: item.verity.reason,
      });
    }

    const manifest = {
      day: bornDay,
      files: entries.map((e) => e.name),
      archivedAt,
      evidenceClass: 'exhibit',
      entries,
      // Провенанс ПРОГОНА, а не свойство дня: кто и каким окном зачеканил эту папку.
      // Поле `refused` переименовано в `runRefused` именно поэтому — прежнее имя рядом
      // с `day` читалось как «в этот день отказано», а отказ принадлежит прогону.
      archivedBy: { runDay: day, sinceDay, windowHours, runRefused },
    };
    writeFileSync(join(destDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.error(`→ ${ARCHIVE_ROOT}/${bornDay}/ — вещдоков: ${entries.length}`);
    total += entries.length;
  }

  console.error(`  всего зачеканено: ${total} в ${byBornDay.size} папк(ах)`);
  if (refused.length > 0) {
    console.error(`  не зачеканено (копия, не вещдок): ${refused.length}`);
    for (const item of refused) console.error(`  · ${refusalLine(item, day)}`);
  }
  return EXIT_OK;
}

process.exit(main());
