import {
  DEFAULT_RECORDING_POLICY,
  resolveScenarioRecordingPolicy,
  type ScenarioRecordingPolicy,
} from '@membrana/core';

/** Состояние rolling-записи per device (host-side, v0.7). */
export class RecorderRecordingSession {
  private startedAtMs: number | null = null;

  private windowSec = DEFAULT_RECORDING_POLICY.windowSec;

  private active = false;

  /** Старт или перезапуск окна записи. */
  start(policy: Partial<ScenarioRecordingPolicy> | undefined, nowMs: number): void {
    const resolved = resolveScenarioRecordingPolicy(policy);
    this.windowSec = resolved.windowSec;
    this.startedAtMs = nowMs;
    this.active = true;
  }

  /** Завершение окна (StopRecording); elapsed сбрасывается до следующего start. */
  stop(): void {
    this.active = false;
    this.startedAtMs = null;
  }

  /** True, если StartRecording активен и окно не закрыто Stop. */
  isActive(): boolean {
    return this.active;
  }

  /** Elapsed сек с StartRecording; 0 если не active. */
  getElapsedSec(nowMs: number): number {
    if (!this.active || this.startedAtMs === null) {
      return 0;
    }
    return (nowMs - this.startedAtMs) / 1000;
  }

  /** Gate: elapsed >= windowSec (override или policy узла). */
  isWindowFull(nowMs: number, windowSecOverride?: number): boolean {
    if (!this.active) {
      return false;
    }
    const targetSec =
      windowSecOverride !== undefined && Number.isFinite(windowSecOverride)
        ? windowSecOverride
        : this.windowSec;
    return this.getElapsedSec(nowMs) >= targetSec;
  }

  /** Текущий windowSec policy. */
  getWindowSec(): number {
    return this.windowSec;
  }
}
