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

const DOCS_RE = /\.(md|mdx)$/iu;
/**
 * Корневые файлы, реально инвалидирующие ВСЕ типы → полный typecheck.
 * Ровно turbo `globalDependencies` (turbo.json) + сам граф задач. Корневой `package.json`
 * СЮДА НЕ входит: turbo его глобальной зависимостью не считает, а правка скриптов в нём
 * (напр. этот спринт) типы не трогает — иначе over-trigger полного билда (vite 127).
 */
const GLOBAL_CONFIGS = ['tsconfig.base.json', 'turbo.json', '.env'];

export function yarnBin(platform = process.platform) {
  return platform === 'win32' ? 'yarn.cmd' : 'yarn';
}

function execYarn(args) {
  execFileSync(yarnBin(), args, { stdio: 'inherit', shell: process.platform === 'win32' });
}

/** @param {string[]} files */
export function nonDocsFiles(files) {
  return files.filter((f) => f && !DOCS_RE.test(f));
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
  // #1647: перед вердиктом — строка резолюции пакетов. Красный typecheck при чужой
  // резолюции — возможно, ложный (tsc читает чужой dist), и оператор обязан это видеть
  // ДО того, как пойдёт чинить ошибку, которой нет. Exit этой строкой не меняется.
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
  } catch {
    /* сторож не вправе уронить push своей осечкой — его предмет чужая резолюция, не собственная живучесть */
  }

  const changed = changedVsMain();
  if (changed === null) {
    console.log('pre-push: origin/main недоступен → полный typecheck');
    execYarn(['typecheck']);
    return 0;
  }
  const plan = planPrepushTypecheck(changed, { packageDirs: discoverPackageDirs() });
  if (plan.mode === 'skip') {
    console.log(`pre-push [cg6/NB5]: typecheck пропущен — ${plan.reason}`);
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
