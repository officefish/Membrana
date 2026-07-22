/**
 * Реестр техдолгов попугая (спринт bridge-room #936, этап Б2; проект Ожегова).
 *
 * Попугай — память техдолгов: «запомнил → не забудет». Реестр APPEND-ONLY:
 * долг не удаляется, settled лишь помечается. Парсинг/сериализация markdown-таблицы
 * DEBTS.md чистыми функциями; fs — у вызывающего (bridge.mjs).
 */

/** @typedef {{id: string, debt: string, evidence: string, status: 'open'|'settled', date: string}} Debt */

const ROW_RE = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(open|settled)\s*\|\s*([^|]+?)\s*\|\s*$/u;

/**
 * Разобрать DEBTS.md → массив долгов (порядок сохранён — append-only лог).
 * @param {string} md
 * @returns {Debt[]}
 */
export function parseDebts(md) {
  const out = [];
  for (const line of String(md ?? '').split(/\r?\n/u)) {
    const m = ROW_RE.exec(line);
    if (!m) continue;
    if (m[1] === 'id' || /^-+$/u.test(m[1])) continue; // шапка/разделитель
    out.push({ id: m[1], debt: m[2], evidence: m[3], status: m[4], date: m[5] });
  }
  return out;
}

/** Живые (непогашенные) долги — то, что попугай зачитывает при открытии. */
export function openDebts(debts) {
  return (debts ?? []).filter((d) => d.status === 'open');
}

/**
 * Добавить долг (append-only). Дубликат по id запрещён — реестр не растёт
 * копиями. Требует вещдок: долг без доказательства не заводится (урок дня).
 * @param {Debt[]} debts
 * @param {{id: string, debt: string, evidence: string, date: string}} entry
 * @returns {Debt[]}
 */
export function addDebt(debts, { id, debt, evidence, date }) {
  if (!id || !debt || !evidence) throw new Error('addDebt: нужны id, debt, evidence (вещдок обязателен)');
  if ((debts ?? []).some((d) => d.id === id)) throw new Error(`addDebt: долг «${id}» уже в реестре (append-only, не дублируем)`);
  return [...(debts ?? []), { id, debt, evidence, status: 'open', date }];
}

/**
 * Погасить долг: статус open → settled. НЕ удаление — запись остаётся (append-only,
 * «запомнил → не забудет»). Идемпотентно: settled → settled без ошибки.
 * @param {Debt[]} debts
 * @param {string} id
 * @returns {Debt[]}
 */
export function settleDebt(debts, id) {
  let found = false;
  const next = (debts ?? []).map((d) => {
    if (d.id !== id) return d;
    found = true;
    return { ...d, status: 'settled' };
  });
  if (!found) throw new Error(`settleDebt: долг «${id}» не найден`);
  return next;
}

/** Сериализация обратно в markdown-таблицу (детерминированно, порядок сохранён). */
export function renderDebts(debts) {
  const head = [
    '# DEBTS — реестр техдолгов попугая (мостик, append-only)',
    '',
    '> Попугай «запомнил → не забудет»: долг не удаляется, settled лишь помечается.',
    '> Правка — только через `yarn bridge debt add|settle --evidence`.',
    '',
    '| id | долг | вещдок | статус | дата |',
    '|----|------|--------|--------|------|',
  ];
  const rows = (debts ?? []).map((d) => `| ${d.id} | ${d.debt} | ${d.evidence} | ${d.status} | ${d.date} |`);
  return [...head, ...rows, ''].join('\n');
}
