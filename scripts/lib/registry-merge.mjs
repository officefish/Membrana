/**
 * registry-merge — трёхстороннее слияние `docs/tasks/registry.json` (#476 п.1).
 *
 * Зачем. Карточки вставляются в ГОЛОВУ реестра, поэтому две ветки почти всегда
 * конфликтуют на одних и тех же строках. За 12–15.07 — 10 эпизодов ручного разбора.
 *
 * Почему именно трёхстороннее, а не «одна сторона побеждает». 2026-07-15 при мёрже
 * main я разрешил конфликт «main за базу» — и молча потерял правку 26 карточек
 * (ti-2 #504): они существовали с обеих сторон, и версия main затёрла мою. Заметил
 * только по инварианту, проверенному ПОСЛЕ слияния. Правило «ours/theirs побеждает»
 * тихо теряет работу — поэтому здесь честный 3-way по каждой карточке:
 *
 *   не менялась у нас  → берём их версию
 *   не менялась у них  → берём нашу
 *   менялась у обоих одинаково → берём любую
 *   менялась у обоих по-разному → КОНФЛИКТ (человек), а не угадывание
 *
 * Порядок: новые карточки обеих сторон остаются в голове (наши, затем их), дальше —
 * порядок базы. Формат реестра не меняется (запрет #469).
 */

/** @typedef {{ id: string, [k: string]: unknown }} Card */

const byId = (cards) => new Map(cards.map((c) => [c.id, c]));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Слить одну карточку по трём версиям.
 *
 * Удаление — полноправная правка: если сторона убрала карточку, а вторая её не
 * трогала, карточка удаляется. «Вернуть, раз она есть у соседа» — это тихий откат
 * удаления, та же болезнь, что и потеря правки поля.
 *
 * @returns {{ card: Card } | { deleted: true } | { conflict: string }}
 */
export function mergeCard(base, ours, theirs) {
  if (!ours && !theirs) return { deleted: true };
  if (!ours) {
    if (!base) return { card: theirs }; // завели только они
    return same(base, theirs) ? { deleted: true } : { conflict: 'удалена у нас, изменена у них' };
  }
  if (!theirs) {
    if (!base) return { card: ours }; // завели только мы
    return same(base, ours) ? { deleted: true } : { conflict: 'изменена у нас, удалена у них' };
  }
  if (!base) {
    // Обе стороны завели карточку с одним id независимо.
    return same(ours, theirs) ? { card: ours } : { conflict: 'одинаковый id заведён по-разному' };
  }
  const ourChanged = !same(base, ours);
  const theirChanged = !same(base, theirs);
  if (!ourChanged) return { card: theirs };
  if (!theirChanged) return { card: ours };
  if (same(ours, theirs)) return { card: ours };
  return { conflict: 'изменена обеими сторонами по-разному' };
}

/**
 * Слить реестры.
 *
 * @param {{version?: number, tasks: Card[]}} base
 * @param {{version?: number, tasks: Card[]}} ours
 * @param {{version?: number, tasks: Card[]}} theirs
 * @returns {{ ok: true, registry: object } | { ok: false, conflicts: {id: string, reason: string}[] }}
 */
export function mergeRegistries(base, ours, theirs) {
  const b = byId(base?.tasks ?? []);
  const o = byId(ours.tasks);
  const t = byId(theirs.tasks);

  const conflicts = [];
  const merged = new Map();
  // Обходим и базу тоже: карточка, удалённая одной стороной, есть только там.
  for (const id of new Set([...b.keys(), ...o.keys(), ...t.keys()])) {
    const res = mergeCard(b.get(id), o.get(id), t.get(id));
    if ('conflict' in res) conflicts.push({ id, reason: res.conflict });
    else if ('card' in res) merged.set(id, res.card);
    // deleted → просто не попадает в merged
  }
  if (conflicts.length > 0) return { ok: false, conflicts };

  // Порядок: головные вставки обеих сторон (наши → их), затем порядок базы.
  const baseOrder = (base?.tasks ?? []).map((c) => c.id).filter((id) => merged.has(id));
  const inBase = new Set(baseOrder);
  const freshOurs = ours.tasks.map((c) => c.id).filter((id) => !inBase.has(id) && merged.has(id));
  const freshTheirs = theirs.tasks
    .map((c) => c.id)
    .filter((id) => !inBase.has(id) && !freshOurs.includes(id) && merged.has(id));

  const tasks = [...freshOurs, ...freshTheirs, ...baseOrder].map((id) => merged.get(id));
  // Шапка — из их версии: поля вроде version меняет сторона, которая уехала вперёд.
  return { ok: true, registry: { ...ours, ...theirs, tasks } };
}
