/**
 * Политика оперативной памяти — P2 стройки (вердикт C2 заседания memory-subconscious,
 * ратифицирован 28.07; сшивка — MEETING_VERDICT.md).
 *
 * O = pinned ∪ greedy-pack(budgeted). Comparator — ординалы, НЕ float-веса
 * (recency — последний ключ, не первый: ровно против кейса 27.07, где routine
 * дня вытеснила position мастерской). Pinned вне конкурса, fail-closed при
 * переполнении. Причина transfer — поле СОБЫТИЯ (уходит в op-log, межа сшивки №2),
 * записи архива ею не разбухают.
 *
 * Чистые функции: fs нет; importance/now/size подаёт вызывающий.
 */

/** Закрытый enum классов записи (C2). Неизвестное — честно routine. */
export const CLASSES = Object.freeze(['position', 'insight', 'precedent', 'routine']);

/** Жизненный цикл, ортогонален классу (C2). */
export const LIFECYCLES = Object.freeze(['active', 'settled']);

/** Причины transfer — закрытый словарь (C2). */
export const TRANSFER_REASONS = Object.freeze([
  'expired_ttl', 'demoted_settled', 'budget_evict', 'class_routine',
]);

/** Default TTL: ТОЛЬКО routine без явного срока — 168 часов (C2). */
export const ROUTINE_DEFAULT_TTL_H = 168;

const CLASS_RANK = Object.freeze({ insight: 3, precedent: 3, position: 2, routine: 1 });
const LIFECYCLE_RANK = Object.freeze({ active: 2, settled: 1 });

/** Нормализация меты кандидата: unknown → routine/active (C2, default-правило). */
export function normalizeMeta(rec) {
  return {
    ...rec,
    class: CLASSES.includes(rec?.class) ? rec.class : 'routine',
    lifecycle: LIFECYCLES.includes(rec?.lifecycle) ? rec.lifecycle : 'active',
  };
}

/**
 * Провод importance.json (C2): join by provenance. Формат v1 файла:
 * {"entries": {"<provenance>": {"level": "pinned"|"normal"}}}.
 * Нет файла / нет ключа / снят ключ → normal.
 */
export function importanceLevel(importance, provenance) {
  const level = importance?.entries?.[provenance]?.level;
  return level === 'pinned' ? 'pinned' : 'normal';
}

/** Протух ли кандидат: явный ttlUntil, либо default только для routine (C2). */
export function isExpired(rec, nowIso) {
  const meta = normalizeMeta(rec);
  if (rec?.ttlUntil) return String(rec.ttlUntil) < String(nowIso);
  if (meta.class !== 'routine') return false; // авто-TTL важных классов запрещён
  if (!rec?.ts) return false;
  const born = Date.parse(rec.ts);
  if (Number.isNaN(born)) return false;
  return born + ROUTINE_DEFAULT_TTL_H * 3600_000 < Date.parse(nowIso);
}

/**
 * Comparator v1 (C2): isPinned ↓ · isExpired ↑ · classRank ↓ · lifecycleRank ↓ ·
 * recency ↓. Возвращает функцию сравнения для сортировки «сильные первыми».
 */
export function makeComparator({ importance, nowIso }) {
  return (a, b) => {
    const ma = normalizeMeta(a);
    const mb = normalizeMeta(b);
    const pa = importanceLevel(importance, a.provenance) === 'pinned' ? 1 : 0;
    const pb = importanceLevel(importance, b.provenance) === 'pinned' ? 1 : 0;
    if (pa !== pb) return pb - pa;
    const ea = isExpired(a, nowIso) ? 1 : 0;
    const eb = isExpired(b, nowIso) ? 1 : 0;
    if (ea !== eb) return ea - eb;
    const ca = CLASS_RANK[ma.class];
    const cb = CLASS_RANK[mb.class];
    if (ca !== cb) return cb - ca;
    const la = LIFECYCLE_RANK[ma.lifecycle];
    const lb = LIFECYCLE_RANK[mb.lifecycle];
    if (la !== lb) return lb - la;
    return String(b.ts ?? '').localeCompare(String(a.ts ?? ''));
  };
}

/**
 * Отбор оперативной проекции (C2, контракт из вердикта):
 * selectOperational(candidates, importance, budget) → {retained, transferred, report}.
 *
 * @param {Array<object>} candidates записи-кандидаты (ArchiveRecord-совместимые + meta)
 * @param {object|null} importance содержимое importance.json (или null)
 * @param {{limit: number, sizeOf?: (rec: object) => number, nowIso?: string}} budget
 * @returns {{retained: object[], transferred: Array<{record: object, reason: string}>, report: object}}
 */
export function selectOperational(candidates, importance, budget) {
  const nowIso = budget.nowIso ?? new Date().toISOString();
  const sizeOf = budget.sizeOf ?? ((r) => String(r.text ?? '').length);
  const cmp = makeComparator({ importance, nowIso });

  const pinned = [];
  const rest = [];
  for (const raw of candidates ?? []) {
    const rec = normalizeMeta(raw);
    (importanceLevel(importance, rec.provenance) === 'pinned' ? pinned : rest).push(rec);
  }

  // Pinned вне конкурса; переполнение — fail-closed отчётом, НЕ молчаливое усечение.
  const pinnedSize = pinned.reduce((s, r) => s + sizeOf(r), 0);
  const overflow = pinnedSize > budget.limit;

  const retained = [...pinned];
  const transferred = [];
  let used = pinnedSize;

  for (const rec of [...rest].sort(cmp)) {
    if (isExpired(rec, nowIso)) {
      transferred.push({ record: rec, reason: 'expired_ttl' });
      continue;
    }
    const size = sizeOf(rec);
    if (!overflow && used + size <= budget.limit) {
      retained.push(rec);
      used += size;
    } else {
      transferred.push({
        record: rec,
        reason: rec.lifecycle === 'settled' ? 'demoted_settled'
          : rec.class === 'routine' ? 'class_routine'
          : 'budget_evict',
      });
    }
  }

  const report = {
    status: overflow ? 'pinned_overflow' : 'ok',
    pinned: pinned.map((r) => r.provenance),
    retainedCount: retained.length,
    transferred: transferred.map((t) => ({ id: t.record.id, reason: t.reason })),
    budget: { limit: budget.limit, used },
  };
  return { retained, transferred, report };
}
