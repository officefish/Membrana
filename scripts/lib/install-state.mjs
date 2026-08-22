/**
 * Состояние установки рабочего дерева — чистое ядро.
 *
 * ЗАЧЕМ. Свежий worktree без `node_modules` делает локальных судей ФИКЦИЕЙ, и это заметно
 * не сразу: `yarn vitest` падает чужим текстом («Couldn't find the node_modules state file»),
 * а запуск одолженным бинарём соседнего дерева
 * (`node ../Membrana/node_modules/vitest/vitest.mjs …`) — **проходит зелёным**, хотя
 * `require.resolve('@membrana/…')` в том же прогоне даёт `MODULE_NOT_FOUND` (замер 22.08).
 * Зелёными выглядят ровно те тесты, что не трогали workspace-импорты; остальные либо падают
 * в глубине, либо судят пакеты ЧУЖОГО дерева (анти-паттерн #725, инцидент 29.07 — rag-service,
 * пять e2e). Ложное свидетельство хуже честной ошибки: красное заставляет разбираться,
 * зелёное закрывает вопрос неверно.
 *
 * ГРАНИЦА ЯДРА. Здесь нет ни ФС, ни процессов: наблюдение приносит вызывающий, ядро выносит
 * суждение. Иначе третья копия проверки `node_modules` разъедется с хуком `.githooks/pre-push`
 * (строки 30–39), который уже честен и не трогается.
 */

/** Закрытый список состояний. Расширение — правкой этого списка, не синонимом у вызывающего. */
export const INSTALL_STATES = Object.freeze(['installed', 'absent', 'foreign']);

/**
 * Суждение о дереве по наблюдению.
 *
 * @param {{modulesDir: boolean, stateFile: boolean, modulesRealRoot?: string|null, treeRoot?: string}} obs
 *   `modulesDir` — есть каталог `node_modules`; `stateFile` — есть `.yarn-state.yml` (Yarn Berry
 *   пишет его только после успешной установки, наличие каталога само по себе ничего не значит);
 *   `modulesRealRoot` — куда ведёт каталог после разыменования ссылок (junction/symlink);
 *   `treeRoot` — корень этого дерева.
 * @returns {{state: 'installed'|'absent'|'foreign', why: string}}
 */
export function judgeInstallState(obs) {
  const { modulesDir, stateFile, modulesRealRoot = null, treeRoot = null } = obs ?? {};
  if (!modulesDir) return { state: 'absent', why: 'каталога node_modules нет' };
  if (modulesRealRoot && treeRoot && !isInside(modulesRealRoot, treeRoot)) {
    // Junction/symlink на чужое дерево — тот самый ложный зелёный: пакеты резолвятся, но
    // это пакеты соседа, собранные из другого кода.
    return { state: 'foreign', why: `node_modules ведёт в чужое дерево: ${modulesRealRoot}` };
  }
  if (!stateFile) return { state: 'absent', why: 'node_modules есть, но установка не завершена (нет .yarn-state.yml)' };
  return { state: 'installed', why: 'свои модули на месте' };
}

/** Путь внутри дерева — посегментно, чтобы `Membrana` не считалась своей для `Membrana-tooling`. */
export function isInside(path, root) {
  const norm = (p) => String(p).replace(/\\/gu, '/').replace(/\/+$/u, '');
  const a = norm(path);
  const b = norm(root);
  return a === b || a.startsWith(`${b}/`);
}

/**
 * Строка отказа: ОДНА строка предмета и ДВА honest-выхода.
 *
 * Почему два. `yarn install` в песочнице агента регулярно падает на создании связей
 * воркспейсов (`EPERM: operation not permitted, symlink`) даже при `winLinkType: junctions`
 * (слово владельца 22.08). Отказ, у которого единственное лекарство может не сработать,
 * просто переносит стену на шаг дальше — поэтому названы оба пути, включая «уйти в дерево,
 * где модули есть».
 *
 * @param {{state: string, why: string, verb?: string, treeRoot?: string}} d
 */
export function refusalMessage(d) {
  const verb = d.verb ? `${d.verb}: ` : '';
  const where = d.treeRoot ? ` (${d.treeRoot})` : '';
  const head =
    d.state === 'foreign'
      ? `${verb}модули этого дерева${where} — ЧУЖИЕ: ${d.why}. Судья считал бы пакеты соседнего дерева, а не этого.`
      : `${verb}дерево${where} без установки: ${d.why}. Судья был бы фикцией — workspace-пакеты не резолвятся.`;
  return [
    head,
    '  выход 1: yarn worktree:bootstrap — свой yarn install + .env (в песочнице агента install',
    '           иногда падает EPERM на связях воркспейсов; тогда — из терминала владельца)',
    '  выход 2: работать в дереве из канона, где модули уже есть, и судить там',
    '  осознанно всё равно: ALLOW_NO_INSTALL=1 <команда> — обход будет назван в выводе',
  ].join('\n');
}
