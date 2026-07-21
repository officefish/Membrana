/**
 * tasks:decompose — декомпозиция активного реестра по категориям.
 *
 * Родилась из живого прогона 2026-07-21: 175 active-карточек вручную разложены
 * на 7 категорий по префиксам id (серии карточек именуются последовательно).
 * Здесь та же логика детерминированно: категории — В КОНФИГЕ
 * (`scripts/tasks-decompose.config.json`), не в коде (норма Р5).
 *
 * Правила:
 * - порядок категорий в конфиге значим — первая совпавшая забирает карточку;
 * - карточка без совпадений уходит в `unassigned` — это находка (конфиг отстал
 *   от реестра), скрипт её ПОКАЗЫВАЕТ, а не прячет в «прочее»;
 * - табличный вывод — обязательная часть умения: результат читает владелец.
 */

/**
 * Скомпилировать категории конфига: строки-паттерны → RegExp.
 * Бросает на невалидном конфиге — битый конфиг это дефект, не «пустой результат».
 *
 * @param {{categories: {name: string, patterns: string[]}[]}} config
 * @returns {{name: string, regexps: RegExp[]}[]}
 */
export function compileCategories(config) {
  const cats = config?.categories;
  if (!Array.isArray(cats) || cats.length < 2) {
    throw new Error('tasks-decompose: в конфиге нужно ≥2 категорий (categories[])');
  }
  return cats.map((c, i) => {
    if (!c.name || !Array.isArray(c.patterns) || c.patterns.length === 0) {
      throw new Error(`tasks-decompose: категория №${i + 1} без name или patterns`);
    }
    return { name: c.name, regexps: c.patterns.map((p) => new RegExp(p)) };
  });
}

/**
 * Разложить карточки по категориям. Первая совпавшая категория забирает карточку.
 *
 * @param {object[]} tasks карточки реестра (ожидается поле id; лишние поля не мешают)
 * @param {{name: string, regexps: RegExp[]}[]} categories из compileCategories
 * @returns {{buckets: {name: string, tasks: object[]}[], unassigned: object[], total: number}}
 */
export function decompose(tasks, categories) {
  const buckets = categories.map((c) => ({ name: c.name, tasks: [] }));
  const unassigned = [];
  for (const t of tasks) {
    const idx = categories.findIndex((c) => c.regexps.some((re) => re.test(String(t.id))));
    if (idx === -1) unassigned.push(t);
    else buckets[idx].tasks.push(t);
  }
  return { buckets, unassigned, total: tasks.length };
}

/**
 * Markdown-таблица разбиения — обязательный формат вывода.
 * | № | Категория | Карточек | Доля | Примеры |
 *
 * @param {{buckets: {name: string, tasks: object[]}[], unassigned: object[], total: number}} result
 * @param {{examples?: number}} [opts] сколько id-примеров в строке (0 = не печатать)
 * @returns {string}
 */
export function formatTable(result, opts = {}) {
  const examples = opts.examples ?? 3;
  const share = (n) => (result.total === 0 ? '—' : `${Math.round((n / result.total) * 100)}%`);
  const sample = (tasks) => {
    if (examples === 0 || tasks.length === 0) return '—';
    const ids = tasks.slice(0, examples).map((t) => `\`${t.id}\``);
    return ids.join(', ') + (tasks.length > examples ? ', …' : '');
  };
  const rows = result.buckets.map(
    (b, i) => `| ${i + 1} | ${b.name} | ${b.tasks.length} | ${share(b.tasks.length)} | ${sample(b.tasks)} |`,
  );
  if (result.unassigned.length > 0) {
    rows.push(`| — | ВНЕ КАТЕГОРИЙ (конфиг отстал) | ${result.unassigned.length} | ${share(result.unassigned.length)} | ${sample(result.unassigned)} |`);
  }
  const assigned = result.buckets.reduce((s, b) => s + b.tasks.length, 0);
  rows.push(`| | **Итого** | **${result.total}** | 100% | распределено ${assigned} |`);
  return [
    '| № | Категория | Карточек | Доля | Примеры |',
    '|---|-----------|----------|------|---------|',
    ...rows,
  ].join('\n');
}
