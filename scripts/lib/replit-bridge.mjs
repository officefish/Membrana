/**
 * replit-bridge — чистые помощники моста «репозиторий ↔ Replit-агент».
 *
 * Контекст: у Replit-агента НЕТ стабильного публичного API для приёма задания из кода
 * (программный вызов — открытая фича-реквеста, не продукт). Реальный канал — git через
 * сам репозиторий: задание уезжает веткой `replit/<slug>`, агент строит в подключённом
 * Repl и коммитит туда же, работа возвращается той же веткой и переносится в apps/demos.
 *
 * Здесь — только чистая логика (валидация, сборка брифа, регистрация воркспейса).
 * Git/сеть — в тонких CLI (replit-task.mjs, replit-pull-demo.mjs).
 */

/** Ветка-транспорт задания для агента. */
export function taskBranchName(slug) {
  return `replit/${slug}`;
}

/** Путь воркспейса демо в монорепо. */
export function demoWorkspacePath(demoName) {
  return `apps/demos/${demoName}`;
}

/** Файл-бриф задания в репозитории. */
export function taskDocPath(slug) {
  return `docs/replit-tasks/${slug}.md`;
}

/**
 * Валидировать slug/имя демо: kebab-case, безопасно для имени ветки, пути и воркспейса.
 * Кидает с читаемым сообщением — тихого «съел плохой ввод» тут быть не должно.
 *
 * @param {string} value
 * @param {string} [label]
 * @returns {string}
 */
export function validateSlug(value, label = 'slug') {
  const s = String(value ?? '').trim();
  if (s === '') throw new Error(`${label}: пусто`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(s)) {
    throw new Error(
      `${label}: «${s}» — допустим только kebab-case [a-z0-9-], без ведущих/парных дефисов, ` +
        `верхнего регистра и пробелов (безопасно для ветки/пути/воркспейса)`,
    );
  }
  if (s.length > 64) throw new Error(`${label}: слишком длинный (${s.length} > 64)`);
  return s;
}

/**
 * Значение флага `--name value` из argv; null если флага нет или value отсутствует/похоже на флаг.
 *
 * @param {string[]} argv
 * @param {string} name
 * @returns {string|null}
 */
export function flagValue(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
}

/**
 * Позиционные аргументы без значений известных value-flags (иначе `--demo Foo "бриф"`
 * подмешивает `Foo` в бриф).
 *
 * @param {string[]} argv
 * @param {string[]} valueFlags
 * @returns {string[]}
 */
export function positionalArgs(argv, valueFlags = []) {
  const skip = new Set();
  for (const flag of valueFlags) {
    const i = argv.indexOf(flag);
    if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--')) {
      skip.add(i + 1);
    }
  }
  return argv.filter((a, i) => !a.startsWith('--') && !skip.has(i));
}

/**
 * Собрать бриф для Replit-агента. Встраивает жёсткие рамки монорепо, чтобы агент строил
 * В КОНВЕНЦИИ и НЕ трогал ничего вне своей папки — иначе слить работу в apps/demos без
 * конфликтов не выйдет. Канон стека берётся из apps/demos/Research-Tree/DEMO_STACK.md.
 *
 * @param {{slug: string, demoName: string, brief: string}} input
 * @returns {string} markdown
 */
export function buildTaskBrief({ slug, demoName, brief }) {
  const path = demoWorkspacePath(demoName);
  const body = String(brief ?? '').trim();
  return [
    `# AGENT_TASK — ${demoName} (Replit)`,
    '',
    `> Транспорт: ветка \`${taskBranchName(slug)}\`. Ты работаешь в Repl, подключённом к`,
    `> репозиторию Membrana. Сделай \`git pull\`, построй, закоммить и запушь ЭТУ ЖЕ ветку.`,
    '',
    '## Задание',
    '',
    body || '_(бриф не задан — уточни у владельца)_',
    '',
    '## Жёсткие рамки (нарушение = работу нельзя слить)',
    '',
    `1. **Строй ТОЛЬКО внутри \`${path}/\`.** Ни одного файла вне этой папки — ни в корне`,
    '   репо, ни в других apps/*, ни в package.json/turbo.json корня. Регистрацию',
    '   воркспейса сделает владелец скриптом на своей стороне.',
    `2. **Стек — канон монорепо** (см. \`apps/demos/Research-Tree/DEMO_STACK.md\`):`,
    '   Vite `^5.3.0` + React `^18.3.1` + TypeScript `^5.4.0` + Tailwind `^3.4.6` +',
    '   daisyUI `^4.12.10`, менеджер Yarn 4. **Принцип: минимум новых зависимостей** —',
    '   переиспользуй то, что уже есть в монорепо. Не бери pnpm/npm-lock (Harmonic-Detector',
    '   — НЕ эталон).',
    `3. **Демо самодостаточно и запускается:** свой \`package.json\` с именем`,
    `   \`@membrana/${demoName.toLowerCase()}-demo\`, скрипты \`dev|build|preview|typecheck\`,`,
    '   `README.md` с командой запуска, рабочий `yarn build`.',
    '4. **Не коммить** `node_modules/`, `dist/` (кроме случая, если демо задумано как',
    '   статический артефакт — тогда только `dist/` осознанно).',
    '',
    '## Выход',
    '',
    `- Всё под \`${path}/\`, запушено в ветку \`${taskBranchName(slug)}\`.`,
    '- Владелец на своей стороне: `yarn replit:pull-demo ' + slug + ' ' + demoName + '`',
    '  перенесёт папку, зарегистрирует воркспейс и откроет на ревью.',
    '',
    `<!-- slug: ${slug} · demo: ${demoName} · сгенерировано yarn replit:task -->`,
  ].join('\n');
}

/**
 * Зарегистрировать демо-воркспейс в объекте package.json (чисто, без записи на диск).
 * `apps/demos/*` в этом монорепо НЕ вайлдкард — каждый демо прописан поимённо, поэтому
 * новый надо добавлять явно. Идемпотентно: повторный вызов ничего не меняет.
 *
 * @param {any} pkg  распарсенный package.json
 * @param {string} demoName
 * @returns {{pkg: any, changed: boolean, path: string}}
 */
export function registerWorkspace(pkg, demoName) {
  const path = demoWorkspacePath(demoName);
  const list = Array.isArray(pkg?.workspaces) ? pkg.workspaces.slice() : [];
  if (list.includes(path) || list.includes('apps/demos/*')) {
    return { pkg, changed: false, path };
  }
  // Ставим рядом с другими apps/demos/* для читаемости diff; иначе — в конец.
  const lastDemoIdx = list.reduce((acc, w, i) => (w.startsWith('apps/demos/') ? i : acc), -1);
  if (lastDemoIdx >= 0) list.splice(lastDemoIdx + 1, 0, path);
  else list.push(path);
  return { pkg: { ...pkg, workspaces: list }, changed: true, path };
}
