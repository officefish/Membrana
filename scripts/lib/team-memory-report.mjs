/**
 * Отчёт памяти команды — чистый разбор диффа журналов персон (#1366 ч.1).
 *
 * Форма — кристалл графа правды token 121 `team-memory-three-line-report`
 * (ратифицирован словом владельца 27.07): три строки на персону —
 * «записал в оперативку / утонуло в подсознание / всплывало сегодня».
 *
 * v2 (02.08): контур всплытия ПОСТАВЛЕН — спринт `subconscious-lift-c3`, PR #1634,
 * #1635, #1636. Строка «всплывало» перестала быть пометкой о недостроенном и считается
 * по op-log дня. Вытеснение по-прежнему поимённо (в этом и сигнал регрессии: 27.07 у
 * Дынина семь позиций мастерской задачника исчезли молча) — и всплытие тоже поимённо:
 * обе стороны кристалла читаются построчно, `→ архив (причина)` против `← архив
 * (причина)`. Счёт без имён рвал бы симметрию и гнал читателя в журнал.
 *
 * Чистые функции: вход — текст git-диффа, выход — структура/markdown. fs/git — у CLI.
 * Суждение о состоянии всплытия выносится ЗДЕСЬ, а не в CLI: состояние есть функция от
 * данных, и определять его надо там, где это проверяемо без git и файловой системы.
 */

/**
 * Состояния строки всплытия. Закрыт: «прочее» здесь означало бы ровно ту немоту, ради
 * снятия которой строка и переписана.
 *
 * `not-invoked` НЕ равно прежнему «контур не поставлен»: то было про отсутствие механизма
 * в дереве, это — про день, в который его не звали. `empty-cloud` не равно `rejected`:
 * пустой отбор из архива — не суждение персоны, а его отсутствие.
 */
export const SURFACING_STATES = Object.freeze([
  'surfaced',
  'rejected',
  'empty-cloud',
  'not-invoked',
]);

/**
 * Состояние всплытия персоны за день. Различие `not-invoked` и `empty-cloud` держится на
 * одном поле — числе запросов: оба дают пустой список актов, но пустое облако требует, чтобы
 * лифт хотя бы звали.
 *
 * @param {{cloudQueries?: number, invocations?: Array<{outcome: string}>}} summary
 * @returns {'surfaced'|'rejected'|'empty-cloud'|'not-invoked'}
 */
export function classifySurfacing(summary) {
  const queries = Number(summary?.cloudQueries) || 0;
  const acts = summary?.invocations ?? [];
  if (acts.some((a) => a.outcome === 'emerge')) return 'surfaced';
  if (acts.some((a) => a.outcome === 'reject')) return 'rejected';
  return queries > 0 ? 'empty-cloud' : 'not-invoked';
}

/** Показ объяснения в отчёте. Полное живёт в журнале, здесь читаемость. */
const REASON_SHOWN_CHARS = 180;

/**
 * Подрезать объяснение для ПОКАЗА. Причина перетока коротка по природе, объяснение персоны —
 * проза, и в одну строку отчёта их влезает столько, что строку перестают читать.
 *
 * Обрез видимый: многоточие говорит, что текст продолжается, а полный лежит в op-log по тому
 * же `ref`. Молчаливое усечение выдало бы огрызок за всё сказанное.
 */
function clipReason(reason) {
  const text = String(reason).replace(/\s+/gu, ' ').trim();
  return text.length <= REASON_SHOWN_CHARS ? text : `${text.slice(0, REASON_SHOWN_CHARS)}… (полностью — в журнале)`;
}

/**
 * Строка всплытия — вторая половина кристалла. Зеркалит строку вытеснения: там `→ архив`,
 * здесь `← архив`.
 *
 * Отказы того же дня при состоявшемся всплытии НЕ поглощаются, а досчитываются хвостом.
 * Держатель предлагал поглощать; отступаю, потому что за день бывает несколько обращений, и
 * умолчать об отвергнутом облаке значило бы показать день полнее, чем он был.
 *
 * @param {{cloudQueries?: number, invocations?: Array<{ref?: string, reason?: string, outcome: string}>}} summary
 * @returns {string}
 */
export function surfacingLine(summary) {
  const acts = summary?.invocations ?? [];
  const state = classifySurfacing(summary);
  if (state === 'not-invoked') return '- всплывало сегодня: лифт не звали';
  if (state === 'empty-cloud') return '- всплывало сегодня: облако пустое — архив кандидатов не дал';
  if (state === 'rejected') {
    // Счёт называется и здесь — иначе день с одним отказом и день с пятью читались бы
    // одинаково, тогда как строка всплытия уже считает всплывшее.
    const rejects = acts.filter((a) => a.outcome === 'reject');
    const count = rejects.length > 1 ? ` (${rejects.length})` : '';
    const why = rejects[0]?.reason;
    return `- всплывало сегодня: облако отвергнуто${count}${why ? ` (${clipReason(why)}${rejects.length > 1 ? '; причина первого' : ''})` : ''}`;
  }
  const emerged = acts.filter((a) => a.outcome === 'emerge');
  const named = emerged
    .map((a) => `${a.ref} ← архив${a.reason ? ` (${clipReason(a.reason)})` : ''}`)
    .join(' · ');
  const rejects = acts.filter((a) => a.outcome === 'reject').length;
  const tail = rejects > 0 ? ` · и отвергнутых облаков: ${rejects}` : '';
  return `- всплывало сегодня (${emerged.length}): ${named}${tail}`;
}

/** Заголовок записи журнала: `### 2026-07-27 · позиция · slug`. */
const ENTRY_RE = /^[+-]#{3}\s+(\d{4}-\d{2}-\d{2})\s+·\s+([^·]+?)\s+·\s+(.+?)\s*$/u;

/** Имя персоны из строки диффа `+++ b/docs/virtual-team/memory/dynin.md`. */
const FILE_RE = /^(?:\+\+\+|---)\s+[ab]\/docs\/virtual-team\/memory\/([a-z-]+)\.md$/u;

/**
 * Разбор unified-диффа журналов памяти → по персонам: added/evicted записи.
 * Запись, и добавленная и удалённая в одном диффе (перестановка), — не событие.
 * @param {string} diffText
 * @returns {Record<string, {added: Array<{date: string, kind: string, slug: string}>, evicted: Array<{date: string, kind: string, slug: string}>}>}
 */
export function parseMemoryDiff(diffText) {
  const byPersona = {};
  let current = null;
  for (const line of String(diffText ?? '').split(/\r?\n/)) {
    const f = line.match(FILE_RE);
    if (f) {
      current = f[1];
      byPersona[current] ??= { added: [], evicted: [] };
      continue;
    }
    if (!current) continue;
    const e = line.match(ENTRY_RE);
    if (!e) continue;
    const entry = { date: e[1], kind: e[2].trim(), slug: e[3].trim() };
    if (line.startsWith('+')) byPersona[current].added.push(entry);
    else byPersona[current].evicted.push(entry);
  }
  // Перестановки (та же запись ушла и пришла) — не события памяти.
  for (const p of Object.values(byPersona)) {
    const key = (x) => `${x.date}·${x.kind}·${x.slug}`;
    const addedKeys = new Set(p.added.map(key));
    const evictedKeys = new Set(p.evicted.map(key));
    p.added = p.added.filter((x) => !evictedKeys.has(key(x)));
    p.evicted = p.evicted.filter((x) => !addedKeys.has(key(x)));
  }
  return byPersona;
}

/**
 * Markdown-отчёт по форме токена 121: три строки на персону.
 * @param {ReturnType<typeof parseMemoryDiff>} byPersona
 * @param {{personas?: string[], date?: string}} [opts] personas — полный список
 *   (персона без изменений тоже видна: «изменений нет» — не молчание)
 * @returns {{markdown: string, totals: {added: number, evicted: number}, regression: boolean}}
 */
export function renderMemoryReport(byPersona, opts = {}) {
  const personas = opts.personas ?? Object.keys(byPersona).sort();
  const lines = [`# Память команды — ${opts.date ?? '(дата не передана)'}`, ''];
  lines.push(
    '> Форма — кристалл token 121: записал / утонуло / всплывало. v2 (02.08): вытеснение и',
    '> всплытие — поимённо, с причиной персоны (op-log: `transfer_to_archive`, `emerge`, `reject`).',
    '',
  );
  let added = 0;
  let evicted = 0;
  for (const id of personas) {
    const p = byPersona[id] ?? { added: [], evicted: [] };
    added += p.added.length;
    evicted += p.evicted.length;
    lines.push(`## ${id}`);
    lines.push(
      p.added.length
        ? `- записал в оперативку (${p.added.length}): ${p.added.map((x) => `${x.slug} [${x.date}]`).join(' · ')}`
        : '- записал в оперативку: изменений нет',
    );
    // Межа №5 сшивки memory-subconscious: причина из op-log отличает переток от
    // потери. Есть причина → запись УШЛА В АРХИВ (жива); нет — честное «потеряно».
    const reasons = opts.reasonsByPersona?.[id];
    const evictedLine = (x) => {
      const reason = reasons?.get(`${id}-${x.date}-${x.slug}`);
      return `${x.slug} [${x.date}]${reason ? ` → архив (${reason})` : ''}`;
    };
    const anyReason = p.evicted.some((x) => reasons?.get(`${id}-${x.date}-${x.slug}`));
    lines.push(
      p.evicted.length
        ? `- утонуло в подсознание (${p.evicted.length}${anyReason ? ', переток — не потеря' : ', v1 = ПОТЕРЯНО'}): ${p.evicted.map(evictedLine).join(' · ')}`
        : '- утонуло в подсознание: ничего',
    );
    lines.push(surfacingLine(opts.surfacingByPersona?.[id]));
    lines.push('');
  }
  const regression = evicted > added;
  lines.push(`**Итог:** записано ${added} · вытеснено ${evicted}.`);
  if (regression) {
    lines.push('', '⚠ **СИГНАЛ РЕГРЕССИИ: вытеснено больше, чем записано** — память команды сегодня сжалась; поимённый список выше, решение о ценности — за владельцем.');
  }
  lines.push('');
  return { markdown: lines.join('\n'), totals: { added, evicted }, regression };
}
