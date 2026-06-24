import type { ScenarioStopReason } from './types.js';

/** Payload for server-side competition run verification (Phase 3 stub). */
export interface CompetitionRunLogPayload {
  readonly runId: string | null;
  readonly documentTitle?: string;
  readonly startedAtMs: number;
  readonly endedAtMs: number;
  readonly stopReason: ScenarioStopReason;
  readonly mainLoopIterations: number;
}
