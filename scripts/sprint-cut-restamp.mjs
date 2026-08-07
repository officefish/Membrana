#!/usr/bin/env node
/**
 * Одноразовый перенос дайджестов нарезки: `node scripts/sprint-cut-restamp.mjs [--execute]`
 * (долг `#plan-comment-keys-outside-digest`, строка 6 десятки 06.08 / строка 5 десятки 07.08).
 *
 * `canonicalJson` перестал выбрасывать `//`-ключи из дайджеста — без переноса каждый план
 * с такими ключами разом стал бы `plan_unratified`. Правила переноса и его границы —
 * в `lib/sprint-cut/restamp.mjs`; здесь ФС, вывод и код возврата.
 *
 * По умолчанию DRY-RUN: ничего не пишет, печатает такт. Запись — только `--execute`.
 *
 * Режимы:
 *   --execute        записать (без флага — сухой прогон)
 *   --dir <path>     каталог планов; по умолчанию `docs/sprint/cut`
 *
 * Фикстуры зубов переносятся ОТДЕЛЬНЫМ прогоном `--dir docs/sprint/cut/fixtures`, и там
 * exit 1 — ОЖИДАЕМЫЙ исход, а не поломка: `plan.plan-unratified.json` по замыслу несёт
 * неверный дайджест («тело правили после согласия»), и отказ ей — доказательство, что
 * миграция сломанное согласие не отмывает. Исключения по имени файла здесь нет намеренно:
 * правило одно для живых планов и для фикстур.
 *
 * Exit: 0 — перенос состоялся (или dry-run отработал); 1 — есть план, чей дайджест не
 * сошёлся ни по старому правилу, ни по новому (тело правили после согласия — читать
 * глазами, миграция такое не отмывает); 2 — инструментальная ошибка.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { planRatified } from './lib/sprint-cut/ratification.mjs';
import { restampPlan } from './lib/sprint-cut/restamp.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_CUT_DIR = 'docs/sprint/cut';

/** @param {string[]} argv */
export function parseRestampArgs(argv) {
  const out = { execute: false, dir: DEFAULT_CUT_DIR };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--execute') out.execute = true;
    else if (a === '--dir') {
      const next = argv[++i];
      if (!next) throw new Error('--dir требует путь');
      out.dir = next;
    } else throw new Error(`неизвестный аргумент «${a}»`);
  }
  return out;
}

/**
 * Планы одного каталога, без спуска вглубь: `fixtures/` — вход зубов, он переносится
 * отдельным прогоном (см. докблок), чтобы его ожидаемый отказ не смешивался с живым.
 * @param {string} dir
 * @returns {string[]}
 */
function planFiles(dir) {
  // `withFileTypes` — чтобы каталог с именем на `.json` не уехал в список планов молча
  // и не свалил прогон на `readFileSync` от каталога.
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.json'))
    .map((e) => e.name)
    .sort();
}

function main(argv) {
  const { execute, dir } = parseRestampArgs(argv);
  const CUT_DIR = resolve(repoRoot, dir);
  console.log(`sprint:cut:restamp ${execute ? '[EXECUTE]' : '[DRY-RUN]'} — ${dir}`);

  const files = planFiles(CUT_DIR);
  const restamped = [];
  const already = [];
  const refused = [];
  let blocksTotal = 0;

  for (const file of files) {
    const path = resolve(CUT_DIR, file);
    let plan;
    try {
      plan = JSON.parse(readFileSync(path, 'utf8'));
    } catch (err) {
      refused.push([file, `нечитаемый JSON: ${err instanceof Error ? err.message : String(err)}`]);
      continue;
    }

    const res = restampPlan(plan);
    if (res.action === 'restamped') {
      restamped.push([file, res.blocksRestamped]);
      blocksTotal += res.blocksRestamped;
      if (execute) {
        writeFileSync(path, `${JSON.stringify(res.plan, null, 2)}\n`, 'utf8');
        // Пост-проверка на КАЖДОМ файле, а не в конце: перенос, оставивший план
        // неретифицированным, — это тот же ложный красный, ради предотвращения
        // которого миграция и существует.
        const back = JSON.parse(readFileSync(path, 'utf8'));
        if (!planRatified(back)) {
          console.error(`  ✗ ${file}: после записи planRatified=false — перенос не достиг цели`);
          return 2;
        }
      }
      continue;
    }
    if (res.reason === 'дайджест уже по новому правилу') already.push(file);
    else refused.push([file, res.reason]);
  }

  console.log(`  планов: ${files.length}`);
  console.log(`  перештамповано: ${restamped.length} (блоков с новым revisionOf: ${blocksTotal})`);
  console.log(`  уже по новому правилу: ${already.length}`);
  console.log(`  отказано: ${refused.length}`);

  for (const [file, blocks] of restamped) {
    console.log(`  restamp ${file}${blocks ? ` — блоков: ${blocks}` : ''}`);
  }
  for (const [file, reason] of refused) {
    console.log(`  ОТКАЗ   ${file} — ${reason}`);
  }

  if (!execute) {
    console.log('\nНичего не записано. Выполнить: node scripts/sprint-cut-restamp.mjs --execute');
  }

  // Отказ по «не сходится ни по старому, ни по новому» — красный: читать глазами.
  const dirty = refused.filter(([, reason]) => reason.startsWith('дайджест не сходится'));
  if (dirty.length > 0) {
    console.log(`\n⚠ ${dirty.length} план(ов) с телом, правленным после согласия — перенос им запрещён.`);
    return 1;
  }
  return 0;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (err) {
    console.error(`sprint:cut:restamp — ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  }
}
