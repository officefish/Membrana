/**
 * Отчёт памяти команды — чистый разбор диффа журналов персон (#1366 ч.1).
 *
 * Форма — кристалл графа правды token 121 `team-memory-three-line-report`
 * (ратифицирован словом владельца 27.07): три строки на персону —
 * «записал в оперативку / утонуло в подсознание / всплывало сегодня».
 *
 * v1 честно ограничен: «подсознание» и «всплытие» машинно не существуют
 * (консилиум-гейт #1366 ч.2 / #1368) — вытеснение показывается ПОИМЁННО как
 * потеря (в этом и сигнал регрессии: 27.07 у Дынина семь позиций мастерской
 * задачника исчезли молча), строка «всплывало» — пометка «контур не поставлен».
 *
 * Чистые функции: вход — текст git-диффа, выход — структура/markdown. fs/git — у CLI.
 */

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
  lines.push('> Форма — кристалл token 121: записал / утонуло / всплывало. v1: контуры', '> подсознания и всплытия не поставлены (#1366 ч.2, #1368) — вытеснение = потеря, поимённо.', '');
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
    lines.push('- всплывало сегодня: контур не поставлен (#1366 ч.2)');
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
