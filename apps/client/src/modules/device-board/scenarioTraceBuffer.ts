/**
 * In-memory ring buffer of device-board scenario INFO lines (client-only).
 * Used by Phase 3 UX: copy / download trace for debugging.
 */

const MAX_TRACE_LINES = 10_000;

const lines: string[] = [];
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** Format one line like browser console `[INFO] message {ctx}`. */
export function formatScenarioTraceLine(
  message: string,
  context?: Readonly<Record<string, unknown>>,
): string {
  if (context === undefined || Object.keys(context).length === 0) {
    return `[INFO] ${message}`;
  }
  const body = Object.entries(context)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}: '${value}'`;
      }
      if (value === null) {
        return `${key}: null`;
      }
      return `${key}: ${String(value)}`;
    })
    .join(', ');
  return `[INFO] ${message} {${body}}`;
}

/** Append line to ring buffer (drops oldest when over cap). */
export function appendScenarioTraceLine(
  message: string,
  context?: Readonly<Record<string, unknown>>,
): void {
  lines.push(formatScenarioTraceLine(message, context));
  if (lines.length > MAX_TRACE_LINES) {
    lines.splice(0, lines.length - MAX_TRACE_LINES);
  }
  notify();
}

export function clearScenarioTraceBuffer(): void {
  if (lines.length === 0) {
    return;
  }
  lines.length = 0;
  notify();
}

export function getScenarioTraceLineCount(): number {
  return lines.length;
}

export function getScenarioTraceText(): string {
  return lines.join('\n');
}

export function subscribeScenarioTraceBuffer(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Copy buffer to clipboard; returns false when empty or clipboard denied. */
export async function copyScenarioTraceToClipboard(): Promise<boolean> {
  if (lines.length === 0 || typeof navigator.clipboard?.writeText !== 'function') {
    return false;
  }
  try {
    await navigator.clipboard.writeText(getScenarioTraceText());
    return true;
  } catch {
    return false;
  }
}

/** Trigger browser download of trace as plain text. */
export function downloadScenarioTraceFile(runId?: string | null): void {
  if (lines.length === 0) {
    return;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const suffix = runId !== null && runId !== undefined && runId.length > 0 ? runId : stamp;
  const blob = new Blob([getScenarioTraceText()], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `device-board-trace-${suffix}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}
