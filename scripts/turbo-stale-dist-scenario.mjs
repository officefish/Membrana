#!/usr/bin/env node
/**
 * Зуб-сценарий «кеш turbo возвращает старый dist» (#2525, спринт stale-dist-turbo-cache-2525, блок b1).
 *
 * ЧТО ВОСПРОИЗВОДИТ (замеры E5.0–E5.3 фазы 1, 02.10, ствол 75668adb):
 *   1. честная сборка пакета в ИЗОЛИРОВАННОМ кеше turbo;
 *   2. в `src/index.ts` появляется новый экспорт, но mtime файла СТАРШЕ `.tsbuildinfo`
 *      (так на диске выглядит манифест, вернувшийся из replay поверх новых исходников);
 *   3. `turbo run build` — промах кеша (хеш честно сменился). Ствол: `tsc -b` верит mtime,
 *      эмита нет, в кеш ложится dist БЕЗ экспорта — запись отравлена. Ветка: `tsc -p tsconfig.json`
 *      сверяет содержимое (перерезка 02.10: `tsc -b --force` в пакетах с `references` пересобирал
 *      соседей и устроил гонку записи dist в CI) — dist с экспортом;
 *   4. `tsc -b --force` руками → экспорт в dist есть; следующий `turbo run build` — попадание,
 *      replay. Ствол возвращает отраву (экспорта снова нет), ветка — честный dist.
 *
 * ГРАНИЦЫ. Кеш — только `TURBO_CACHE_DIR` во временном каталоге: общий кеш деревьев
 * (turbo 2.9 «shared worktree cache» в git common dir) не читается и не пишется. Пакет с
 * незакоммиченными правками в `src/` — ОТКАЗ до любого шага (условие резчика). Исходник
 * возвращается `git checkout --`, dist пересобирается честно в любом исходе (finally).
 *
 * Usage:
 *   node scripts/turbo-stale-dist-scenario.mjs [--package @membrana/plugin-contracts]
 *
 * Exit: 0 — ЧИСТО; 1 — ОТРАВЛЕНО; 2 — отказ/инструментальная ошибка.
 *
 * Чистые предикаты экспортируются для зуба `scripts/build-scripts-tsbuildinfo-trust.test.mjs`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Маркер, который сценарий дописывает в исходник. Имя нарочно нестандартное — в живом коде его нет. */
export const SENTINEL = 'STALE_DIST_SCENARIO_2525';

/** Исходы зуба — закрытый список из двух; третьего («не знаю») у сценария нет: любой сбой — отказ с причиной. */
export const VERDICTS = Object.freeze({ POISONED: 'ОТРАВЛЕНО', CLEAN: 'ЧИСТО' });

/**
 * Скрипт сборки доверяет `.tsbuildinfo`: зовёт `tsc -b` без `--force`.
 * `tsc -b` решает «пересобирать ли» по mtime манифеста против исходников (E2) и на dist не
 * смотрит (E7). `--force` отключает этот суд, но заодно принудительно пересобирает проекты из
 * `references` — в параллельном turbo это гонка записи чужого dist (CI 02.10, перерезка). Честная
 * форма сборки пакета — `tsc -p tsconfig.json`: сверяет содержимое (E8), соседей не трогает.
 * @param {unknown} script значение `scripts.build`
 */
export function buildScriptTrustsTsbuildinfo(script) {
  if (typeof script !== 'string') return false;
  return /(^|[\s&;|])tsc -b(?![\w-])(?![^&;|]*--force)/u.test(script);
}

/**
 * Находки по сборкам пакетов: кто ещё зовёт `tsc -b` без `--force`.
 * @param {Array<{path: string, build: unknown}>} packages
 * @returns {Array<{path: string, build: string}>}
 */
export function trustingBuildScripts(packages) {
  return packages
    .filter((p) => buildScriptTrustsTsbuildinfo(p.build))
    .map((p) => ({ path: p.path, build: String(p.build) }));
}

/**
 * `.tsbuildinfo` остаётся выходом задачи build (развилка 2 нарезки, умолчание владельца):
 * манифест — предмет зуба свежести b2; E7 показал, что его удаление петлю не рвёт.
 * @param {unknown} turboJson
 */
export function turboBuildKeepsManifest(turboJson) {
  const outputs = turboJson?.tasks?.build?.outputs;
  return Array.isArray(outputs) && outputs.includes('.tsbuildinfo');
}

/**
 * Вердикт по двум наблюдениям: есть ли экспорт в dist после промаха и после replay.
 * @param {{afterMiss: boolean, afterReplay: boolean}} seen
 */
export function judgeScenario({ afterMiss, afterReplay }) {
  if (!afterMiss) {
    return {
      verdict: VERDICTS.POISONED,
      reason: 'промах кеша не дал эмита: tsc -b поверил mtime манифеста, в кеш легла запись «новые входы → старый dist»',
    };
  }
  if (!afterReplay) {
    return { verdict: VERDICTS.POISONED, reason: 'replay вернул dist без экспорта поверх честной сборки' };
  }
  return { verdict: VERDICTS.CLEAN, reason: 'промах кеша — полный эмит; replay возвращает честный dist' };
}

const yarnBin = () => (process.platform === 'win32' ? 'yarn.cmd' : 'yarn');
const tscBin = () => join(REPO_ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    ...opts,
  });
}

/** Каталог пакета по имени — через отслеживаемые git `package.json` (без чтения node_modules). */
export function findPackageDir(name, io = { listFiles: () => run('git', ['ls-files', '*/package.json']), read: readFileSync }) {
  for (const rel of io.listFiles().split(/\r?\n/u).filter(Boolean)) {
    try {
      const pkg = JSON.parse(io.read(join(REPO_ROOT, rel), 'utf8'));
      if (pkg.name === name) return dirname(rel).split('\\').join('/');
    } catch {
      /* чужой/битый package.json — не наш предмет */
    }
  }
  return null;
}

function parseArgs(argv) {
  const out = { pkg: '@membrana/plugin-contracts' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--package') out.pkg = argv[++i] ?? '';
    else throw new Error(`неизвестный аргумент «${argv[i]}»`);
  }
  if (!out.pkg) throw new Error('--package требует имя пакета');
  return out;
}

function main(argv) {
  const { pkg } = parseArgs(argv);
  const dir = findPackageDir(pkg);
  if (!dir) {
    console.error(`stale-dist-scenario: пакет «${pkg}» не найден среди отслеживаемых package.json`);
    return 2;
  }
  const pkgAbs = join(REPO_ROOT, dir);
  const pkgJson = JSON.parse(readFileSync(join(pkgAbs, 'package.json'), 'utf8'));
  const entry = join(pkgAbs, 'src', 'index.ts');
  const dts = pkgJson.types ? join(pkgAbs, pkgJson.types) : null;
  if (!existsSync(entry) || !dts) {
    console.error(`stale-dist-scenario: у «${pkg}» нет src/index.ts или поля types — сценарию не к чему цепляться`);
    return 2;
  }
  const dirty = run('git', ['status', '--porcelain', '--', `${dir}/src`]).trim();
  if (dirty) {
    console.error(`stale-dist-scenario: ОТКАЗ — в ${dir}/src незакоммиченные правки, сценарий их не перепишет:\n${dirty}`);
    return 2;
  }

  const cacheDir = mkdtempSync(join(tmpdir(), 'turbo-stale-dist-'));
  const env = { ...process.env, TURBO_CACHE_DIR: cacheDir, TURBO_TELEMETRY_DISABLED: '1' };
  const turboBuild = () => run(yarnBin(), ['turbo', 'run', 'build', `--filter=${pkg}`, '--output-logs=errors-only'], { env });
  const hasSentinel = () => existsSync(dts) && readFileSync(dts, 'utf8').includes(SENTINEL);
  const original = readFileSync(entry, 'utf8');
  const log = (s) => console.log(`stale-dist-scenario: ${s}`);

  log(`пакет ${pkg} (${dir}) · изолированный кеш ${cacheDir}`);
  let seen;
  try {
    log('0. честная сборка в изолированном кеше');
    turboBuild();
    if (hasSentinel()) throw new Error('маркер уже есть в dist до начала — дерево не чистое');

    log('1. новый экспорт в src/index.ts, mtime файла старше манифеста → turbo run build (промах)');
    writeFileSync(entry, `${original}${original.endsWith('\n') ? '' : '\n'}export const ${SENTINEL} = 1;\n`, 'utf8');
    const old = new Date('2020-01-01T00:00:00Z');
    utimesSync(entry, old, old);
    turboBuild();
    const afterMiss = hasSentinel();
    log(`   экспорт в dist после промаха: ${afterMiss ? 'есть' : 'НЕТ'}`);

    log('2. tsc -b --force руками в пакете');
    run(tscBin(), ['-b', '--force'], { cwd: pkgAbs });
    if (!hasSentinel()) throw new Error('tsc -b --force не дал экспорта — сценарий не про это, стоп');

    log('3. turbo run build снова (попадание → replay)');
    turboBuild();
    const afterReplay = hasSentinel();
    log(`   экспорт в dist после replay: ${afterReplay ? 'есть' : 'НЕТ'}`);
    seen = { afterMiss, afterReplay };
  } finally {
    writeFileSync(entry, original, 'utf8');
    run('git', ['checkout', '--', `${dir}/src/index.ts`]);
    try {
      run(tscBin(), ['-b', '--force'], { cwd: pkgAbs });
    } catch (e) {
      console.error(`stale-dist-scenario: честная пересборка после отката не удалась: ${String(e.message ?? e)}`);
    }
    rmSync(cacheDir, { recursive: true, force: true });
  }

  const { verdict, reason } = judgeScenario(seen);
  log(`${verdict} — ${reason}`);
  return verdict === VERDICTS.CLEAN ? 0 : 1;
}

if (process.argv[1]?.endsWith('turbo-stale-dist-scenario.mjs')) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (e) {
    console.error(`stale-dist-scenario: ${String(e.message ?? e)}`);
    process.exit(2);
  }
}
