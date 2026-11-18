/**
 * Ядро зуба «у задач одного пакета не пересекаются файлы записи» (#2660).
 *
 * ЗАЧЕМ. CI краснел в пакете, которого дифф не касался, и зеленел с перезапуска:
 *   - 17.11 `@membrana/device-board#typecheck`: `ScenarioVariableValue` без `handle` —
 *     читал `packages/core/dist/*.d.ts` в момент, когда его перевыпускали;
 *   - 18.11 `@membrana/clap-detector-service#build`: `detectors/base/dist/index.d.ts is not
 *     a module` — то же с `detector-base`.
 * Ребро порядка сборки в обоих случаях объявлено везде (`verify:build-order` молчит и прав).
 *
 * КОРЕНЬ. У пакета `typecheck` (`tsc --noEmit`) и `build` (`tsc -b`) писали ОДИН файл
 * `.tsbuildinfo` (`composite`/`incremental` включают его и при `--noEmit`), а turbo гонит
 * эти задачи параллельно: `typecheck` ждёт `^build` соседей, но не `build` своего пакета.
 * Финишировал `typecheck` позже — buildinfo говорит «ничего не выпущено», и каждый
 * зависимый `tsc -b` объявляет соседа устаревшим («buildinfo file … indicates that some of
 * the changes were not emitted») и ПЕРЕВЫПУСКАЕТ его `dist` — параллельно с теми, кто
 * этот `dist` в ту же секунду читает. Модель воспроизведения — в #2660.
 *
 * ЧТО СУДИТ. Для каждого пакета и каждой пары задач turbo, которые могут идти
 * одновременно (ни одна не ждёт другую через `dependsOn` без «^»; persistent-задачи вроде
 * `dev` — watch, с остальными не идут — не судятся):
 *   1) пересечение файлов записи `tsc` — buildinfo каждого проекта и `outDir`, если
 *      проект выпускает файлы. Пути выводятся из команды скрипта и `tsconfig` так же, как
 *      их выводит TypeScript: `--tsBuildInfoFile` → `tsBuildInfoFile` из tsconfig →
 *      `<outDir|каталог tsconfig>/<имя tsconfig>.tsbuildinfo`, если включены `incremental`
 *      или `composite`; иначе buildinfo нет;
 *   2) `outputs` задачи в `turbo.json`, накрывающие файл записи ДРУГОЙ задачи: восстановление
 *      кэша одной задачи перетрёт результат соседней (так было: у `typecheck` стояло
 *      `outputs: [".tsbuildinfo"]` — файл `build`).
 *
 * ГРАНИЦЫ (сказаны, не спрятаны). Разбирается только `tsc` в цепочках `&&`/`||`/`;`.
 * `vite build`, `node scripts/*.mjs`, `yarn …` — не разбираются: их записи зуб не видит.
 * `tsc -b` по ссылкам в ДРУГИЕ пакеты пишет и туда, но это их файлы с их собственным
 * buildinfo — судится внутри пакета-владельца; здесь — только проекты внутри своего пакета.
 *
 * Чистые функции; ФС — через переданный `readConfig`, печать — у вызывающего.
 */
import { posix } from 'node:path';

/** JSONC → JSON: снять комментарии и висячие запятые, не трогая строки. */
export function stripJsonc(text) {
  let out = '';
  let inStr = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inStr) {
      out += c;
      if (c === '\\') {
        out += text[i + 1] ?? '';
        i += 1;
      } else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      out += c;
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      out += '\n';
    } else if (c === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i += 1;
      i += 1;
    } else out += c;
  }
  return out.replace(/,(\s*[}\]])/gu, '$1');
}

export function parseJsonc(text) {
  return JSON.parse(stripJsonc(String(text)));
}

/** Разбить строку скрипта на команды по `&&`, `||`, `;`. */
function commands(script) {
  return String(script ?? '')
    .split(/&&|\|\||;/u)
    .map((s) => s.trim().split(/\s+/u).filter(Boolean))
    .filter((argv) => argv.length > 0);
}

/**
 * Вызовы `tsc` в строке скрипта.
 * @returns {{build: boolean, projects: string[], noEmit: boolean, tsBuildInfoFile: string|null}[]}
 */
export function parseTscInvocations(script) {
  const out = [];
  for (let argv of commands(script)) {
    if ((argv[0] === 'npx' || argv[0] === 'yarn') && argv[1] === 'tsc') argv = argv.slice(1);
    if (argv[0] !== 'tsc') continue;
    const inv = { build: false, projects: [], noEmit: false, tsBuildInfoFile: null };
    const positional = [];
    for (let i = 1; i < argv.length; i += 1) {
      const a = argv[i];
      if (a === '-b' || a === '--build') inv.build = true;
      else if (a === '-p' || a === '--project') {
        inv.projects.push(argv[i + 1]);
        i += 1;
      } else if (a === '--noEmit') {
        if (argv[i + 1] === 'false') i += 1;
        else inv.noEmit = true;
      } else if (a === '--tsBuildInfoFile') {
        inv.tsBuildInfoFile = argv[i + 1] ?? null;
        i += 1;
      } else if (!a.startsWith('-')) positional.push(a);
      else if (['--incremental', '--composite', '--outDir', '--rootDir'].includes(a)) i += 1;
    }
    if (inv.build) inv.projects.push(...positional);
    if (inv.projects.length === 0) inv.projects.push('.');
    out.push(inv);
  }
  return out;
}

/** Путь проекта (`.`, каталог или файл) → путь файла tsconfig (posix, относительно пакета). */
export function projectConfigPath(project, from = '.') {
  const p = posix.normalize(posix.join(from, project));
  return p.endsWith('.json') ? p : posix.join(p, 'tsconfig.json');
}

/**
 * compilerOptions с учётом `extends` (относительные пути).
 * @param {string} configPath posix-путь от корня пакета
 * @param {(p: string) => object|null} readConfig разобранный tsconfig по пути или null
 */
export function resolveCompilerOptions(configPath, readConfig, seen = new Set()) {
  if (seen.has(configPath)) return { options: {}, config: null };
  seen.add(configPath);
  const config = readConfig(configPath);
  if (!config) return { options: {}, config: null };
  let base = {};
  if (typeof config.extends === 'string' && config.extends.startsWith('.')) {
    const parent = posix.normalize(posix.join(posix.dirname(configPath), config.extends));
    const resolved = resolveCompilerOptions(parent, readConfig, seen);
    // пути родителя считаются от каталога родителя
    base = rebasePaths(resolved.options, posix.dirname(parent));
  }
  const own = rebasePaths(config.compilerOptions ?? {}, posix.dirname(configPath));
  return { options: { ...base, ...own }, config };
}

function rebasePaths(options, dir) {
  const out = { ...options };
  for (const key of ['outDir', 'tsBuildInfoFile']) {
    if (typeof out[key] === 'string' && !out[key].startsWith('/')) {
      out[key] = posix.normalize(posix.join(dir, out[key]));
    }
  }
  return out;
}

/** Файлы записи одного проекта. CLI-флаги вызова сильнее tsconfig. */
export function projectWriteTargets(configPath, inv, readConfig) {
  const { options, config } = resolveCompilerOptions(configPath, readConfig);
  if (!config) return [];
  const targets = [];
  const incremental = options.incremental === true || options.composite === true;
  if (incremental) {
    let info = inv.tsBuildInfoFile ? posix.normalize(inv.tsBuildInfoFile) : options.tsBuildInfoFile;
    if (!info) {
      const name = posix.basename(configPath, '.json');
      info = posix.join(options.outDir ?? posix.dirname(configPath), `${name}.tsbuildinfo`);
    }
    targets.push({ kind: 'buildinfo', path: info, config: configPath });
  }
  const emits = !inv.noEmit && options.noEmit !== true;
  if (emits && options.outDir) targets.push({ kind: 'outDir', path: options.outDir, config: configPath });
  return targets;
}

/**
 * Все файлы записи `tsc` в скрипте задачи (внутри пакета).
 * `tsc -b` идёт по `references` — в пределах пакета (пути без выхода «..» наружу).
 */
export function scriptWriteTargets(script, readConfig) {
  const targets = [];
  for (const inv of parseTscInvocations(script)) {
    const queue = inv.projects.map((p) => projectConfigPath(p));
    const seen = new Set();
    while (queue.length > 0) {
      const cfg = queue.shift();
      if (seen.has(cfg) || cfg.startsWith('..')) continue;
      seen.add(cfg);
      // CLI --tsBuildInfoFile относится к корневому проекту вызова, не к ссылкам -b
      const own = inv.projects.map((p) => projectConfigPath(p)).includes(cfg);
      targets.push(...projectWriteTargets(cfg, own ? inv : { ...inv, tsBuildInfoFile: null }, readConfig));
      if (inv.build) {
        const config = readConfig(cfg);
        for (const ref of config?.references ?? []) {
          if (typeof ref?.path === 'string') queue.push(projectConfigPath(ref.path, posix.dirname(cfg)));
        }
      }
    }
  }
  return targets;
}

/** Ждёт ли задача `a` задачу `b` того же пакета (dependsOn без «^»), транзитивно. */
export function waitsFor(turboTasks, a, b, seen = new Set()) {
  if (seen.has(a)) return false;
  seen.add(a);
  for (const dep of turboTasks?.[a]?.dependsOn ?? []) {
    if (dep.startsWith('^') || dep.includes('#')) continue;
    if (dep === b || waitsFor(turboTasks, dep, b, seen)) return true;
  }
  return false;
}

/** glob turbo (`*`, `**`) → RegExp по posix-пути относительно пакета. */
export function globToRegExp(glob) {
  let re = '';
  const g = posix.normalize(glob).replace(/^\.\//u, '');
  for (let i = 0; i < g.length; i += 1) {
    const c = g[i];
    if (c === '*' && g[i + 1] === '*') {
      re += '.*';
      i += 1;
      if (g[i + 1] === '/') i += 1;
    } else if (c === '*') re += '[^/]*';
    else re += c.replace(/[.+?^${}()|[\]\\]/gu, '\\$&');
  }
  return new RegExp(`^${re}$`, 'u');
}

function samePathOrNested(a, b) {
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

/**
 * Находки одного пакета.
 * @param {object} pkg разобранный package.json
 * @param {object} turboTasks раздел `tasks` из turbo.json
 * @param {(p: string) => object|null} readConfig tsconfig по пути от корня пакета
 * @returns {{kind: 'overlap'|'outputs', a: string, b: string, path: string}[]}
 */
export function packageWriteConflicts(pkg, turboTasks, readConfig) {
  const scripts = pkg?.scripts ?? {};
  // persistent-задачи (`dev`, watch) не идут вместе с остальными — их не судим
  const tasks = Object.keys(turboTasks ?? {}).filter(
    (t) => typeof scripts[t] === 'string' && turboTasks[t]?.persistent !== true,
  );
  const writes = new Map(tasks.map((t) => [t, scriptWriteTargets(scripts[t], readConfig)]));
  const findings = [];
  for (let i = 0; i < tasks.length; i += 1) {
    for (let j = 0; j < tasks.length; j += 1) {
      if (i === j) continue;
      const a = tasks[i];
      const b = tasks[j];
      if (waitsFor(turboTasks, a, b) || waitsFor(turboTasks, b, a)) continue;
      if (i < j) {
        for (const wa of writes.get(a)) {
          for (const wb of writes.get(b)) {
            if (samePathOrNested(wa.path, wb.path)) {
              findings.push({ kind: 'overlap', a, b, path: wa.path.length <= wb.path.length ? wa.path : wb.path });
            }
          }
        }
      }
      // outputs задачи a накрывают файл записи задачи b
      for (const glob of turboTasks[a]?.outputs ?? []) {
        const re = globToRegExp(glob);
        for (const wb of writes.get(b)) {
          if (wb.kind === 'buildinfo' && re.test(wb.path)) {
            findings.push({ kind: 'outputs', a, b, path: wb.path, glob });
          }
        }
      }
    }
  }
  const key = (f) => `${f.kind}|${f.a}|${f.b}|${f.path}`;
  return [...new Map(findings.map((f) => [key(f), f])).values()].sort((x, y) =>
    key(x).localeCompare(key(y)),
  );
}

/**
 * Известный долг: находки, которые сознательно отложены, — видны, но не красят зуб.
 * Исключение узкое: пакет (каталог) + пара задач. Другие пакеты и другие пары оно не
 * накрывает. Исключение без находок — устарело и само становится находкой: долг закрыт —
 * снять строку, иначе список молча разрастается.
 *
 * @param {{dir: string, a: string, b: string}[]} findings
 * @param {{dir: string, tasks: [string, string], reason: string, issue: string}[]} debt
 * @returns {{active: object[], exempted: object[], stale: object[]}}
 */
export function applyKnownDebt(findings, debt) {
  const covers = (d, f) =>
    d.dir === f.dir && d.tasks.includes(f.a) && d.tasks.includes(f.b) && f.a !== f.b;
  const active = [];
  const exempted = [];
  for (const f of findings) {
    const d = debt.find((x) => covers(x, f));
    if (d) exempted.push({ ...f, issue: d.issue });
    else active.push(f);
  }
  const stale = debt.filter((d) => !findings.some((f) => covers(d, f)));
  return { active, exempted, stale };
}
