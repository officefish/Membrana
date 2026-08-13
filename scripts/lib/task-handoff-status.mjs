/**
 * task-handoff-status — актуальный хендоф со сверкой каждой строки (tw-handoff-status).
 *
 * Формат утверждён капитаном 13.08 («запомни такой формат отчёта»): хендоф — точка
 * входа новой сессии, но он протухает за сутки; показ без сверки транслирует ложь
 * холодной сессии. Поэтому глагол ПЕРЕД показом резолвит каждую строку очереди живым
 * состоянием: карточка — по реестру/архиву, Issue — батчем task-states (honest
 * unknown на сеть), и только потом рисует таблицу ✅/🔴 со свидетельствами.
 *
 * Чистое ядро: парс строк очереди, вердикт строки, рендер. Ни fs, ни сети, ни git —
 * всё приходит инъекцией из обвязки scripts/task-handoff-status.mjs.
 */

/** Вердикты строки — закрытый словарь; ❓ это отсутствие данных, не состояние. */
export const ROW_VERDICTS = Object.freeze(['closed', 'alive', 'mismatch', 'unknown']);

const ROW_RE = /^\|\s*(\d+)\s*\|(.+)\|[^|]*\|[^|]*\|\s*$/u;
const ID_RE = /`([a-z0-9][a-z0-9-]*)`/u;
const ISSUE_RE = /#(\d+)/gu;

/**
 * Разобрать очередь хендофа: строки таблицы вида
 * `| N | **`id`** [#NNN](…) — описание | маркер | размер |`.
 * Строки без таблицы очереди — не ошибка: хендоф бывает и без неё (rows: []).
 * @param {string} text тело docs/HANDOFF.md
 * @returns {{title: string|null, rows: Array<{n: number, id: string|null, issues: number[], raw: string}>}}
 */
export function parseHandoffQueue(text) {
  const lines = String(text ?? '').split('\n');
  const title = lines.find((l) => l.startsWith('# '))?.slice(2).trim() ?? null;
  const rows = [];
  for (const line of lines) {
    const m = ROW_RE.exec(line);
    if (!m) continue;
    const cell = m[2];
    const id = ID_RE.exec(cell)?.[1] ?? null;
    const issues = [...cell.matchAll(ISSUE_RE)].map((x) => Number(x[1]));
    rows.push({ n: Number(m[1]), id, issues, raw: cell.trim() });
  }
  return { title, rows };
}

/**
 * Вердикт одной строки по трём источникам. Приоритет — реестр (код/бухгалтерия
 * первичны, Issue вторичен: норма #533), но расхождение «Issue закрыт ↔ карточка
 * активна» НЕ гасится приоритетом, а называется отдельным вердиктом mismatch —
 * ровно класс #1330, пойманный утром 13.08.
 *
 * @param {{id: string|null, issues: number[]}} row
 * @param {object} ctx
 * @param {Map<string, {status: string, archivedAt: string|null, archiveNotes: string|null}>} ctx.cards id → карточка
 * @param {Map<number, string>} ctx.issueStates номер → 'OPEN'|'CLOSED'|'MERGED'|'unknown'
 * @returns {{verdict: string, evidence: string}}
 */
export function resolveRow(row, { cards, issueStates }) {
  const card = row.id ? cards.get(row.id) : undefined;
  const states = row.issues.map((n) => issueStates.get(n) ?? 'unknown');
  const anyOpen = states.includes('OPEN');
  const anyClosed = states.some((s) => s === 'CLOSED' || s === 'MERGED');

  if (card?.status === 'archived') {
    const note = card.archiveNotes ? firstSentence(card.archiveNotes) : null;
    const when = card.archivedAt ? ` ${card.archivedAt}` : '';
    return { verdict: 'closed', evidence: `архив${when}${note ? `: ${note}` : ''}` };
  }
  if (card?.status === 'active') {
    if (anyClosed && !anyOpen) {
      return {
        verdict: 'mismatch',
        evidence: `Issue ${row.issues.map((n) => `#${n}`).join('/')} закрыт, карточка активна — класс #1330, разбор рукой`,
      };
    }
    return { verdict: 'alive', evidence: anyOpen ? 'карточка активна, Issue OPEN' : 'карточка активна' };
  }
  // Карточки нет — судим по Issue; без Issue и без карточки честного вердикта нет.
  if (anyOpen) return { verdict: 'alive', evidence: 'Issue OPEN (карточки в реестре нет)' };
  if (anyClosed) return { verdict: 'closed', evidence: `Issue ${row.issues.map((n) => `#${n}`).join('/')} закрыт` };
  if (row.issues.length > 0 && states.every((s) => s === 'unknown')) {
    return { verdict: 'unknown', evidence: 'состояние Issue не добыто (сеть) — не выдумываем' };
  }
  return { verdict: 'unknown', evidence: 'ни карточки, ни Issue — строке нечем свидетельствовать' };
}

/** Первая фраза свидетельства — таблице не нужен весь абзац. */
function firstSentence(text) {
  const flat = String(text).replaceAll('\n', ' ').trim();
  const cut = flat.split(/(?<=[.;])\s/u)[0] ?? flat;
  return cut.length > 140 ? `${cut.slice(0, 137)}…` : cut;
}

/**
 * Кусты живого остатка: строки с общим префиксом id (до второго дефиса) называются
 * вместе — сцепленные куски видно одним взглядом, это материал завтрашнего топ-3.
 * @param {Array<{id: string|null, n: number}>} aliveRows
 * @returns {string[]} строки вида «static-mmbrn-*: №4, №5» или одиночные id
 */
export function clusterAlive(aliveRows) {
  const byPrefix = new Map();
  for (const row of aliveRows) {
    const key = row.id ? row.id.split('-').slice(0, 2).join('-') : `№${row.n}`;
    if (!byPrefix.has(key)) byPrefix.set(key, []);
    byPrefix.get(key).push(row);
  }
  const out = [];
  for (const [prefix, rows] of byPrefix) {
    if (rows.length > 1) out.push(`${prefix}-* (${rows.map((r) => `№${r.n}`).join(', ')})`);
    else out.push(rows[0].id ?? `строка №${rows[0].n}`);
  }
  return out;
}

const MARK = Object.freeze({ closed: '✅', alive: '🔴', mismatch: '⚠', unknown: '❓' });

/**
 * Рендер отчёта — пять секций формата капитана: шапка с отставанием, слово о сверке,
 * таблица, итог N/M + кусты, примечание о ❓/⚠ если есть.
 * @param {object} model
 * @param {string|null} model.title
 * @param {{sha: string, date: string, subject: string}|null} model.fileCommit
 * @param {number|null} model.staleDays
 * @param {Array<{n: number, id: string|null, issues: number[], verdict: string, evidence: string}>} model.rows
 * @returns {string}
 */
export function renderHandoffStatus({ title, fileCommit, staleDays, rows }) {
  const lines = [];
  lines.push(`Хендоф: ${title ?? '(заголовок не найден)'}`);
  if (fileCommit) lines.push(`Последняя правка: ${fileCommit.sha.slice(0, 8)} · ${fileCommit.date} · ${fileCommit.subject}`);
  if (staleDays !== null && staleDays !== undefined) {
    lines.push(staleDays >= 1
      ? `⚠ Отставание от жизни: ~${staleDays} дн. — строки ниже сверены живьём, показ без сверки транслировал бы ложь холодной сессии`
      : 'Хендоф сегодняшний; строки всё равно сверены живьём');
  }
  lines.push('');
  if (rows.length === 0) {
    lines.push('Очередь-таблица в хендофе не найдена — сверять нечего, читать файл целиком.');
    return lines.join('\n');
  }
  lines.push('| # | Строка | Статус | Свидетельство |');
  lines.push('|---|--------|--------|---------------|');
  for (const r of rows) {
    const name = r.id ?? '(id не распознан)';
    const refs = r.issues.map((n) => `#${n}`).join(' ');
    lines.push(`| ${r.n} | \`${name}\`${refs ? ` ${refs}` : ''} | ${MARK[r.verdict]} | ${r.evidence} |`);
  }
  const closed = rows.filter((r) => r.verdict === 'closed').length;
  const alive = rows.filter((r) => r.verdict === 'alive');
  const mismatch = rows.filter((r) => r.verdict === 'mismatch').length;
  const unknown = rows.filter((r) => r.verdict === 'unknown').length;
  lines.push('');
  lines.push(`Итог: ${closed} из ${rows.length} закрыты · живых ${alive.length}${mismatch ? ` · ⚠ расхождений ${mismatch}` : ''}${unknown ? ` · ❓ без данных ${unknown}` : ''}`);
  if (alive.length > 0) lines.push(`Живой остаток кустами: ${clusterAlive(alive).join(' · ')}`);
  if (mismatch > 0) lines.push('⚠ mismatch = «Issue закрыт, карточка активна» — не гасить приоритетом, разбирать рукой (класс #1330).');
  return lines.join('\n');
}
