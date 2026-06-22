/**
 * Operative path priority tiers (Circuit A) — see ADDITIONAL_RAG_STRATEGY_BRIEF §3.1.
 */

export type OperativePriority = 'P0' | 'P1' | 'P2' | 'P3';

/** Always-on daily ritual artifacts. */
export const OPERATIVE_P0_PATHS = [
  'docs/DAILY_CODE_REVIEW.md',
  'docs/MAIN_DAY_ISSUE.md',
  'docs/CURRENT_TASK.md',
] as const;

/** Recent archive folders (date segment in path). */
export const OPERATIVE_P1_PREFIXES = [
  'docs/archive/daily-day/',
  'docs/archive/night-build/',
] as const;

/** Active sprint / plan markers. */
export const OPERATIVE_P2_PATHS = [
  'docs/STRATEGIC_PLAN_DAY.md',
  'docs/NIGHT_BUILD_ACTIVE.md',
  'docs/COMPETITION_SPRINT_ACTIVE.md',
] as const;

const P0_SET = new Set<string>(OPERATIVE_P0_PATHS);
const P2_SET = new Set<string>(OPERATIVE_P2_PATHS);

/** Score multiplier by operative tier. */
export function pathPriorityBoost(priority: OperativePriority): number {
  switch (priority) {
    case 'P0':
      return 1.3;
    case 'P1':
      return 1.2;
    case 'P2':
      return 1.1;
    case 'P3':
      return 1.0;
    default:
      return 1.0;
  }
}

export function normalizeRepoPath(path: string): string {
  return path.replace(/\\/g, '/');
}

export function isOperativeP1Path(relativePath: string): boolean {
  const normalized = normalizeRepoPath(relativePath);
  return OPERATIVE_P1_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/** Parse YYYY-MM-DD from archive path segments. */
export function parseDateFromArchivePath(relativePath: string): Date | null {
  const normalized = normalizeRepoPath(relativePath);
  const match = normalized.match(
    /docs\/archive\/(?:daily-day|night-build)\/(\d{4}-\d{2}-\d{2})/,
  );
  if (!match?.[1]) {
    return null;
  }
  const parsed = new Date(`${match[1]}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isWithinOperativeWindow(
  date: Date,
  days: number,
  now: Date = new Date(),
): boolean {
  const windowMs = days * 24 * 60 * 60 * 1000;
  return now.getTime() - date.getTime() <= windowMs;
}

/** Classify path into the highest matching operative tier. */
export function classifyOperativePath(relativePath: string): OperativePriority | null {
  const normalized = normalizeRepoPath(relativePath);

  if (P0_SET.has(normalized)) {
    return 'P0';
  }
  if (P2_SET.has(normalized)) {
    return 'P2';
  }
  if (isOperativeP1Path(normalized)) {
    return 'P1';
  }
  if (normalized.startsWith('docs/') && normalized.endsWith('.md')) {
    return 'P3';
  }
  return null;
}

export function isOperativeCandidatePath(relativePath: string): boolean {
  return classifyOperativePath(relativePath) !== null;
}

/** Glob patterns for P1 archive scanning. */
export function operativeP1GlobPatterns(): string[] {
  return ['docs/archive/daily-day/**/*.md', 'docs/archive/night-build/**/*.md'];
}

/** Exact + glob patterns for always-include operative sources. */
export function operativeStaticPaths(): string[] {
  return [...OPERATIVE_P0_PATHS, ...OPERATIVE_P2_PATHS];
}
