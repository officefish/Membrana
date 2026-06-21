/**
 * Correlation context for device-board scenario chain logs (client-only).
 * Populated from scenario-runtime host.log events and bridge entry points.
 */

export type ScenarioTraceContext = Readonly<{
  runId: string | null;
  tick: number | null;
  branch: string | null;
  nodeId: string | null;
}>;

let runId: string | null = null;
let tick: number | null = null;
let branch: string | null = null;
let nodeId: string | null = null;

export function getScenarioTraceContext(): ScenarioTraceContext {
  return { runId, tick, branch, nodeId };
}

export function resetScenarioTraceContext(): void {
  runId = null;
  tick = null;
  branch = null;
  nodeId = null;
}

export function setScenarioTraceRunId(id: string): void {
  runId = id;
}

export function setScenarioTraceTick(value: number | null): void {
  tick = value;
}

export function setScenarioTraceBranch(value: string | null): void {
  branch = value;
}

export function setScenarioTraceNodeId(id: string | null): void {
  nodeId = id;
}

/** Build media-server trace id `{runId}-{tick}` when run is active. */
export function buildScenarioTraceId(): string | null {
  if (runId === null) {
    return null;
  }
  if (tick === null) {
    return runId;
  }
  return `${runId}-${tick}`;
}

/** Merge trace fields into log context (omit nulls). */
export function withScenarioTraceContext(
  context?: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> | undefined {
  const trace: Record<string, unknown> = {};
  if (runId !== null) trace.runId = runId;
  if (tick !== null) trace.tick = tick;
  if (branch !== null) trace.branch = branch;
  if (nodeId !== null) trace.nodeId = nodeId;
  if (Object.keys(trace).length === 0) {
    return context;
  }
  return context === undefined ? trace : { ...trace, ...context };
}
