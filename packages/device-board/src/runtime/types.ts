import type { RuntimeMode, ScenarioBlockKind, ScenarioSystemBranch } from '@membrana/core';

/** Фаза исполнения scenario runtime. */
export type ScenarioRuntimePhase =
  | 'idle'
  | 'initial'
  | 'main'
  | 'alarm'
  | 'onStop'
  | 'onDisconnect'
  | 'stopping'
  | 'stopped'
  | 'error';

/** Ветка scenario graph при исполнении блока. */
export type ScenarioRuntimeBranch = 'initial' | 'main' | 'alarm' | 'onStop' | 'onDisconnect';

/** Маппинг exec-ветки → ветви-обработчик для Event/dataflow (v0.4 DBR4). */
export function runtimeBranchToHandlerBranch(
  branch: ScenarioRuntimeBranch,
): 'initial' | 'onStop' | 'onDisconnect' | null {
  switch (branch) {
    case 'initial':
      return 'initial';
    case 'onStop':
      return 'onStop';
    case 'onDisconnect':
      return 'onDisconnect';
    default:
      return null;
  }
}

/** Причина остановки сценария (T1). */
export type ScenarioStopReason = 'user' | 'system';

/** Снимок состояния runtime для UI. */
export interface ScenarioRuntimeState {
  readonly phase: ScenarioRuntimePhase;
  readonly isRunning: boolean;
  /** Ручной режим (MP7b RT3): `alarm` форсит alarm-loop, `normal` — main + авто detection-front. */
  readonly mode: RuntimeMode;
  readonly activeBranch: ScenarioSystemBranch | null;
  readonly activeNodeId: string | null;
  readonly activeBlockKind: ScenarioBlockKind | null;
  readonly mainLoopIteration: number;
  readonly alarmLoopIteration: number;
  readonly lastStopReason: ScenarioStopReason | null;
  readonly lastError: string | null;
}

/** Событие журнала от блока write-journal. */
export interface ScenarioJournalEvent {
  readonly branch: ScenarioRuntimeBranch;
  readonly blockKind: ScenarioBlockKind;
  readonly nodeId: string;
  readonly message: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}

/** Результат trends-fft-detect (stub/real через host). */
export interface ScenarioDetectionResult {
  readonly detected: boolean;
  readonly confidence: number;
  readonly templateId?: string;
  readonly rawLevel?: number;
}

/** Результат evaluate-sound-level (alarm loop). */
export interface ScenarioSoundLevelResult {
  readonly rawLevel: number;
  readonly isQuietEnough: boolean;
}

export function createIdleScenarioRuntimeState(): ScenarioRuntimeState {
  return {
    phase: 'idle',
    isRunning: false,
    mode: 'normal',
    activeBranch: null,
    activeNodeId: null,
    activeBlockKind: null,
    mainLoopIteration: 0,
    alarmLoopIteration: 0,
    lastStopReason: null,
    lastError: null,
  };
}
