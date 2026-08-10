#!/usr/bin/env node
/**
 * vitest-gate — мердж-гейт корпуса vitest: гоняет затронутое и ЯВНО называет непрогнанное
 * (блок b3 спринта `vitest-two-tier-gate`, карточка `cg2-two-tier-test-gate`).
 *
 * ВТОРАЯ СЛОВАРНАЯ СТАТЬЯ. `yarn tests:gate` — гейт корпуса **scripts** (ADR-0018,
 * `tests-container.mjs`). Здесь — корпус **vitest** (`packages/*`, `apps/*`). Имена не
 * пересекаются нарочно: омоним «test gate» уже стоил одного разбора.
 *
 * ЧТО ЗДЕСЬ И ЧЕГО ЗДЕСЬ НЕТ. Решение «что гонять» целиком в чистом ядре
 * `lib/vitest-gate-scope.mjs`; открытие пакетов — в `lib/vitest-workspace.mjs`. Здесь
 * только грязное: git, turbo, переменные окружения, код возврата.
 *
 * ОТЧЁТ «ЧТО НЕ ГОНЯЛОСЬ» СЧИТАЕТСЯ ОТ ФАКТА. Список прогнанного берётся у самого turbo
 * (`--dry=json`), а не из плана: план и факт расходятся ровно там, где отчёт нужнее всего.
 * Без отчёта выборочный гейт нелегален (ADR-0018, «обязательное условие честности»):
 * 26.07 нашлось, что 11 тестов в `scripts/lib/**` (81 проверка) молчали недели, а зелёный
 * выглядел полным.
 *
 * Использование:
 *   node scripts/vitest-gate.mjs                       # база origin/main
 *   node scripts/vitest-gate.mjs --base <ref>
 *   node scripts/vitest-gate.mjs --changed a.ts,b.md   # список значением (для проверки)
 *   node scripts/vitest-gate.mjs --list                # только план и отчёт, без прогона
 *
 * Exit: 0 — тесты прошли · 1 — тесты упали · 2 — ошибка входа (гейт НЕ состоялся).
 * Слить 1 и 2 нельзя: «проверка сказала нет» и «проверки не было» — разные новости.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatNotRunReport, notRunPackages, planVitestGate } from './lib/vitest-gate-scope.mjs';
import { CATALOG_REL, computeSelection } from './lib/vitest-workspace.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const yarnBin = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';

/** Куда отступать, когда названная база не разрешается (первый пуш ветки, мелкая выкачка). */
const FALLBACK_BASE = 'origin/main';

function parse(argv) {
  const out = { base: 'origin/main', changed: null, list: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--base') out.base = argv[(i += 1)];
    else if (a === '--changed') out.changed = argv[(i += 1)].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--list') out.list = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`vitest-gate: неизвестный аргумент «${a}»`);
  }
  return out;
}

/**
 * Изменённые файлы против базы. Через `merge-base`, а не `git diff base HEAD`: второе
 * покажет ещё и то, что base ушёл вперёд, и раздует скоуп чужой работой.
 */
function changedFromGit(base) {
  const git = (args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
  const resolve1 = (ref) => {
    try {
      return git(['merge-base', ref, 'HEAD']);
    } catch {
      return null;
    }
  };
  // Нулевой SHA — это `github.event.before` на ПЕРВОМ пуше ветки: «предыдущего состояния
  // не было». Не ошибка входа и не «изменений нет»; отступаем на ствол и говорим об этом.
  const zero = /^0{7,40}$/u.test(String(base));
  let mergeBase = zero ? null : resolve1(base);
  if (!mergeBase) {
    mergeBase = resolve1(FALLBACK_BASE);
    if (!mergeBase) {
      throw new Error(`ни «${base}», ни «${FALLBACK_BASE}» не разрешаются — гейт НЕ состоялся, а не «изменений нет»`);
    }
    console.error(`vitest-gate: база «${base}» не разрешилась — считаю от ${FALLBACK_BASE}`);
  }
  return git(['diff', '--name-only', mergeBase, 'HEAD']).split('\n').filter(Boolean);
}

/** Что turbo РЕАЛЬНО возьмёт в работу при этих фильтрах. */
function turboWillRun(filters) {
  const args = ['turbo', 'run', 'test', ...filters, '--dry=json'];
  const res = spawnSync(yarnBin, args, { cwd: repoRoot, encoding: 'utf8', shell: process.platform === 'win32' });
  if (res.status !== 0) {
    throw new Error(`turbo --dry не ответил (${res.status}): ${(res.stderr ?? '').slice(0, 400)}`);
  }
  const text = res.stdout ?? '';
  const start = text.indexOf('{');
  if (start === -1) throw new Error('turbo --dry вернул не JSON — план прогона неизвестен');
  let dry;
  try {
    dry = JSON.parse(text.slice(start));
  } catch {
    throw new Error('turbo --dry вернул неразбираемый JSON — план прогона неизвестен');
  }
  if (Array.isArray(dry.packages)) return dry.packages;
  // Фолбэк обязан отобрать задачу `test`. Без отбора в «прогнано» попадут пакеты, которые
  // turbo взял лишь ради зависимости `^build`: замер 10.08 на `...@membrana/detector-base`
  // дал `packages` = 12 против 27 уникальных `tasks[].package`. Сегодня ветка мёртвая
  // (turbo 2.9.12 отдаёт `packages`), но в день её оживания отчёт честности завысил бы
  // прогон вдвое — то есть соврал бы ровно в ту сторону, против которой написан.
  if (Array.isArray(dry.tasks)) {
    return [...new Set(dry.tasks.filter((t) => t.task === 'test').map((t) => t.package).filter(Boolean))];
  }
  throw new Error('в ответе turbo --dry нет ни packages, ни tasks');
}

function emit(report) {
  console.log(report);
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (!summary) return;
  appendFileSync(summary, `### vitest merge gate\n\n\`\`\`\n${report}\n\`\`\`\n`, 'utf8');
}

function main() {
  let cli;
  try {
    cli = parse(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 2;
    return;
  }
  if (cli.help) {
    console.log('Usage: node scripts/vitest-gate.mjs [--base <ref>] [--changed a,b] [--list]');
    return;
  }

  const catalogPath = join(repoRoot, CATALOG_REL);
  if (!existsSync(catalogPath)) {
    console.error(`vitest-gate: нет ${CATALOG_REL} — «yarn vitest:smoke-list --write». Гейт НЕ состоялся`);
    process.exitCode = 2;
    return;
  }

  let catalog;
  let workspace;
  let changedFiles;
  try {
    catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    workspace = computeSelection(repoRoot);
    if (!workspace.ok) throw new Error(workspace.problems.join('; '));
    changedFiles = cli.changed ?? changedFromGit(cli.base);
  } catch (e) {
    console.error(`vitest-gate: ${e.message}`);
    process.exitCode = 2;
    return;
  }

  const corpus = workspace.selection.corpus;
  const plan = planVitestGate({ changedFiles, packages: workspace.packages, smoke: catalog.smoke });

  // Пустой список фильтров turbo читает как «гонять всё», и отчёт вышел бы с шапкой
  // «mode=floor · прогнано 40 из 38» — враньё в сторону, обратную обычной. Останавливаемся.
  if (plan.runsEverything) {
    console.error(
      `vitest-gate: ярус smoke пуст и затронутых пакетов нет — фильтров ноль, turbo прогнал бы ВЕСЬ корпус ` +
        `под видом выборки. Гейт НЕ состоялся: проверьте ${CATALOG_REL} («yarn vitest:smoke-list --write»)`,
    );
    process.exitCode = 2;
    return;
  }

  let ran;
  try {
    ran = plan.mode === 'full' ? corpus : turboWillRun(plan.filters);
  } catch (e) {
    console.error(`vitest-gate: ${e.message}`);
    process.exitCode = 2;
    return;
  }

  emit(
    formatNotRunReport({
      mode: plan.mode,
      reason: plan.reason,
      ran,
      notRun: notRunPackages(corpus, ran),
      corpusSize: corpus.length,
    }),
  );

  if (cli.list) return;

  const args = ['turbo', 'run', 'test', ...plan.filters, '--continue'];
  const run = spawnSync(yarnBin, args, { cwd: repoRoot, stdio: 'inherit', shell: process.platform === 'win32' });
  // `status === null` — процесс не завершился сам: не запустился либо убит сигналом.
  // Это «проверки не было» (код 2), а не «проверка сказала нет» (код 1); шапка файла
  // запрещает сливать эти два, и молчаливая единица здесь была бы ровно тем сливом.
  if (run.status === null) {
    console.error(`vitest-gate: прогон не состоялся — ${run.error?.message ?? `убит сигналом ${run.signal}`}`);
    process.exitCode = 2;
    return;
  }
  process.exitCode = run.status === 0 ? 0 : 1;
}

if (process.argv[1]?.endsWith('vitest-gate.mjs')) main();
