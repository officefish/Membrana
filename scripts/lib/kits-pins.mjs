/**
 * kits-pins — приведение описи кита (`pins`) к фактическому подграфу.
 *
 * Зачем: `yarn kits:audit` умеет ТОЛЬКО сказать, что опись разошлась с деревом,
 * а привести её в порядок предлагалось руками — по одному SHA. Ручная работа не
 * делается: к 25.07 накопилось 30 блокирующих расхождений (angelina-morning 21,
 * containerization-master 6, dream-master 3). Инструмент снимает корень: обновление
 * описи стоит одну команду и остаётся ОТДЕЛЬНЫМ ревьюируемым коммитом (канон
 * kits/README.md — пин не бывает побочным эффектом правки скрипта).
 *
 * Ядро ЧИСТОЕ: ни fs, ни git, ни сети. Факт подграфа (`actual` от `auditKit`) и
 * текущий манифест подаёт вызывающий (`scripts/kits-pins.mjs`).
 */

/**
 * Опись в каноническом виде: ключи отсортированы (стабильный diff манифеста).
 * @param {Record<string, string>} actual подграф path → git blob SHA
 * @returns {Record<string, string>}
 */
export function normalizePins(actual) {
  const out = {};
  for (const path of Object.keys(actual ?? {}).sort()) out[path] = actual[path];
  return out;
}

/**
 * Что именно изменится в описи. Три рода правки — их и печатает CLI.
 * @param {Record<string, string>} current pins из манифеста
 * @param {Record<string, string>} actual фактический подграф
 * @returns {{added: string[], changed: {path: string, from: string, to: string}[], removed: string[], clean: boolean}}
 */
export function diffPins(current, actual) {
  const cur = current ?? {};
  const act = actual ?? {};
  const added = Object.keys(act).filter((p) => !(p in cur)).sort();
  const removed = Object.keys(cur).filter((p) => !(p in act)).sort();
  const changed = Object.keys(act)
    .filter((p) => p in cur && cur[p] !== act[p])
    .sort()
    .map((p) => ({ path: p, from: cur[p], to: act[p] }));
  return { added, changed, removed, clean: added.length === 0 && changed.length === 0 && removed.length === 0 };
}

/**
 * Новый манифест: меняется ТОЛЬКО `pins`. Порядок полей и всё остальное
 * (`id`, `leadPersona`, `roots`) сохраняется — инструмент правит опись, а не кит.
 * @param {object} manifest
 * @param {Record<string, string>} actual
 * @returns {object}
 */
export function nextManifest(manifest, actual) {
  const out = {};
  for (const key of Object.keys(manifest ?? {})) {
    out[key] = key === 'pins' ? normalizePins(actual) : manifest[key];
  }
  if (!('pins' in out)) out.pins = normalizePins(actual);
  return out;
}

/**
 * Отказ до записи: инструмент не чинит то, что сломано не в описи (битые корни,
 * недостижимые узлы, дефекты схемы) — иначе «зелёная» опись прикроет реальную дыру.
 * @param {{findings?: {kind: string, detail: string}[]}} report отчёт auditKit
 * @returns {string[]} причины отказа (пусто = можно писать)
 */
export function blockersBeforeWrite(report) {
  const blockingKinds = new Set(['schema', 'unresolvable', 'no_manifest', 'bad_json']);
  return (report?.findings ?? [])
    .filter((f) => blockingKinds.has(f.kind))
    .map((f) => `${f.kind}: ${f.detail}`);
}

/**
 * Человекочитаемый план правки — детерминирован (сортировка), без даты и сети.
 * @param {string} id
 * @param {ReturnType<typeof diffPins>} d
 * @returns {string}
 */
export function renderPinsPlan(id, d) {
  if (d.clean) return `kits:pins — ${id}: опись совпадает с деревом (0 правок)`;
  const lines = [`kits:pins — ${id}: ${d.added.length} доложить · ${d.changed.length} обновить · ${d.removed.length} снять`];
  for (const p of d.added) lines.push(`  + ${p} (в подграфе, нет в описи)`);
  for (const c of d.changed) lines.push(`  ~ ${c.path} (${c.from.slice(0, 8)}… → ${c.to.slice(0, 8)}…)`);
  for (const p of d.removed) lines.push(`  - ${p} (в описи, вне подграфа)`);
  return lines.join('\n');
}
