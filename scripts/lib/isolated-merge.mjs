/**
 * isolated-merge — план слияния ветки с базой в ОТДЕЛЬНОМ рабочем дереве (#1272 Ф3).
 *
 * Зачем. Общее дерево часто держат чужие незакоммиченные правки: слить базу в свою ветку
 * нельзя, переключиться нельзя, а трогать чужое запрещено (26.07 — прецедент, когда
 * переключение снесло контекст соседней сессии). Обходной путь «ветвиться от текущей
 * точки» утаскивает чужие коммиты в базу (Ф2). Законный выход один: отдельное дерево.
 *
 * Ядро ЧИСТОЕ: ни fs, ни git, ни сети — только план и вердикты. Исполняет CLI.
 */

/** Каталог временного дерева выводится из имени ветки — детерминированно, без даты. */
export function worktreePathFor(branch, root = '..') {
  const slug = String(branch).replace(/[^a-zA-Z0-9]+/gu, '-').replace(/^-+|-+$/gu, '').toLowerCase();
  return `${root}/Membrana-merge-${slug}`;
}

/**
 * Отказы ДО работы: лучше честно не начать, чем начать и бросить дерево-сироту.
 *
 * @param {{branch?: string, base?: string, branchExists?: boolean, pathBusy?: boolean, checkedOutHere?: boolean}} o
 * @returns {string[]} причины отказа (пусто — можно работать)
 */
export function refusalsBeforeMerge({ branch, base, branchExists = true, pathBusy = false, checkedOutHere = false } = {}) {
  const out = [];
  if (!branch) out.push('не указана ветка (--branch)');
  if (!base) out.push('не указана база (--base)');
  if (branch && base && branch === base) out.push(`ветка и база совпадают (${branch}) — сливать нечего`);
  if (branch && !branchExists) out.push(`ветки «${branch}» нет ни локально, ни в origin`);
  if (pathBusy) out.push('каталог временного дерева занят — прошлый прогон не убрал за собой');
  if (checkedOutHere) {
    // Ветка, выданная текущему дереву, во втором дереве недоступна: git запрещает
    // двойной чекаут. Работаем отсоединённой головой и толкаем в ref явно.
    out.push('__detach__');
  }
  return out;
}

/**
 * План шагов. Возвращает список команд как данные — CLI их исполняет, тест читает.
 *
 * @param {{branch: string, base: string, path: string, detach: boolean}} o
 */
export function planIsolatedMerge({ branch, base, path, detach = false }) {
  const addArgs = detach ? ['worktree', 'add', '--detach', path, branch] : ['worktree', 'add', path, branch];
  const pushArgs = detach ? ['push', 'origin', `HEAD:${branch}`] : ['push', 'origin', 'HEAD'];
  return [
    { id: 'fetch', args: ['fetch', 'origin', base.replace(/^origin\//u, '')], where: 'root' },
    { id: 'add', args: addArgs, where: 'root' },
    { id: 'merge', args: ['merge', base], where: 'worktree' },
    { id: 'push', args: pushArgs, where: 'worktree' },
    { id: 'remove', args: ['worktree', 'remove', '--force', path], where: 'root' },
  ];
}

/**
 * Вердикт по исходу слияния. Конфликт — НЕ провал инструмента: дерево остаётся жить,
 * чтобы человек разрешил конфликт там же, не трогая общее дерево.
 *
 * @param {{mergeOk: boolean, pushOk?: boolean, path: string}} o
 */
export function classifyOutcome({ mergeOk, pushOk = false, path }) {
  if (!mergeOk) {
    return {
      state: 'conflict',
      keepWorktree: true,
      message:
        `конфликт слияния — дерево оставлено для разбора: ${path}\n` +
        '  Разрешить там же, затем: git add … && git commit && git push, после — yarn worktree:merge --cleanup',
    };
  }
  if (!pushOk) {
    return {
      state: 'push-failed',
      keepWorktree: true,
      message: `слияние прошло, отправка не удалась — дерево оставлено: ${path}`,
    };
  }
  return { state: 'ok', keepWorktree: false, message: 'слияние и отправка прошли; временное дерево убрано' };
}
