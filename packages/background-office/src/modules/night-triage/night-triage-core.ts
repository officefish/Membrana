/**
 * Night Triage — детерминированное ядро (NT1).
 *
 * Классифицирует расхождения реестра задач БЕЗ LLM (детерминизм «два прогона
 * совпадают» тривиально): ghost / orphan / stale. Инварианты консилиума
 * `docs/seanses/night-triage-routine-2026-07-10.md` + бриф SPRINT_BRIEF.md §3.
 *
 * Чистые функции: весь I/O (чтение registry.json, git-активность, состояние
 * GitHub Issues) собирает сервис и передаёт сюда готовыми структурами.
 */

export type TriageCategory = 'ghost' | 'orphan' | 'stale';
export type TriageAction = 'close' | 'relink' | 're-scope';
export type Confidence = 'high' | 'low';

/** Задача реестра (поля гетерогенны — часть старых карточек использует opened/closed). */
export interface RegistryTask {
  id: string;
  status?: string;
  githubIssue?: number | null;
  linearId?: string | null;
  createdAt?: string | null;
  opened?: string | null;
  archivedAt?: string | null;
  closed?: string | null;
}

export interface TriageFinding {
  readonly id: string;
  readonly category: TriageCategory;
  /** Связанный issue (для ghost); null для orphan/без issue. */
  readonly issue: number | null;
  readonly action: TriageAction;
  readonly confidence: Confidence;
  /** Однострочное обоснование (обязательно для low). */
  readonly detail: string;
  /** Дней без движения — заполняется для stale. */
  readonly dwellDays?: number;
}

export interface TriageSnapshot {
  readonly generatedAt: string;
  readonly staleThresholdDays: number;
  readonly ghosts: readonly TriageFinding[];
  readonly orphans: readonly TriageFinding[];
  readonly stale: readonly TriageFinding[];
  readonly counts: { readonly ghost: number; readonly orphan: number; readonly stale: number };
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Изменения младше 24ч — переходные состояния, не классифицируем (бриф §7). */
export const TRANSITIONAL_WINDOW_MS = DAY_MS;
export const DEFAULT_STALE_THRESHOLD_DAYS = 14;

/** Детерминированная сортировка по id: по кодовым точкам, НЕ localeCompare (локаль-зависима). */
export function byCodePointId(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function isActive(t: RegistryTask): boolean {
  return t.status === 'active';
}

function hasTracker(t: RegistryTask): boolean {
  const issue = t.githubIssue;
  const linear = t.linearId;
  return (typeof issue === 'number' && issue > 0) || (typeof linear === 'string' && linear.trim() !== '');
}

function toTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/** Последняя активность задачи: git-активность (если известна) иначе дата создания. */
function lastActivityMs(
  t: RegistryTask,
  activityById: ReadonlyMap<string, Date | null>,
): number | null {
  const git = activityById.get(t.id);
  if (git instanceof Date) return git.getTime();
  return toTime(t.createdAt) ?? toTime(t.opened);
}

/** Переходное состояние: активность моложе 24ч → задачу не классифицируем ни в одной категории. */
export function isTransitional(
  t: RegistryTask,
  activityById: ReadonlyMap<string, Date | null>,
  now: Date,
): boolean {
  const last = lastActivityMs(t, activityById);
  if (last === null) return false;
  return now.getTime() - last < TRANSITIONAL_WINDOW_MS;
}

/**
 * ghost — active-задача, делящая githubIssue с АРХИВНОЙ задачей (many→one, сиблинг в архиве).
 * Рекомендация relink/re-scope (не close: issue может держаться открытым сознательно, напр. #47).
 */
export function detectGhosts(
  tasks: readonly RegistryTask[],
  activityById: ReadonlyMap<string, Date | null> = new Map(),
  now: Date = new Date(),
): TriageFinding[] {
  const archivedIssues = new Set<number>();
  for (const t of tasks) {
    if (t.status === 'archived' && typeof t.githubIssue === 'number' && t.githubIssue > 0) {
      archivedIssues.add(t.githubIssue);
    }
  }
  const out: TriageFinding[] = [];
  for (const t of tasks) {
    if (!isActive(t)) continue;
    if (isTransitional(t, activityById, now)) continue;
    const issue = t.githubIssue;
    if (typeof issue !== 'number' || issue <= 0) continue;
    if (!archivedIssues.has(issue)) continue;
    out.push({
      id: t.id,
      category: 'ghost',
      issue,
      action: 're-scope',
      confidence: 'high',
      detail: `делит issue #${issue} с архивной задачей — нужен собственный tracker или re-scope`,
    });
  }
  return out.sort(byCodePointId);
}

/** orphan — active-задача без tracker ID (нет githubIssue и нет linearId). */
export function detectOrphans(
  tasks: readonly RegistryTask[],
  activityById: ReadonlyMap<string, Date | null> = new Map(),
  now: Date = new Date(),
): TriageFinding[] {
  const out: TriageFinding[] = [];
  for (const t of tasks) {
    if (!isActive(t)) continue;
    if (hasTracker(t)) continue;
    if (isTransitional(t, activityById, now)) continue;
    out.push({
      id: t.id,
      category: 'orphan',
      issue: null,
      action: 'relink',
      confidence: 'high',
      detail: 'нет tracker ID (ни GitHub Issue, ни Linear) — привязать или закрыть карточку',
    });
  }
  return out.sort(byCodePointId);
}

/**
 * stale — active-задача без движения дольше N дней (dwell-time из git-активности или даты создания).
 * confidence low, если движение считается только от даты создания (git-активность неизвестна).
 */
export function detectStale(
  tasks: readonly RegistryTask[],
  activityById: ReadonlyMap<string, Date | null>,
  now: Date = new Date(),
  thresholdDays: number = DEFAULT_STALE_THRESHOLD_DAYS,
): TriageFinding[] {
  const out: TriageFinding[] = [];
  for (const t of tasks) {
    if (!isActive(t)) continue;
    if (isTransitional(t, activityById, now)) continue;
    const last = lastActivityMs(t, activityById);
    if (last === null) continue;
    const dwellDays = Math.floor((now.getTime() - last) / DAY_MS);
    if (dwellDays <= thresholdDays) continue;
    const gitKnown = activityById.get(t.id) instanceof Date;
    out.push({
      id: t.id,
      category: 'stale',
      issue: typeof t.githubIssue === 'number' && t.githubIssue > 0 ? t.githubIssue : null,
      action: 're-scope',
      confidence: gitKnown ? 'high' : 'low',
      detail: gitKnown
        ? `нет git-активности ${dwellDays} дн (порог ${thresholdDays})`
        : `dwell-time ${dwellDays} дн от даты создания — git-активность неизвестна`,
      dwellDays,
    });
  }
  return out.sort(byCodePointId);
}

/** Полный детерминированный срез триажа. */
export function buildTriageSnapshot(
  tasks: readonly RegistryTask[],
  activityById: ReadonlyMap<string, Date | null> = new Map(),
  now: Date = new Date(),
  thresholdDays: number = DEFAULT_STALE_THRESHOLD_DAYS,
): TriageSnapshot {
  const ghosts = detectGhosts(tasks, activityById, now);
  const orphans = detectOrphans(tasks, activityById, now);
  const stale = detectStale(tasks, activityById, now, thresholdDays);
  return {
    generatedAt: now.toISOString(),
    staleThresholdDays: thresholdDays,
    ghosts,
    orphans,
    stale,
    counts: { ghost: ghosts.length, orphan: orphans.length, stale: stale.length },
  };
}
