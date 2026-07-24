/**
 * tasks:decompose — декомпозиция активного реестра по оси.
 *
 * Родилась из живого прогона 2026-07-21: 175 active-карточек вручную разложены
 * на 7 категорий по префиксам id. V3 (M3 / #1059): оси задаются `--by`, параметры —
 * в конфиге (`scripts/tasks-decompose.config.json`), не в коде (норма Р5).
 *
 * Оси: category (default) · size · age · lead · kind · links.
 * Ось health отложена до M4B (tw-v5-validity) — не входит в набор.
 *
 * Правила:
 * - одна ось за прогон; комбинации `--by` — отказ;
 * - порядок бакетов в конфиге значим — первая совпавшая забирает карточку;
 * - карточка без значения по оси → `unassigned` («ВНЕ КАТЕГОРИЙ»), не прячется;
 * - табличный вывод — обязательная часть умения.
 */

/** Канонический набор осей V3 (без health). */
export const AXES = Object.freeze(['category', 'size', 'age', 'lead', 'kind', 'links']);

const LINK_FIELDS = Object.freeze(['githubIssue', 'linearId', 'promptPath']);

/**
 * Собрать все значения `--by` / `--by=` из argv (включая CSV).
 * @param {string[]} argv
 * @returns {string[]}
 */
export function collectByAxes(argv) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--by') {
      const v = argv[++i];
      if (v) out.push(...splitAxisList(v));
    } else if (a.startsWith('--by=')) {
      out.push(...splitAxisList(a.slice('--by='.length)));
    }
  }
  return out;
}

/** @param {string} raw */
function splitAxisList(raw) {
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Выбрать одну ось. Комбинации и health — явный отказ.
 *
 * @param {string[]} requested из collectByAxes
 * @param {{ defaultAxis?: string }} [opts]
 * @returns {string}
 */
export function resolveAxis(requested, opts = {}) {
  const defaultAxis = opts.defaultAxis ?? 'category';
  if (requested.length > 1) {
    throw new Error(
      `tasks-decompose: одна ось за прогон; получено --by ${requested.join(',')}. Комбинации запрещены (M3).`,
    );
  }
  const axis = requested[0] ?? defaultAxis;
  if (axis === 'health') {
    throw new Error(
      'tasks-decompose: ось health отложена до вердикта валидности (M4B / tw-v5-validity #1061); не входит в V3',
    );
  }
  if (!AXES.includes(axis)) {
    throw new Error(
      `tasks-decompose: неизвестная ось «${axis}». Допустимо: ${AXES.join('|')} (default ${defaultAxis})`,
    );
  }
  return axis;
}

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
 * @param {unknown} value
 * @param {'githubIssue' | 'linearId' | 'promptPath'} field
 */
function hasLinkField(value, field) {
  if (field === 'githubIssue') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * @param {object} task
 * @param {string} createdAt
 * @param {Date} now
 * @returns {number | null} целые сутки возраста; null — нет даты
 */
export function ageDays(task, now = new Date()) {
  const raw = task?.createdAt;
  if (raw == null || raw === '') return null;
  const t = Date.parse(String(raw));
  if (Number.isNaN(t)) return null;
  const ms = now.getTime() - t;
  if (ms < 0) return 0;
  return Math.floor(ms / 86_400_000);
}

/**
 * Скомпилировать спецификацию оси из конфига (параметры — в конфиге, не в коде).
 *
 * @param {object} config
 * @param {string} axis
 * @returns {{ axis: string, assign: (task: object, now?: Date) => string | null, orderedNames: string[] }}
 */
export function compileAxis(config, axis) {
  const resolved = resolveAxis([axis], { defaultAxis: config?.defaultAxis ?? 'category' });
  const axesCfg = config?.axes ?? {};

  if (resolved === 'category') {
    const cats = compileCategories(config);
    return {
      axis: resolved,
      orderedNames: cats.map((c) => c.name),
      assign(task) {
        const hit = cats.find((c) => c.regexps.some((re) => re.test(String(task.id))));
        return hit ? hit.name : null;
      },
    };
  }

  if (resolved === 'size') {
    const order = axesCfg.size?.order;
    if (!Array.isArray(order) || order.length === 0) {
      throw new Error('tasks-decompose: axes.size.order[] обязателен в конфиге');
    }
    return {
      axis: resolved,
      orderedNames: [...order],
      assign(task) {
        const v = task?.size;
        if (v == null || v === '') return null;
        return String(v);
      },
    };
  }

  if (resolved === 'lead') {
    const order = axesCfg.lead?.order ?? [];
    return {
      axis: resolved,
      orderedNames: [...order],
      assign(task) {
        const v = task?.leadPersona;
        if (v == null || v === '') return null;
        return String(v);
      },
    };
  }

  if (resolved === 'kind') {
    const order = axesCfg.kind?.order ?? [];
    return {
      axis: resolved,
      orderedNames: [...order],
      assign(task) {
        const v = task?.sprintKind;
        if (v == null || v === '') return null;
        return String(v);
      },
    };
  }

  if (resolved === 'age') {
    const buckets = axesCfg.age?.buckets;
    if (!Array.isArray(buckets) || buckets.length < 2) {
      throw new Error('tasks-decompose: axes.age.buckets[] нужно ≥2 корзин в конфиге');
    }
    for (let i = 0; i < buckets.length; i++) {
      if (!buckets[i]?.name) {
        throw new Error(`tasks-decompose: axes.age.buckets[${i}] без name`);
      }
    }
    return {
      axis: resolved,
      orderedNames: buckets.map((b) => b.name),
      assign(task, now = new Date()) {
        const days = ageDays(task, now);
        if (days == null) return null;
        for (const b of buckets) {
          if (b.maxDaysInclusive == null) return b.name;
          if (days <= b.maxDaysInclusive) return b.name;
        }
        return null;
      },
    };
  }

  if (resolved === 'links') {
    const groups = axesCfg.links?.groups;
    if (!Array.isArray(groups) || groups.length < 2) {
      throw new Error('tasks-decompose: axes.links.groups[] нужно ≥2 групп в конфиге');
    }
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (!g?.name) throw new Error(`tasks-decompose: axes.links.groups[${i}] без name`);
      for (const key of ['allOf', 'noneOf']) {
        if (g[key] != null) {
          if (!Array.isArray(g[key])) {
            throw new Error(`tasks-decompose: axes.links.groups[${i}].${key} должен быть массивом`);
          }
          for (const f of g[key]) {
            if (!LINK_FIELDS.includes(f)) {
              throw new Error(
                `tasks-decompose: axes.links.groups[${i}].${key}: неизвестное поле «${f}» (допустимо: ${LINK_FIELDS.join('|')})`,
              );
            }
          }
        }
      }
    }
    return {
      axis: resolved,
      orderedNames: groups.map((g) => g.name),
      assign(task) {
        for (const g of groups) {
          const allOf = g.allOf ?? [];
          const noneOf = g.noneOf ?? [];
          const allOk = allOf.every((f) => hasLinkField(task?.[f], f));
          const noneOk = noneOf.every((f) => !hasLinkField(task?.[f], f));
          if (allOk && noneOk) return g.name;
        }
        return null;
      },
    };
  }

  throw new Error(`tasks-decompose: ось «${resolved}» не собрана`);
}

/**
 * Разложить карточки по оси. Имена бакетов из конфига + обнаруженные значения
 * (для size/lead/kind), не попавшие в order — после известных, по алфавиту.
 *
 * @param {object[]} tasks
 * @param {ReturnType<typeof compileAxis>} axisSpec
 * @param {{ now?: Date }} [opts]
 */
export function decomposeByAxis(tasks, axisSpec, opts = {}) {
  const now = opts.now ?? new Date();
  /** @type {Map<string, object[]>} */
  const map = new Map();
  for (const name of axisSpec.orderedNames) map.set(name, []);
  const unassigned = [];
  const extras = new Set();

  for (const t of tasks) {
    const key = axisSpec.assign(t, now);
    if (key == null) {
      unassigned.push(t);
      continue;
    }
    if (!map.has(key)) {
      map.set(key, []);
      extras.add(key);
    }
    map.get(key).push(t);
  }

  const orderedExtra = [...extras].sort((a, b) => a.localeCompare(b, 'ru'));
  const names = [...axisSpec.orderedNames, ...orderedExtra];
  const buckets = names.map((name) => ({ name, tasks: map.get(name) ?? [] }));
  return { axis: axisSpec.axis, buckets, unassigned, total: tasks.length };
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
    rows.push(
      `| — | ВНЕ КАТЕГОРИЙ (конфиг отстал) | ${result.unassigned.length} | ${share(result.unassigned.length)} | ${sample(result.unassigned)} |`,
    );
  }
  const assigned = result.buckets.reduce((s, b) => s + b.tasks.length, 0);
  rows.push(`| | **Итого** | **${result.total}** | 100% | распределено ${assigned} |`);
  return [
    '| № | Категория | Карточек | Доля | Примеры |',
    '|---|-----------|----------|------|---------|',
    ...rows,
  ].join('\n');
}

/**
 * Полный markdown-отчёт для реестра контейнера (Scenario A):
 * Meta → сводная таблица → полные списки категорий → «вне категорий».
 *
 * @param {{buckets: {name: string, tasks: object[]}[], unassigned: object[], total: number, axis?: string}} result
 * @param {Record<string, string>} meta пары Поле→Значение (Date, Base SHA, Source, …)
 * @returns {string}
 */
export function renderReport(result, meta = {}) {
  const parts = [
    '# TASKS_DECOMPOSE_LIST — реестр декомпозиции задач',
    '',
    '## Meta',
    '',
    '| Field | Value |',
    '|-------|-------|',
  ];
  for (const [k, v] of Object.entries(meta)) parts.push(`| ${k} | ${v} |`);
  parts.push('', '## Summary', '', formatTable(result), '');
  for (const b of result.buckets) {
    parts.push(`## ${b.name} (${b.tasks.length})`, '');
    for (const t of b.tasks) {
      parts.push(
        `- \`${t.id}\`${t.size ? ` [${t.size}]` : ''}${t.githubIssue ? ` #${t.githubIssue}` : ''} — ${t.title ?? ''}`,
      );
    }
    parts.push('');
  }
  if (result.unassigned.length > 0) {
    parts.push(`## ВНЕ КАТЕГОРИЙ (${result.unassigned.length}) — дополнить конфиг`, '');
    for (const t of result.unassigned) parts.push(`- \`${t.id}\` — ${t.title ?? ''}`);
    parts.push('');
  }
  return parts.join('\n');
}
