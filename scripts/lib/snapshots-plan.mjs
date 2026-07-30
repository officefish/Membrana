/**
 * Правила пересборки производных снимков — чистые функции
 * (Ф1 санитарного пакета 30.07; ретроспектива tooling-needs, фрикция №1).
 *
 * Снимок — файл, ГЕНЕРИРУЕМЫЙ из источника. Правка руками теряется при следующей
 * пересборке, а молчаливое отставание стоит прогона CI: 29.07 это случилось трижды
 * (прецеденты, кейсы, вещдоки — последний уже на CI последнего PR дня).
 *
 * Пары «источник → снимок» живут декларацией `docs/tooling-atlas/snapshots.json`,
 * не в коде: новый снимок = строка в декларации. Здесь только правила над ней.
 *
 * Без fs и сети — ФС и запуск в `scripts/snapshots-rebuild.mjs`.
 */

/** Обязательные поля записи снимка. */
const REQUIRED = ['id', 'snapshot', 'source', 'rebuildCmd'];

/**
 * Находки формы декларации: неполная запись, дубль id, отсутствие легального «нет»
 * у снимка без проверки. Возвращаются ПОИМЁННО — молчаливый зелёный запрещён.
 * @param {object} declaration
 * @returns {Array<{toothId: string, where: string, reason: string}>}
 */
export function declarationFindings(declaration) {
  const out = [];
  const list = declaration?.snapshots;
  if (!Array.isArray(list)) {
    return [{ toothId: 'snapshots_shape', where: '(декларация)', reason: 'нет массива snapshots — форма нечитаема' }];
  }

  const seen = new Set();
  for (const entry of list) {
    const id = entry?.id ?? '(без id)';
    for (const field of REQUIRED) {
      if (entry?.[field] == null || (Array.isArray(entry[field]) && entry[field].length === 0)) {
        out.push({ toothId: 'snapshots_shape', where: `${id}.${field}`, reason: 'обязательное поле не заполнено' });
      }
    }
    if (seen.has(id)) {
      out.push({ toothId: 'snapshots_shape', where: id, reason: 'снимок объявлен дважды — id обязан быть уникален' });
    }
    seen.add(id);

    // Легальное «нет»: снимок без проверки обязан назвать причину, иначе зуб
    // молча пропустит его дрейф — ровно то, что случилось с вещдоками 29.07.
    if (entry?.checkCmd == null && !String(entry?.checkNote ?? '').trim()) {
      out.push({
        toothId: 'snapshots_shape',
        where: `${id}.checkCmd`,
        reason: 'проверки нет и причина не названа — легальное «нет» требует checkNote',
      });
    }
  }
  return out;
}

/** Снимки, у которых есть машинная проверка дрейфа. */
export function checkable(declaration) {
  return (declaration?.snapshots ?? []).filter((s) => Array.isArray(s.checkCmd) && s.checkCmd.length > 0);
}

/**
 * План пересборки: команды в порядке декларации, дубли команд схлопнуты.
 * Кейсы и номинации пересобираются одним проходом — гонять его дважды бессмысленно.
 *
 * `findingsExit` переносится из декларации: часть инструментов возвращает
 * ненулевой код как ЧИСЛО НАХОДОК, а не как отказ (`precedent:register --rebuild`
 * отдаёт число дефектных записей, снимок при этом пересобран). Путать находку с
 * отказом — значит либо врать «сломалось», либо прятать находку.
 *
 * @returns {Array<{ids: string[], cmd: string[], findingsExit: boolean}>}
 */
export function rebuildPlan(declaration) {
  const byCmd = new Map();
  for (const s of declaration?.snapshots ?? []) {
    if (!Array.isArray(s.rebuildCmd) || s.rebuildCmd.length === 0) continue;
    const key = s.rebuildCmd.join(' ');
    const entry = byCmd.get(key) ?? { ids: [], cmd: s.rebuildCmd, findingsExit: false };
    entry.ids.push(s.id);
    if (s.rebuildFindingsExit === true) entry.findingsExit = true;
    byCmd.set(key, entry);
  }
  return [...byCmd.values()];
}

/**
 * Исход прохода пересборки: `rebuilt` · `rebuilt_with_findings` · `failed`.
 * Отдельный род «пересобрано с находками» существует, чтобы находка не выдавалась
 * за поломку и не скрывалась как успех.
 * @param {{findingsExit?: boolean}} step @param {boolean} ok @param {string} out
 */
export function stepOutcome(step, ok, out) {
  if (ok) return 'rebuilt';
  if (step?.findingsExit === true && /пересобран/u.test(String(out ?? ''))) return 'rebuilt_with_findings';
  return 'failed';
}

/**
 * Итог прогона в находки: непройденная проверка — находка с именем СНИМКА,
 * а не «команда упала». Читатель должен узнать, что именно отстало.
 * @param {Array<{id: string, ok: boolean, detail?: string}>} results
 */
export function resultFindings(results) {
  return (results ?? [])
    .filter((r) => !r.ok)
    .map((r) => ({
      toothId: 'snapshot_stale',
      where: r.id,
      reason: r.detail?.trim() ? `снимок отстал от источника: ${r.detail.trim()}` : 'снимок отстал от источника',
    }));
}
