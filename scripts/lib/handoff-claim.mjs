/**
 * handoff-claim — писатель занятости в docs/HANDOFF.md (тулинг-нидс 27.07 №5).
 *
 * Боль: занятость правилась самописным node -e с replace по якорю строки — трижды за
 * сессию, один раз якорь не совпал из-за чужой правки. Читатель уже есть
 * (tasks:handoff-liveness); это его пара-писатель: отметить строку топ-10 занятой
 * или добавить блок занятости перед «Ниже черты».
 *
 * Чистые функции: вход markdown, выход {md, error} — ФС в CLI.
 */

const FREE_RE = /свободно/u;
const BELOW_LINE_ANCHOR = '**Ниже черты';

/**
 * Занять строку топ-10: последняя ячейка «свободно» → **кто**.
 * @param {string} md @param {number|string} rowNum @param {string} by
 * @returns {{md: string|null, error: string|null, was?: string}}
 */
export function claimRow(md, rowNum, by) {
  const lines = md.split('\n');
  const re = new RegExp(`^\\| ${Number(rowNum)} \\|`, 'u');
  const idx = lines.findIndex((l) => re.test(l));
  if (idx < 0) return { md: null, error: `строка топ-10 «| ${rowNum} |» не найдена (формы: таблица с ячейкой номера первой колонкой)` };
  const cells = lines[idx].split('|');
  // | # | Работа | … | Занято |  → последняя содержательная ячейка перед хвостовым ''
  const lastIdx = cells.length - 2;
  const current = cells[lastIdx].trim();
  if (!FREE_RE.test(current)) {
    return { md: null, error: `строка ${rowNum} уже занята: «${current}» — не перетирать чужую заявку (согласовать голосом)`, was: current };
  }
  cells[lastIdx] = ` **${by}** `;
  lines[idx] = cells.join('|');
  return { md: lines.join('\n'), error: null, was: current };
}

/**
 * Добавить блок занятости перед «Ниже черты» (когда работа не из таблицы топ-10).
 * @param {string} md @param {string} note — готовый текст без разметки блока
 * @returns {{md: string|null, error: string|null}}
 */
export function claimNote(md, note) {
  const idx = md.indexOf(BELOW_LINE_ANCHOR);
  if (idx < 0) {
    return { md: null, error: `якорь «${BELOW_LINE_ANCHOR}…» в HANDOFF не найден — формы перебраны: точное вхождение строки; добавь блок руками` };
  }
  const block = `**Занято:** ${note.trim()}\n\n`;
  return { md: md.slice(0, idx) + block + md.slice(idx), error: null };
}
