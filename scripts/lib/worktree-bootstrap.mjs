/**
 * Чистые правила bootstrap worktree: откуда брать node_modules / .env.
 *
 * Умолчание — СВОЙ `yarn install` (#1465 Ф4, слово владельца 29.07). Junction на primary
 * канон объявил анти-паттерном ещё в #725 («ломает Nest11/express resolve»), но инструмент
 * продолжал раздавать именно его — и писал в карточку `| install | свой |`, то есть
 * утверждал состояние, которого не создавал.
 *
 * Живой счёт 29.07: дерево на junction дало пять падавших e2e и красный typecheck на
 * резолве `@membrana/rag-service` (ссылка вела в primary, где пакет не собран); `turbo`
 * не помог — собрал СВОЮ копию. Чинилось руками. Туда же `yarn` с
 * `esbuild postinstall: Manifest not found`.
 *
 * Junction остаётся доступен явным `--junction` — дёшево и годится для read-only разведки,
 * но выбор теперь осознанный и назван в карточке дерева.
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

/** Способы получить node_modules в дереве. Перечень закрытый. */
export const BOOTSTRAP_MODES = ['install', 'junction'];

/**
 * План действий bootstrap (без побочных эффектов).
 *
 * @param {{cwd: string, primaryRoot: string|null, linkEnv?: boolean,
 *          modulesSource?: string|null, mode?: 'install'|'junction'}} input
 */
export function planWorktreeBootstrap(input) {
  const cwd = resolve(input.cwd);
  const primary = input.primaryRoot ? resolve(input.primaryRoot) : null;
  /** @type {{action: string, detail: string}[]} */
  const steps = [];
  const warnings = [];

  const mode = input.mode === 'junction' ? 'junction' : 'install';

  if (!primary) {
    return {
      steps,
      warnings: ['не git-репозиторий — bootstrap невозможен'],
      ok: false,
      primary: null,
      sourceModules: null,
      mode,
    };
  }
  if (primary.replace(/\\/g, '/').toLowerCase() === cwd.replace(/\\/g, '/').toLowerCase()) {
    warnings.push('текущий каталог = primary root; bootstrap обычно для sibling-worktree');
  }

  const sourceModules = input.modulesSource
    ? resolve(input.modulesSource)
    : join(primary, 'node_modules');

  let modulesOk = true;
  if (mode === 'install') {
    // Канонный путь (#725): своё дерево зависимостей. Источник не нужен — primary без
    // node_modules здесь не помеха, в отличие от junction.
    if (existsSync(join(cwd, 'node_modules'))) {
      steps.push({ action: 'modules-skip', detail: 'node_modules уже есть — install не нужен' });
    } else {
      steps.push({ action: 'modules-install', detail: `yarn install в ${cwd}` });
    }
  } else {
    warnings.push(
      'junction на primary — анти-паттерн #725: ломает resolve и прячет несобранные пакеты ' +
        '(29.07: rag-service, пять e2e и typecheck). Проверяй ссылки через yarn workspace:links',
    );
    const modulesState = classifyModulesLink(cwd, sourceModules);
    if (modulesState === 'missing-source') {
      warnings.push(`нет ${sourceModules} — сначала yarn install в primary (${primary})`);
      modulesOk = false;
    } else if (modulesState === 'blocked') {
      warnings.push(`node_modules в worktree занят не-линком — не трогаем`);
      modulesOk = false;
    } else if (modulesState === 'already') {
      steps.push({ action: 'modules-skip', detail: 'node_modules уже есть' });
    } else {
      steps.push({
        action: 'modules-link',
        detail: `${sourceModules} → ${join(cwd, 'node_modules')}`,
      });
    }
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

  return { steps, warnings, ok: modulesOk, primary, sourceModules, mode };
}
