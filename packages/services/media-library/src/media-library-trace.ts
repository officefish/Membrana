/** Optional trace hook for scenario/debug (no-op by default). */

export type MediaLibraryTraceHook = (
  event: string,
  context?: Readonly<Record<string, unknown>>,
) => void;

let traceHook: MediaLibraryTraceHook | null = null;

let traceIdProvider: (() => string | null) | null = null;

/** Register hook (e.g. device-board scenarioChainLog bridge in client). */
export function setMediaLibraryTraceHook(hook: MediaLibraryTraceHook | null): void {
  traceHook = hook;
}

/** Register optional trace id for media-server HTTP (e.g. scenario runId-tick). */
export function setMediaLibraryTraceIdProvider(provider: (() => string | null) | null): void {
  traceIdProvider = provider;
}

/** Resolve trace id for outgoing media API requests (null when unset). */
export function resolveMediaLibraryTraceId(): string | null {
  return traceIdProvider?.() ?? null;
}

/** Emit trace event when hook is set. */
export function mediaLibraryTrace(
  event: string,
  context?: Readonly<Record<string, unknown>>,
): void {
  traceHook?.(event, context);
}

/** High-resolution elapsed ms since `startedAt`. */
export function traceElapsedMs(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}
