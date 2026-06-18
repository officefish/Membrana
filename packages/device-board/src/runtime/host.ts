import type { ScenarioBlockKind, ScenarioReferenceValue } from '@membrana/core';

import type { ScenarioDetectionResult, ScenarioJournalEvent, ScenarioSoundLevelResult } from './types.js';
import type { ScenarioVariableStore } from './variable-store.js';

/** Описание микрофона из enumerate (host → UI dropdown GetMicrophone). */
export interface ScenarioMicrophoneOption {
  readonly deviceId: string;
  readonly label: string;
}

/** Колбэки потери/восстановления соединения (H3b). */
export interface ScenarioConnectionHandlers {
  readonly onDisconnect: () => void;
  readonly onReconnect: () => void;
}

/** Порты исполнения блоков — реализует `apps/client` (audio, journal, detectors). */
export interface ScenarioRuntimeHost {
  /** Handle подключённого устройства для Event/dataflow (v0.4 DBR4). */
  readonly getDeviceHandle?: () => string | null;
  /** Хранилище переменных сценария; stub создаёт in-memory store. */
  readonly variableStore?: ScenarioVariableStore;
  readonly getScenarioVariable?: (id: string) => ScenarioReferenceValue | null;
  readonly setScenarioVariable?: (id: string, value: ScenarioReferenceValue | null) => void;
  /** Список микрофонов устройства (audio-engine enumerate, DBR5). */
  readonly enumerateMicrophones?: () => Promise<readonly ScenarioMicrophoneOption[]>;
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
  const variableStore = overrides.variableStore;
  return {
    getDeviceHandle: overrides.getDeviceHandle ?? (() => 'stub-device'),
    variableStore,
    getScenarioVariable:
      overrides.getScenarioVariable ??
      (variableStore !== undefined ? (id) => variableStore.getValue(id) : undefined),
    setScenarioVariable:
      overrides.setScenarioVariable ??
      (variableStore !== undefined ? (id, value) => variableStore.setValue(id, value) : undefined),
    enumerateMicrophones:
      overrides.enumerateMicrophones ??
      (async () => [{ deviceId: 'default', label: 'Default microphone' }]),
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
