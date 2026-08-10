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
import { existsSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatRestoreVerdict, verifyRestore } from './lib/mongo-restore-policy.mjs';
// Приборы снятия описи ПЕРЕЕХАЛИ в дом scripts/lib/archive-inventory.mjs (блок b1 спринта
// dump-inventory-from-archive, #1814): дамп — второй потребитель конвейера, а импорт
// скрипт-к-скрипту запрещён (класс #1638/#1681). Дрилл берёт из дома ПРИБОРЫ (константы
// стенда, скрипты, buildInventory, readProjectInventory, dockerAdapter); оркестровка цели
// остаётся здесь — «прогнать restore и сверить предикатом» и «снять опись из архива» суть
// разные леммы (решение держателя b2), их слияние было бы синонимией фасадов.
import {
  COMPOSE_FILE,
  MONGO_SERVICE,
  SOURCE_PROJECT,
  TARGET_PROJECT,
  buildInventory,
  dockerAdapter as libDockerAdapter,
  invariantsOfCollection,
  readProjectInventory,
} from './lib/archive-inventory.mjs';

// Реэкспорты — живые ссылки на дом после переезда (прецедент sprint-cut-check, #1681):
// потребители моста сегодня — зубы этого же скрипта. Мост ВРЕМЕННЫЙ, срок жизни записан
// долгом мостика #drill-reexport-bridge-outlives-sprint: следующий XS — переключение зубов
// на дом и снятие реэкспортов. DB_NAME не реэкспортируется — потребителей у него тут нет.
export { COMPOSE_FILE, MONGO_SERVICE, SOURCE_PROJECT, TARGET_PROJECT, buildInventory, invariantsOfCollection };

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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

/** Адаптер окружения — из дома, с корнем этого дерева. Обёртка однострочная: свои зубы держит дом, здесь проверять нечего. */
export function dockerAdapter() {
  return libDockerAdapter({ repoRoot });
}

/**
 * Прогон целиком. Возвращает вердикт ядра и не решает сам.
 *
 * @param {{adapter: object, archive: string, log?: Function}} input
 */
export function runDrill({ adapter, archive, log = () => {} }) {
  // Обе стороны — ОДНИМ конвейером дома (иначе verifyRestore сравнивал бы описи,
  // собранные по разным правилам). Дрилл берёт каноническую форму, листинг ему не нужен.
  const readSide = (project) => readProjectInventory({ adapter, project }).inventory;

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
