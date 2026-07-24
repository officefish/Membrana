/**
 * Аудит «прыжков» Backlog→Done без startedAt (#1000 / DRU-364 / ADR-0017).
 * Чистая функция от records снимка — без сети.
 *
 * completed ∧ ¬started  → jump (зеркало GitHub, не WIP)
 * completed ∧ started   → moved (был слой «в работе»)
 * ¬completed            → open
 */

/**
 * @typedef {{
 *   linearId?: string,
 *   stateType?: string,
 *   startedAt?: string|null,
 *   completedAt?: string|null,
 * }} MovementRecord
 */

/**
 * @param {MovementRecord} r
 * @returns {'jump'|'moved'|'open'|'unknown'}
 */
export function classifyMovementRecord(r) {
  if (!r || typeof r !== 'object') return 'unknown';
  const completed =
    r.completedAt != null && String(r.completedAt).trim() !== ''
      ? true
      : r.stateType === 'completed';
  if (!completed) return 'open';
  const started = r.startedAt != null && String(r.startedAt).trim() !== '';
  return started ? 'moved' : 'jump';
}

/**
 * @param {MovementRecord[]} records
 * @returns {{
 *   total: number,
 *   open: number,
 *   moved: number,
 *   jump: number,
 *   unknown: number,
 *   jumpRatioAmongDone: number|null,
 *   boardIsMirrorClaim: boolean,
 *   sampleJumps: string[],
 * }}
 */
export function auditMovementRecords(records) {
  const list = Array.isArray(records) ? records : [];
  let open = 0;
  let moved = 0;
  let jump = 0;
  let unknown = 0;
  /** @type {string[]} */
  const sampleJumps = [];
  for (const r of list) {
    const cls = classifyMovementRecord(r);
    if (cls === 'open') open += 1;
    else if (cls === 'moved') moved += 1;
    else if (cls === 'jump') {
      jump += 1;
      if (sampleJumps.length < 12 && r.linearId) sampleJumps.push(String(r.linearId));
    } else unknown += 1;
  }
  const done = moved + jump;
  return {
    total: list.length,
    open,
    moved,
    jump,
    unknown,
    jumpRatioAmongDone: done === 0 ? null : jump / done,
    /** Зуб ADR-0017: если прыжков среди Done ≥ половины — доска ведёт себя как зеркало. */
    boardIsMirrorClaim: done > 0 && jump / done >= 0.5,
    sampleJumps,
  };
}

/**
 * @param {unknown} snapshot
 * @returns {{
 *   ok: boolean,
 *   problem?: string,
 *   audit?: ReturnType<typeof auditMovementRecords>,
 *   header?: { capturedAt?: string, recordCount?: number } | null,
 * }}
 */
export function auditMovementSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return { ok: false, problem: 'снимок не объект' };
  }
  const s = /** @type {{ header?: { capturedAt?: string, recordCount?: number }, records?: unknown }} */ (
    snapshot
  );
  if (!Array.isArray(s.records)) {
    return { ok: false, problem: 'нет records[]' };
  }
  return {
    ok: true,
    header: s.header ?? null,
    audit: auditMovementRecords(/** @type {MovementRecord[]} */ (s.records)),
  };
}
