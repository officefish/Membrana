/**
 * wip-snapshot — ИСПОЛНИТЕЛЬ защитного снимка грязного дерева
 * (блок `dirty-wip-snapshot` спринта `worktrees-align`, #1738).
 *
 * СЛОВАРНАЯ СТАТЬЯ ПОРТА, НЕ УМНЫЙ АГЕНТ (разбор Ожегова при прогоне контекста блока):
 * «взять НАЗВАННЫЕ файлы, закоммитить, вернуть отматываемую квитанцию». Файлы выбирает
 * ядро, здесь — только исполнение. Всё, что сделало бы исполнителя «умным», запрещено:
 * он не зовёт `status`/`ls-files`, не раскрывает glob, не решает что мусор, не трогает
 * индекс вне переданного списка, не переключает ветки, не создаёт refs, не пушит,
 * не чинит хуки и не дочищает дерево после коммита.
 *
 * ПОЧЕМУ ПОИМЁННО И НИКОГДА `-A`. Прецедент 24.07: «WIP-снимок грязных деревьев поимённо
 * в пределах изолированного worktree, не `git add -A` через границы сессий». `add -A` в
 * чужом дереве заметает чужую незакоммиченную работу в наш коммит — ровно тот вред, ради
 * предотвращения которого спринт заведён. Поэтому список путей валидируется до вызова git,
 * а сам вызов идёт массивом аргументов с явным `--`, без shell.
 *
 * ПОЧЕМУ КВИТАНЦИЯ, А НЕ ОДИН SHA. Снимок обязан быть отматываемым `git reset --soft`, а
 * прицепиться этой команде нужно к РОДИТЕЛЮ, не к самому коммиту. Один `commitSha` делал бы
 * снимок формально записанным и практически необратимым. Живой вещдок цены вопроса: снимок
 * `c51a4f29` от 24.07 сохранил 434 строки работы (`closure-acceptance-audit`) — и за две
 * недели о ней никто не вспомнил, потому что перечня никто не видел.
 *
 * ЧТО ЭТОТ ФАЙЛ НЕ ЗНАЕТ: когда делать снимок и над каким деревом. Это решает `align-plan`.
 */
/**
 * Сообщение снимка — ДОСЛОВНО то, которым сделаны снимки 24.07 (`c51a4f29`, `6efc2722`,
 * `cb415619`). Не «похожее»: по этой строке снимки находятся `git log --grep`, и своя
 * формулировка сделала бы прошлые и будущие снимки невидимыми друг для друга.
 */
export const WIP_SNAPSHOT_MESSAGE = 'chore: wip snapshot before main-align';

/** Коды отказов. Каждое «нет» — с именем: молчаливый отказ здесь равен потере работы. */
export const E_SNAPSHOT_PATHS_INVALID = 'E_SNAPSHOT_PATHS_INVALID';
export const E_SNAPSHOT_NOT_TAKEN = 'E_SNAPSHOT_NOT_TAKEN';

/** Спец-значения, которыми `add` расширяют до «всего». В список путей не пролезают. */
const FORBIDDEN_LITERALS = Object.freeze(['.', '..', ':/', '*', '-A', '-u', '--all']);

const GLOB_CHARS = /[*?[\]]/;

/**
 * Проверка списка путей ДО любого вызова git.
 *
 * Пустой список — отказ, а не «нечего делать»: снимок без файлов означает, что зовущий
 * ошибся, и молча пропустить это значит потерять причину.
 *
 * @param {unknown} paths
 * @returns {string[]} тот же список, если он годен
 * @throws {Error & {code: string}}
 */
export function validateSnapshotPaths(paths) {
  const fail = (why) => {
    const e = new Error(`снимок отказан: ${why}`);
    /** @type {any} */ (e).code = E_SNAPSHOT_PATHS_INVALID;
    throw e;
  };

  if (!Array.isArray(paths)) fail('пути переданы не списком — строка или argv здесь запрещены');
  if (paths.length === 0) fail('список путей пуст — снимку нечего сохранять');

  for (const p of paths) {
    if (typeof p !== 'string' || p.trim() === '') fail('пустой элемент в списке путей');
    const s = p.trim();
    if (FORBIDDEN_LITERALS.includes(s)) fail(`«${s}» расширяет добавление до всего дерева`);
    if (s.startsWith('-')) fail(`«${s}» выглядит как флаг git, а не путь`);
    if (GLOB_CHARS.test(s)) fail(`«${s}» содержит glob — раскрытие путей не дело исполнителя`);
    if (s.split(/[/\\]/).includes('..')) fail(`«${s}» выходит за пределы дерева`);
    if (/^([a-zA-Z]:[/\\]|[/\\])/.test(s)) fail(`«${s}» абсолютный — путь обязан быть относительным дереву`);
  }
  return paths.map((p) => p.trim());
}

/**
 * ФОРМА io ЭТОГО ИСПОЛНИТЕЛЯ. Реализация живёт в CLI, здесь — только форма: файл
 * тестируется на фикстурах, живых деревьев для проверки нет (см. #1738, риск №1).
 *
 * @typedef {object} SnapshotIo
 * @property {(cwd: string, args: string[]) => string} git запуск git массивом аргументов, без shell
 * @property {() => string} now ISO-момент снаружи — для детерминизма зубов
 */

/**
 * Собрать исполнителя снимка над конкретным io.
 *
 * Гарантии ПЕРЕД возвратом квитанции (список Ожегова). Нарушение любой — снимок считается
 * несостоявшимся, и это ошибка, а не предупреждение:
 *   1. HEAD после коммита указывает на `commitSha`;
 *   2. `parentSha` совпадает с прежним HEAD;
 *   3. попавшие в коммит файлы ⊆ входного списка — исполнитель не расширил охват.
 *
 * @param {SnapshotIo} io
 */
export function makeWipSnapshot(io) {
  /**
   * @param {string} worktreeDir
   * @param {string[]} paths
   * @param {string} [message]
   * @returns {{commitSha: string, parentSha: string, worktreeDir: string, headRef: string,
   *            committedPaths: string[], createdAt: string}}
   */
  return function wipSnapshot(worktreeDir, paths, message = WIP_SNAPSHOT_MESSAGE) {
    const files = validateSnapshotPaths(paths);
    const fail = (why) => {
      const e = new Error(`снимок не состоялся: ${why}`);
      /** @type {any} */ (e).code = E_SNAPSHOT_NOT_TAKEN;
      throw e;
    };

    const headBefore = io.git(worktreeDir, ['rev-parse', 'HEAD']).trim();
    const headRef = io.git(worktreeDir, ['rev-parse', '--abbrev-ref', 'HEAD']).trim();

    // `--` отделяет пути от флагов: без него файл с именем вроде `-x` стал бы флагом.
    io.git(worktreeDir, ['add', '--', ...files]);
    io.git(worktreeDir, ['commit', '--no-verify', '-m', message]);

    const commitSha = io.git(worktreeDir, ['rev-parse', 'HEAD']).trim();
    if (commitSha === headBefore) fail('HEAD не сдвинулся — коммит не создан');

    const parentSha = io.git(worktreeDir, ['rev-parse', 'HEAD^']).trim();
    if (parentSha !== headBefore) {
      fail(`родитель коммита (${parentSha}) ≠ прежний HEAD (${headBefore}) — снимок сел не туда`);
    }

    const committedPaths = io
      .git(worktreeDir, ['show', '--pretty=', '--name-only', commitSha])
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const allowed = new Set(files.map((f) => f.replace(/\\/g, '/')));
    const extra = committedPaths.filter((f) => !allowed.has(f.replace(/\\/g, '/')));
    if (extra.length > 0) {
      fail(`в коммит попало сверх списка: ${extra.join(', ')} — охват расширять запрещено`);
    }

    return { commitSha, parentSha, worktreeDir, headRef, committedPaths, createdAt: io.now() };
  };
}

/**
 * Команда отката снимка — строкой, для отчёта. Исполнитель откат НЕ делает сам: вернуть
 * работу в рабочую копию решает человек, и знать об этом он должен из отчёта.
 */
export function undoCommandFor(receipt) {
  return `git -C ${receipt.worktreeDir} reset --soft ${receipt.parentSha}`;
}
