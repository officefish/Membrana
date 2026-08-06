/**
 * Сравнение двух сводок дозора зависимостей — чистое ядро, без ФС и сети.
 *
 * ЗАЧЕМ ВЫНЕСЕНО. Механика сравнения в дозоре была, но жила внутри одной ветки (`--mode
 * evening`) и потому не могла быть ни переиспользована, ни проверена зубом. Утренний режим
 * перезаписывал снимок БЕЗ сравнения — и запись `brace-expansion` (GHSA-mh99-v99m-4gvg,
 * severity high) исчезла из `docs/security/deps-watch-snapshot.json` именно там: коммит
 * `ec0b9d33`, утренний ритуал 01.08. Не удаление рукой — перегенерация, которой нечем было
 * сказать «отсюда пропало вот это».
 *
 * СЛОВА ИСХОДА — ПРЕДМЕТ ЭТОГО ЯДРА, а не украшение. Прежний вывод гласил «закрыто за день: N»:
 * счётчик без имён и с причиной, которой прибор не измерял. «Закрыто» утверждает починку;
 * дозор же знает ровно одно — аудит эту запись больше не сообщает. Причин у молчания несколько
 * (уязвимость исправлена · пакет выпал из дерева · advisory отозвана · реестр ответил иначе), и
 * различить их дозор не может. Поэтому он их и не называет.
 */

/** Ключ записи: пакет и идентификатор advisory. Пакет без id различим по пустой строке. */
export const keyOf = (finding) => `${finding?.pkg ?? ''}:${finding?.id ?? ''}`;

/**
 * Что изменилось между прежней и текущей сводкой.
 *
 * Порядок записей сохраняется от входа: отчёт, меняющий порядок от прогона к прогону, читается
 * как изменение состава.
 *
 * ТРЕТЬЯ ГРУППА ЗАВЕДЕНА ПО РАЗБОРУ ДЫНИНА 02.08. Ключ `pkg:id` схлопывает записи, у которых
 * сменилась severity: реестр поднял advisory с moderate до critical, а дозор молчал бы —
 * состав-то прежний. Втянуть severity в ключ нельзя: тогда повышение печаталось бы как
 * «перестала сообщаться» плюс «появилась», и первое было бы ложью — запись сообщается.
 * Поэтому изменение — свой исход, а не подвид двух прежних.
 *
 * @param {ReadonlyArray<object>} previous записи прежнего снимка
 * @param {ReadonlyArray<object>} current записи текущего прогона
 * @returns {{fresh: object[], gone: object[], changed: {before: object, after: object}[]}}
 */
export function diffFindings(previous, current) {
  const prev = Array.isArray(previous) ? previous : [];
  const curr = Array.isArray(current) ? current : [];
  const prevByKey = new Map(prev.map((f) => [keyOf(f), f]));
  const currKeys = new Set(curr.map(keyOf));

  const fresh = [];
  const changed = [];
  for (const after of curr) {
    const before = prevByKey.get(keyOf(after));
    if (before === undefined) {
      fresh.push(after);
    } else if ((before.severity ?? '') !== (after.severity ?? '')) {
      changed.push({ before, after });
    }
  }

  return {
    fresh,
    gone: prev.filter((f) => !currKeys.has(keyOf(f))),
    changed,
  };
}

/**
 * Строка о записи, переставшей сообщаться.
 *
 * Формулировка держится зубом: слова «закрыт», «исправлен», «починен» здесь запрещены — их
 * нечем подтвердить. Названы пакет, severity, id и ссылка, чтобы читатель мог проверить сам,
 * а не поверить счётчику.
 */
export function formatGone(finding) {
  const pkg = finding?.pkg ?? '(без имени)';
  const sev = finding?.severity ?? 'unknown';
  const id = finding?.id ? ` ${finding.id}` : '';
  const url = finding?.url ? ` · ${finding.url}` : '';
  return `${pkg} (${sev}${id}) — в новом прогоне НЕ найдена${url}`;
}

/**
 * Строка о записи, сменившей severity. Направление названо словом, а не стрелкой в одну
 * сторону: понижение и повышение читаются по-разному, и молча уравнивать их нельзя.
 */
export function formatChanged({ before, after } = {}) {
  const pkg = after?.pkg ?? before?.pkg ?? '(без имени)';
  const id = after?.id ? ` ${after.id}` : '';
  const from = before?.severity ?? 'unknown';
  const to = after?.severity ?? 'unknown';
  const url = after?.url ? ` · ${after.url}` : '';
  const RANK = { low: 0, moderate: 1, high: 2, critical: 3 };
  const dir = (RANK[to] ?? -1) > (RANK[from] ?? -1) ? 'ПОВЫШЕНА' : 'понижена';
  return `${pkg}${id} — severity ${dir}: ${from} → ${to}${url}`;
}

/** Строка о появившейся записи — симметрично, тем же составом полей. */
export function formatFresh(finding) {
  const pkg = finding?.pkg ?? '(без имени)';
  const sev = finding?.severity ?? 'unknown';
  const id = finding?.id ? ` ${finding.id}` : '';
  const url = finding?.url ? ` · ${finding.url}` : '';
  return `${pkg} (${sev}${id}) — появилась${url}`;
}

/**
 * Отчёт о разнице целиком: заголовок с числами и строки поимённо.
 *
 * Пустая разница тоже отчёт, а не молчание: «состав не менялся» — утверждение, и его
 * отсутствие читалось бы как «сравнения не было».
 *
 * @param {{fresh: object[], gone: object[]}} diff
 * @param {{mode?: string}} [opts]
 * @returns {string[]} строки вывода
 */
export function formatDiffReport(diff, opts = {}) {
  const mode = opts.mode ? `(${opts.mode})` : '';
  const fresh = diff?.fresh ?? [];
  const gone = diff?.gone ?? [];
  const changed = diff?.changed ?? [];
  if (fresh.length === 0 && gone.length === 0 && changed.length === 0) {
    return [`deps:watch${mode}: состав advisories не менялся с прошлого снимка.`];
  }
  const lines = [];
  if (fresh.length > 0) {
    lines.push(`deps:watch${mode}: ПОЯВИЛИСЬ advisories (${fresh.length}):`);
    for (const f of fresh) lines.push(`  ${formatFresh(f)}`);
  }
  if (changed.length > 0) {
    lines.push(`deps:watch${mode}: сменили severity (${changed.length}):`);
    for (const c of changed) lines.push(`  ${formatChanged(c)}`);
  }
  if (gone.length > 0) {
    lines.push(`deps:watch${mode}: исчезло из аудита (${gone.length}):`);
    for (const f of gone) lines.push(`  ${formatGone(f)}`);
    // Формулировка выверена зубом: даже предупреждение не вправе нести корень «закрыт» —
    // читатель выхватывает слово, а не оговорку вокруг него.
    lines.push('  → причина молчания дозором НЕ измерена: проверять поимённо, прежде чем считать вопрос решённым.');
  }
  return lines;
}
