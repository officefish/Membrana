/**
 * bridge-toolkit — инструментарий ведущей комнаты «мостик» (кит `kits/angelina-bridge`).
 *
 * Отвечает на вопрос холодной сессии «чем на мостике работают»: каталог
 * инструментов по зонам (комната · попугай · ведущая · соседи), с честной
 * пометкой отсутствующего документа/движка — вместо тихой пустоты (урок 22.07).
 *
 * Ядро ЧИСТОЕ: fs/сети нет (граница мостика — `docs/procedures/bridge/README.md`).
 * Каталог читает и резолвер существования подаёт адаптер `bridge.mjs`.
 */

/** Зоны инструментария; порядок = порядок вывода (комната → попугай → ведущая → соседи). */
export const ZONES = Object.freeze(['room', 'debts', 'lead', 'neighbor']);

/** Человеческие имена зон — для заголовков таблицы. */
export const ZONE_TITLES = Object.freeze({
  room: 'комната',
  debts: 'попугай (долги)',
  lead: 'ведущая (Ангелина)',
  neighbor: 'соседи',
});

/**
 * Схема каталога: минимум полей, лишнее — дефект (родственно кит-манифесту).
 * @param {unknown} catalog
 * @returns {string[]} проблемы (пусто = схема цела)
 */
export function catalogSchemaProblems(catalog) {
  if (catalog === null || typeof catalog !== 'object' || Array.isArray(catalog)) {
    return ['каталог — не объект'];
  }
  const problems = [];
  if (!Array.isArray(catalog.tools) || catalog.tools.length === 0) {
    problems.push('tools — не непустой массив');
    return problems;
  }
  const seen = new Set();
  for (const t of catalog.tools) {
    if (t === null || typeof t !== 'object' || Array.isArray(t)) {
      problems.push('инструмент — не объект');
      continue;
    }
    if (typeof t.id !== 'string' || t.id.trim() === '') {
      problems.push('инструмент без id');
      continue;
    }
    if (seen.has(t.id)) problems.push(`дубль id ${t.id}`);
    seen.add(t.id);
    if (!ZONES.includes(t.zone)) problems.push(`${t.id}: зона «${t.zone}» вне ${ZONES.join('|')}`);
    if (typeof t.summary !== 'string' || t.summary.trim() === '') problems.push(`${t.id}: пустой summary`);
    if (!t.yarn && !t.doc && !t.path) problems.push(`${t.id}: ни yarn, ни doc, ни path — инструмент без адреса`);
  }
  return problems;
}

/**
 * Инвентарь: каталог + резолвер существования → инструменты с пометкой живости.
 * Отсутствие файла НЕ роняет инвентарь — становится видимым предупреждением
 * (немой отказ оснастки запрещён паттерном домашней мастерской).
 *
 * @param {object} catalog разобранный `docs/bridge/toolkit.catalog.json`
 * @param {{exists: (relPath: string) => boolean, zone?: string|null}} io
 * @returns {{tools: object[], problems: string[], warnings: string[]}}
 */
export function inventoryToolkit(catalog, { exists, zone = null }) {
  const problems = catalogSchemaProblems(catalog);
  if (problems.length) return { tools: [], problems, warnings: [] };
  if (zone && !ZONES.includes(zone)) {
    return { tools: [], problems: [`зона «${zone}» вне ${ZONES.join('|')}`], warnings: [] };
  }

  const warnings = [];
  const tools = [];
  for (const z of ZONES) {
    if (zone && z !== zone) continue;
    for (const t of catalog.tools) {
      if (t.zone !== z) continue;
      const missing = [];
      for (const key of ['doc', 'path', 'script']) {
        const rel = t[key];
        if (typeof rel === 'string' && rel !== '' && !exists(rel)) missing.push(`${key}: ${rel}`);
      }
      if (missing.length) warnings.push(`${t.id}: нет ${missing.join('; ')}`);
      tools.push({ ...t, alive: missing.length === 0, missing });
    }
  }
  return { tools, problems: [], warnings };
}

/**
 * Один инструмент по id — для `--doc <id>` (адаптер уже читает файл сам).
 * @param {object} catalog
 * @param {string} id
 * @returns {{ok: true, tool: object} | {ok: false, error: string}}
 */
export function findTool(catalog, id) {
  const tools = Array.isArray(catalog?.tools) ? catalog.tools : [];
  const tool = tools.find((t) => t?.id === id);
  if (!tool) {
    const known = tools.map((t) => t?.id).filter(Boolean).join(', ');
    return { ok: false, error: `инструмент «${id}» не найден. Есть: ${known || '(каталог пуст)'}` };
  }
  return { ok: true, tool };
}

/**
 * Детерминированный рендер таблицы (без сети, без даты) — так его печатает
 * `yarn bridge tools` и так же читает холодная сессия из скилла.
 * @param {object[]} tools результат `inventoryToolkit().tools`
 * @returns {string}
 */
export function renderToolkit(tools) {
  if (tools.length === 0) return '[мостик] инструментов в каталоге нет.';
  const lines = [];
  let zone = null;
  for (const t of tools) {
    if (t.zone !== zone) {
      zone = t.zone;
      lines.push(`\n▸ ${ZONE_TITLES[zone] ?? zone}`);
    }
    const address = t.yarn || t.doc || t.path || '';
    const mark = t.alive ? ' ' : '⚠';
    lines.push(`  ${mark} ${t.id.padEnd(18)} ${address}`);
    lines.push(`     ${t.summary}`);
    if (!t.alive) lines.push(`     (${t.missing.join('; ')})`);
  }
  return lines.join('\n').replace(/^\n/u, '');
}
