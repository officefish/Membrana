#!/usr/bin/env node
/**
 * prepush-typecheck-scope — affected-typecheck pre-push БЕЗ docs-триггера (friction-5 · #1168).
 *
 * Проблема: `turbo run typecheck --filter='...[origin/main]'` метит пакет affected по ЛЮБОМУ
 * изменённому файлу, включая markdown. Правка `packages/device-board/DEVICE_BOARD_CONCEPT.md`
 * → device-board affected → `...` тянет зависимых (telemetry-journal-service) → их `^build`
 * зовёт `vite` (не поставлен в воркспейсе) → exit 127 → push заблокирован (сессия 2026-07-24
 * форсила `--no-verify`, минуя заодно gitleaks).
 *
 * Фикс: `.md`/`.mdx` НЕ влияют на типы — исключаем их из вычисления affected. Скоуп typecheck
 * к пакетам, где менялся НЕ-docs файл (+ их зависимые, `...<name>`); корневой конфиг → полный;
 * docs-only или только корневые скрипты → skip.
 *
 * Exit: 0 — typecheck прошёл / пропущен обоснованно; иначе — код turbo/yarn (реальный провал типов).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { join } from 'node:path';

import { classifyResolution, formatResolution, RESOLUTION_STATES } from './lib/worktree-resolution.mjs';

// Обе мерки переехали в `lib/changed-files-scope.mjs` (блок b2 спринта `vitest-two-tier-gate`):
// мердж-гейт vitest фильтрует изменения ровно так же, и второй копии у мерки быть не должно —
// разъехаться на единицу означало бы воспроизвести #1168 на соседнем ярусе. Публичное имя
// `nonDocsFiles` реэкспортируется с прежнего адреса: старые импорты не переписываются.
import { GLOBAL_CONFIGS, nonDocsFiles } from './lib/changed-files-scope.mjs';

export { nonDocsFiles };

export function yarnBin(platform = process.platform) {
  return platform === 'win32' ? 'yarn.cmd' : 'yarn';
}

function execYarn(args) {
  execFileSync(yarnBin(), args, { stdio: 'inherit', shell: process.platform === 'win32' });
}

/**
 * Чистый план (тестируется без git/turbo).
 * @param {string[]} changedFiles
 * @param {{ packageDirs?: string[], globalConfigs?: string[] }} [opts]
 * @returns {{ mode: 'skip'|'full'|'scoped', reason?: string, dirs?: string[] }}
 */
export function planPrepushTypecheck(changedFiles, opts = {}) {
  const packageDirs = opts.packageDirs ?? [];
  const globalConfigs = opts.globalConfigs ?? GLOBAL_CONFIGS;
  const nonDocs = nonDocsFiles(changedFiles);
  if (nonDocs.length === 0) return { mode: 'skip', reason: 'docs-only (.md/.mdx) — типы не затронуты' };
  if (nonDocs.some((f) => globalConfigs.includes(f))) return { mode: 'full', reason: 'изменён корневой конфиг' };
  const dirs = packageDirs.filter((d) => nonDocs.some((f) => f === d || f.startsWith(`${d}/`)));
  if (dirs.length === 0) return { mode: 'skip', reason: 'нет затронутых packages (корневые скрипты/доки не типизируются turbo)' };
  return { mode: 'scoped', dirs };
}

/** Режимы, выносящие МЕЖПАКЕТНЫЙ вердикт — только они понижаются при чужой резолюции. */
export const DOWNGRADABLE_MODES = Object.freeze(['full', 'scoped']);

/** Судья по типам, когда локальный вердикт недостоверен. Литерал, не строка по месту. */
export const TYPES_JUDGE = 'CI';

/**
 * Понижение плана под недостоверную резолюцию (спринт instruments-honest-verdict, блок 1; #1725).
 *
 * ЗАКОН СПРИНТА: вердикт, опирающийся на недостоверный вход, не выносится — он
 * отказывается, называя причину. Хук УЖЕ мерил чужую резолюцию и печатал «межпакетный
 * typecheck локально недостоверен» — и всё равно судил: 05.08 это свалило отгрузку
 * ложным красным (протухший `dist` соседнего дерева; своих пакетов 2 из 37).
 *
 * ДВА ПРЕДМЕТА НЕ СМЕШИВАЮТСЯ (приговор структурщика): `planPrepushTypecheck` знает
 * ЧТО проверять (docs-триггер, скоуп) и о резолюции не подозревает; этот слой знает
 * ДОВЕРИЕ к артефактам и о docs-триггере не подозревает. Композит — `planPrepushEffective`.
 *
 * «Свежий чужой dist» от «протухшего» СОЗНАТЕЛЬНО не различается: у хука нет способа
 * доказать свежесть без пересборки соседа, а пересборка соседа — уже не pre-push.
 * Различение было бы ложной точностью.
 *
 * СЛОВАРЬ (оговорка структурщика 05.08 — термин не должен поплыть у потребителей):
 * `planPrepushTypecheck` — **план по коду** (что проверять: docs-триггер, скоуп);
 * `scopeUnderResolution` — **накладка резолюции** (можно ли этому вердикту верить);
 * `planPrepushEffective` — **итоговый план** (композиция первых двух).
 *
 * @typedef {'full'|'scoped'} DowngradableMode режимы, выносящие межпакетный вердикт;
 *   инвариант: значения DowngradableMode = DOWNGRADABLE_MODES, и `downgradedFrom` может
 *   быть ТОЛЬКО одним из них — читается по типу, без чтения тела функции
 * @param {{mode: 'skip'|'full'|'scoped', reason?: string, dirs?: string[]}} plan
 * @param {{state?: string, detail?: string}} [resolution]
 * @returns {{mode: 'skip'|'full'|'scoped', reason?: string, dirs?: string[], downgradedFrom?: DowngradableMode}}
 */
export function scopeUnderResolution(plan, resolution = {}) {
  if (resolution.state !== RESOLUTION_STATES.FOREIGN) return plan;
  if (!DOWNGRADABLE_MODES.includes(plan.mode)) return plan;
  const detail = resolution.detail ? ` (${resolution.detail})` : '';
  return {
    mode: 'skip',
    downgradedFrom: plan.mode,
    reason:
      `резолюция пакетов чужая${detail} — межпакетный вердикт недостоверен по построению ` +
      `и потому НЕ выносится (#1725). Судья по типам — ${TYPES_JUDGE} на чистом дереве`,
  };
}

/**
 * Полный план pre-push: что проверять ∘ можно ли этому верить.
 * @param {string[]} changedFiles
 * @param {{ packageDirs?: string[], globalConfigs?: string[], resolution?: {state?: string, detail?: string} }} [opts]
 */
export function planPrepushEffective(changedFiles, opts = {}) {
  return scopeUnderResolution(planPrepushTypecheck(changedFiles, opts), opts.resolution ?? {});
}

const WORKSPACE_GLOBS = ['packages', 'packages/libs', 'packages/services', 'packages/services/detectors', 'apps'];

function discoverPackageDirs(root = process.cwd()) {
  const dirs = [];
  for (const g of WORKSPACE_GLOBS) {
    const base = join(root, g);
    if (!existsSync(base)) continue;
    for (const name of readdirSync(base, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      const dir = `${g}/${name.name}`;
      if (existsSync(join(root, dir, 'package.json'))) dirs.push(dir);
    }
  }
  return dirs;
}

function dirToPkgName(dir, root = process.cwd()) {
  try {
    return JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8')).name || null;
  } catch {
    return null;
  }
}

function changedVsMain() {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', 'origin/main'], { stdio: 'ignore' });
  } catch {
    return null; // нет origin/main → caller делает полный (как исходный fallback хука)
  }
  const out = execFileSync('git', ['diff', '--name-only', 'origin/main...HEAD'], { encoding: 'utf8' });
  return out.split(/\r?\n/u).filter(Boolean);
}

export function main() {
  // #1647 дал строку-предупреждение, #1725 — следствие: при чужой резолюции межпакетный
  // вердикт больше не выносится вовсе (см. scopeUnderResolution). Раньше хук печатал
  // «локально недостоверен» и всё равно судил — предупреждение без последствия.
  /** @type {{state?: string, detail?: string}} */
  let resolution = {};
  try {
    const root = realpathSync(process.cwd());
    const dir = join(root, 'node_modules', '@membrana');
    const packages = existsSync(dir)
      ? readdirSync(dir).map((name) => {
          try {
            return { name, realPath: realpathSync(join(dir, name)) };
          } catch {
            return { name, realPath: null };
          }
        })
      : [];
    const res = classifyResolution(root, packages);
    if (res.state !== RESOLUTION_STATES.OWN) console.log(`pre-push [#1647]: ${formatResolution(res)}`);
    resolution = { state: res.state, detail: `своих ${res.own} из ${res.total}` };
  } catch {
    /* сторож не вправе уронить push своей осечкой — его предмет чужая резолюция, не собственная живучесть */
  }

  const changed = changedVsMain();
  if (changed === null) {
    console.log('pre-push: origin/main недоступен → полный typecheck');
    execYarn(['typecheck']);
    return 0;
  }
  const plan = planPrepushEffective(changed, { packageDirs: discoverPackageDirs(), resolution });
  if (plan.mode === 'skip') {
    const tag = plan.downgradedFrom ? '#1725' : 'cg6/NB5';
    console.log(`pre-push [${tag}]: typecheck пропущен — ${plan.reason}`);
    return 0;
  }
  if (plan.mode === 'full') {
    console.log(`pre-push [cg6/NB5]: полный typecheck — ${plan.reason}`);
    execYarn(['typecheck']);
    return 0;
  }
  const names = plan.dirs.map((d) => dirToPkgName(d)).filter(Boolean);
  if (names.length === 0) {
    // имена не прочитались — безопасный полный прогон
    console.log('pre-push [cg6/NB5]: имена пакетов не прочитались → полный typecheck');
    execYarn(['typecheck']);
    return 0;
  }
  const filters = names.flatMap((n) => ['--filter', `...${n}`]);
  console.log(`pre-push [cg6/NB5]: typecheck affected без docs (${names.join(', ')})`);
  execYarn(['turbo', 'run', 'typecheck', ...filters]);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('prepush-typecheck-scope.mjs')) {
  process.exit(main());
}
