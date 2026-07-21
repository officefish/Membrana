/**
 * Чистые правила bootstrap worktree: откуда брать node_modules / .env.
 */
import { existsSync, lstatSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

/**
 * Корень основного checkout (рядом с .git), из любого worktree.
 * @param {string} [cwd]
 * @returns {string|null}
 */
export function resolvePrimaryRepoRoot(cwd = process.cwd()) {
  try {
    const commonDir = execFileSync(
      'git',
      ['rev-parse', '--path-format=absolute', '--git-common-dir'],
      { cwd: resolve(cwd), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    if (!commonDir) return null;
    return dirname(commonDir);
  } catch {
    return null;
  }
}

/**
 * @param {string} targetDir — корень worktree
 * @param {string} sourceModules — путь к node_modules источника
 * @returns {'ok'|'already'|'missing-source'|'blocked'}
 */
export function classifyModulesLink(targetDir, sourceModules) {
  const target = join(targetDir, 'node_modules');
  if (!existsSync(sourceModules)) return 'missing-source';
  if (existsSync(target)) {
    try {
      const st = lstatSync(target);
      if (st.isSymbolicLink() || st.isDirectory()) return 'already';
    } catch {
      /* fallthrough */
    }
    return 'blocked';
  }
  return 'ok';
}

/**
 * План действий bootstrap (без побочных эффектов).
 *
 * @param {{cwd: string, primaryRoot: string|null, linkEnv?: boolean, modulesSource?: string|null}} input
 */
export function planWorktreeBootstrap(input) {
  const cwd = resolve(input.cwd);
  const primary = input.primaryRoot ? resolve(input.primaryRoot) : null;
  /** @type {{action: string, detail: string}[]} */
  const steps = [];
  const warnings = [];

  if (!primary) {
    return {
      steps,
      warnings: ['не git-репозиторий — bootstrap невозможен'],
      ok: false,
      primary: null,
      sourceModules: null,
    };
  }
  if (primary.replace(/\\/g, '/').toLowerCase() === cwd.replace(/\\/g, '/').toLowerCase()) {
    warnings.push('текущий каталог = primary root; bootstrap обычно для sibling-worktree');
  }

  const sourceModules = input.modulesSource
    ? resolve(input.modulesSource)
    : join(primary, 'node_modules');
  const modulesState = classifyModulesLink(cwd, sourceModules);
  if (modulesState === 'missing-source') {
    warnings.push(`нет ${sourceModules} — сначала yarn install в primary (${primary})`);
  } else if (modulesState === 'blocked') {
    warnings.push(`node_modules в worktree занят не-линком — не трогаем`);
  } else if (modulesState === 'already') {
    steps.push({ action: 'modules-skip', detail: 'node_modules уже есть' });
  } else {
    steps.push({
      action: 'modules-link',
      detail: `${sourceModules} → ${join(cwd, 'node_modules')}`,
    });
  }

  if (input.linkEnv !== false) {
    const envSrc = join(primary, '.env');
    const envDst = join(cwd, '.env');
    if (!existsSync(envSrc)) {
      warnings.push(`нет ${envSrc} — ключи подтянутся через loadDotEnv (common-dir), локальная копия не нужна`);
    } else if (existsSync(envDst)) {
      steps.push({ action: 'env-skip', detail: '.env уже есть в worktree' });
    } else {
      steps.push({ action: 'env-copy', detail: `${envSrc} → ${envDst}` });
    }
  }

  return { steps, warnings, ok: modulesState !== 'missing-source' && modulesState !== 'blocked', primary, sourceModules };
}
