import type { ScenarioBlockKind } from '@membrana/core';

import type { ScenarioDetectionResult, ScenarioJournalEvent, ScenarioSoundLevelResult } from './types.js';

/** Колбэки потери/восстановления соединения (H3b). */
export interface ScenarioConnectionHandlers {
  readonly onDisconnect: () => void;
  readonly onReconnect: () => void;
}

/** Порты исполнения блоков — реализует `apps/client` (audio, journal, detectors). */
export interface ScenarioRuntimeHost {
  readonly selectMicrophone: () => Promise<void>;
  readonly startStream: () => Promise<void>;
  readonly stopStream: () => Promise<void>;
  readonly writeJournal: (event: ScenarioJournalEvent) => Promise<void>;
  readonly recordChunk: (options: { readonly durationMs: number }) => Promise<{ readonly clipId: string }>;
  readonly trendsFftDetect: () => Promise<ScenarioDetectionResult>;
  readonly evaluateSoundLevel: () => Promise<ScenarioSoundLevelResult>;
  readonly log: (message: string, context?: Readonly<Record<string, unknown>>) => void;
  readonly watchConnection?: (handlers: ScenarioConnectionHandlers) => () => void;
}

/** Заглушка host для тестов и playground. */
export function createStubScenarioRuntimeHost(
  overrides: Partial<ScenarioRuntimeHost> = {},
): ScenarioRuntimeHost {
  const log = overrides.log ?? (() => undefined);
  return {
    selectMicrophone: overrides.selectMicrophone ?? (async () => log('selectMicrophone')),
    startStream: overrides.startStream ?? (async () => log('startStream')),
    stopStream: overrides.stopStream ?? (async () => log('stopStream')),
    writeJournal: overrides.writeJournal ?? (async (event) => log('writeJournal', { blockKind: event.blockKind })),
    recordChunk:
      overrides.recordChunk ??
      (async () => {
        log('recordChunk');
        return { clipId: 'stub-clip' };
      }),
    trendsFftDetect:
      overrides.trendsFftDetect ??
      (async () => ({
        detected: false,
        confidence: 0,
        templateId: 'stub',
      })),
    evaluateSoundLevel:
      overrides.evaluateSoundLevel ??
      (async () => ({
        rawLevel: 0.5,
        isQuietEnough: false,
      })),
    watchConnection: overrides.watchConnection,
    log,
  };
}

export const SUPPORTED_H2B_BLOCK_KINDS = [
  'select-microphone',
  'start-stream',
  'write-journal',
  'record-chunk',
  'trends-fft-detect',
  'evaluate-sound-level',
  'stop-scenario',
] as const satisfies readonly ScenarioBlockKind[];
