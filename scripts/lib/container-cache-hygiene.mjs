/**
 * container-cache-hygiene — зуб «кеш-каталоги контейнеров не трекаются» (#1393-соседний
 * долг архивариуса, ревью 28.07).
 *
 * Вещдок: docs/archivarius/cache/spans.jsonl — документированный выход ingest —
 * не был в .gitignore; любой `git add -A` утащил бы редактированные транскрипты
 * сессий в историю публичного репозитория, ломая собственный контракт контейнера
 * («репозиторий — нотариус, не база полных сессий»).
 *
 * Правило дома: каталог `<контейнер>/cache/` — рабочий кеш, не артефакт; он обязан
 * быть проигнорирован git. Чистые функции: вход — список каталогов и решение
 * git check-ignore, снаружи — ФС и git.
 */

/** Каталоги вида docs/<что-то>/cache — кандидаты правила. */
export function cacheDirsOf(paths) {
  return (paths ?? [])
    .map((p) => String(p).replaceAll('\\', '/'))
    .filter((p) => /(^|\/)cache$/u.test(p))
    .sort();
}

/**
 * Находки: кеш-каталог, который git НЕ игнорирует.
 * @param {{dir: string, ignored: boolean}[]} checked
 * @returns {string[]}
 */
export function cacheHygieneProblems(checked) {
  const problems = [];
  for (const { dir, ignored } of checked ?? []) {
    if (!ignored) {
      problems.push(`${dir}: кеш контейнера НЕ игнорируется git — рабочие файлы (транскрипты, дампы) уедут в историю при git add -A; добавь «${dir}/» в .gitignore`);
    }
  }
  return problems;
}
