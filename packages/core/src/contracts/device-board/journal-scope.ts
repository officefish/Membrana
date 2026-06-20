/**
 * Scope live-журнала device-board v0.6.
 * Device и server journal — оба **per-device** (ключ = deviceId).
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §17
 */

/** Где хранится journal: локально (device) или через cabinet (server). */
export const JOURNAL_SCOPE_KINDS = ['device', 'server'] as const;

export type JournalScopeKind = (typeof JOURNAL_SCOPE_KINDS)[number];

/** Префикс handle для JournalRef. */
export const JOURNAL_REF_HANDLE_PREFIX = 'journal' as const;

/** Префикс handle для ReporterRef (scoped к journal handle). */
export const REPORTER_REF_HANDLE_PREFIX = 'reporter' as const;

/** Type guard для `JournalScopeKind`. */
export function isJournalScopeKind(value: string): value is JournalScopeKind {
  return (JOURNAL_SCOPE_KINDS as readonly string[]).includes(value);
}

/** Канонический handle JournalRef: `journal:{scope}:{deviceId}`. */
export function formatJournalRefHandle(scope: JournalScopeKind, deviceId: string): string {
  return `${JOURNAL_REF_HANDLE_PREFIX}:${scope}:${deviceId}`;
}

/** Канонический handle ReporterRef, привязанный к journal. */
export function formatReporterRefHandle(journalHandle: string): string {
  return `${REPORTER_REF_HANDLE_PREFIX}:${journalHandle}`;
}

/** Разбирает handle JournalRef; `null` если формат не канонический. */
export function parseJournalRefHandle(
  handle: string,
): { readonly scope: JournalScopeKind; readonly deviceId: string } | null {
  const parts = handle.split(':');
  if (parts.length !== 3 || parts[0] !== JOURNAL_REF_HANDLE_PREFIX) {
    return null;
  }
  const scope = parts[1];
  const deviceId = parts[2];
  if (!isJournalScopeKind(scope) || deviceId.length === 0) {
    return null;
  }
  return { scope, deviceId };
}

/** Извлекает journal handle из ReporterRef handle. */
export function parseReporterRefJournalHandle(reporterHandle: string): string | null {
  const prefix = `${REPORTER_REF_HANDLE_PREFIX}:`;
  if (!reporterHandle.startsWith(prefix)) {
    return null;
  }
  const journalHandle = reporterHandle.slice(prefix.length);
  return journalHandle.length > 0 ? journalHandle : null;
}
