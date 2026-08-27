import { stopDecision, type BufferStopVerdict } from '@membrana/media-library-service';
import type {
  MediaLibraryCaptureFormat,
  MediaLibraryRecordingMode,
  MediaLibraryStorageMode,
} from '@membrana/media-library-service';

import type { AutoSegmentPresetSec, ManualDurationPresetSec } from './types';

export interface MicBufferRecorderSnapshot {
  readonly streamLive: boolean;
  readonly mode: MediaLibraryRecordingMode;
  readonly format: MediaLibraryCaptureFormat;
  readonly manualPresetSec: ManualDurationPresetSec;
  readonly autoSegmentSec: AutoSegmentPresetSec;
  readonly pauseSec: number;
  readonly isRecording: boolean;
  readonly elapsedSec: number;
  readonly targetDurationSec: number;
  readonly usedBytes: number;
  readonly limitBytes: number;
  readonly sampleCount: number;
  readonly maxBufferSamples: number;
  readonly recordingBlocked: boolean;
  /**
   * Вердикт буфера (#2204, режим 1) — ОДИН на показ и на решение гасить.
   *
   * Ревью #2214 нашло ложь оператору: панель считала вердикт сама и говорила
   * «остановлено» на 98%, а гасило запись только по `recordingBlocked`, то есть на 100%.
   * В окне между ними человек читал «остановлено», пока запись шла. Теперь вердикт
   * считается здесь, один раз, и по нему И говорят, И останавливают — разойтись нечему.
   */
  readonly bufferVerdict: BufferStopVerdict;
  readonly storageMode: MediaLibraryStorageMode;
  readonly serverReachable: boolean;
  readonly error: string | null;
  readonly effectiveFormat: MediaLibraryCaptureFormat;
  readonly bufferSampleCountPending: boolean;
}

const BUFFER_SAMPLE_COUNT_PENDING_TIMEOUT_MS = 30_000;

/** Имя того, что пишет, — одно на слово и на решение. */
const RECORDING_WHAT = 'запись в буфер';

class MicBufferRecorderPluginStateImpl {
  private streamLive = false;
  private mode: MediaLibraryRecordingMode = 'auto';
  private format: MediaLibraryCaptureFormat = 'wav';
  private manualPresetSec: ManualDurationPresetSec = 5;
  private autoSegmentSec: AutoSegmentPresetSec = 5;
  private pauseSec = 1;
  private isRecording = false;
  private elapsedSec = 0;
  private targetDurationSec = 5;
  private usedBytes = 0;
  private limitBytes = 0;
  private sampleCount = 0;
  private maxBufferSamples = 10;
  private recordingBlocked = false;
  private bufferVerdict: BufferStopVerdict = stopDecision({ usedBytes: 0, limitBytes: 0 }, { what: RECORDING_WHAT });
  private storageMode: MediaLibraryStorageMode = 'browser-limited-fallback';
  private serverReachable = true;
  private error: string | null = null;
  private effectiveFormat: MediaLibraryCaptureFormat = 'wav';
  private bufferSampleCountPending = false;
  private bufferSampleCountPendingTimeout: ReturnType<typeof setTimeout> | null = null;

  private listeners = new Set<() => void>();
  private snapshotCache: MicBufferRecorderSnapshot;

  constructor() {
    this.snapshotCache = this.buildSnapshot();
  }

  getSnapshot = (): MicBufferRecorderSnapshot => this.snapshotCache;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  syncConfig(params: {
    mode: MediaLibraryRecordingMode;
    format: MediaLibraryCaptureFormat;
    manualPresetSec: ManualDurationPresetSec;
    autoSegmentSec: AutoSegmentPresetSec;
    pauseSec: number;
    effectiveFormat: MediaLibraryCaptureFormat;
  }): void {
    this.mode = params.mode;
    this.format = params.format;
    this.manualPresetSec = params.manualPresetSec;
    this.autoSegmentSec = params.autoSegmentSec;
    this.pauseSec = params.pauseSec;
    this.effectiveFormat = params.effectiveFormat;
    this.rebuild();
  }

  setStreamLive(live: boolean): void {
    if (this.streamLive === live) return;
    this.streamLive = live;
    if (!live) {
      this.isRecording = false;
      this.elapsedSec = 0;
    }
    this.rebuild();
  }

  setRecording(params: {
    isRecording: boolean;
    elapsedSec?: number;
    targetDurationSec?: number;
  }): void {
    this.isRecording = params.isRecording;
    if (params.elapsedSec != null) this.elapsedSec = params.elapsedSec;
    if (params.targetDurationSec != null) this.targetDurationSec = params.targetDurationSec;
    this.rebuild();
  }

  setElapsedSec(elapsedSec: number): void {
    this.elapsedSec = elapsedSec;
    this.rebuild();
  }

  setQuota(params: {
    usedBytes: number;
    limitBytes: number;
    sampleCount: number;
    maxBufferSamples: number;
    recordingBlocked: boolean;
    storageMode: MediaLibraryStorageMode;
    serverReachable: boolean;
  }): void {
    this.usedBytes = params.usedBytes;
    this.limitBytes = params.limitBytes;
    this.sampleCount = params.sampleCount;
    this.maxBufferSamples = params.maxBufferSamples;
    this.recordingBlocked = params.recordingBlocked;
    this.bufferVerdict = stopDecision(
      { usedBytes: params.usedBytes, limitBytes: params.limitBytes },
      { what: RECORDING_WHAT },
    );
    this.storageMode = params.storageMode;
    this.serverReachable = params.serverReachable;
    this.rebuild();
  }

  setError(error: string | null): void {
    this.error = error;
    this.rebuild();
  }

  setBufferSampleCountPending(pending: boolean): void {
    if (this.bufferSampleCountPending === pending) return;
    this.bufferSampleCountPending = pending;
    if (pending) {
      this.clearBufferSampleCountPendingTimeout();
      this.bufferSampleCountPendingTimeout = setTimeout(() => {
        this.bufferSampleCountPending = false;
        this.bufferSampleCountPendingTimeout = null;
        this.rebuild();
      }, BUFFER_SAMPLE_COUNT_PENDING_TIMEOUT_MS);
    } else {
      this.clearBufferSampleCountPendingTimeout();
    }
    this.rebuild();
  }

  reset(): void {
    this.streamLive = false;
    this.isRecording = false;
    this.elapsedSec = 0;
    this.error = null;
    this.setBufferSampleCountPending(false);
    this.rebuild();
  }

  private clearBufferSampleCountPendingTimeout(): void {
    if (this.bufferSampleCountPendingTimeout != null) {
      clearTimeout(this.bufferSampleCountPendingTimeout);
      this.bufferSampleCountPendingTimeout = null;
    }
  }

  private rebuild(): void {
    this.snapshotCache = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }

  private buildSnapshot(): MicBufferRecorderSnapshot {
    return {
      streamLive: this.streamLive,
      mode: this.mode,
      format: this.format,
      manualPresetSec: this.manualPresetSec,
      autoSegmentSec: this.autoSegmentSec,
      pauseSec: this.pauseSec,
      isRecording: this.isRecording,
      elapsedSec: this.elapsedSec,
      targetDurationSec: this.targetDurationSec,
      usedBytes: this.usedBytes,
      limitBytes: this.limitBytes,
      sampleCount: this.sampleCount,
      maxBufferSamples: this.maxBufferSamples,
      recordingBlocked: this.recordingBlocked,
      bufferVerdict: this.bufferVerdict,
      storageMode: this.storageMode,
      serverReachable: this.serverReachable,
      error: this.error,
      effectiveFormat: this.effectiveFormat,
      bufferSampleCountPending: this.bufferSampleCountPending,
    };
  }
}

export const micBufferRecorderPluginState = new MicBufferRecorderPluginStateImpl();

export interface MicBufferRecorderController {
  startManualRecording(): void;
  stopManualRecording(): void;
  setMode(mode: MediaLibraryRecordingMode): void;
}

let activeController: MicBufferRecorderController | null = null;

export function registerMicBufferRecorderController(
  controller: MicBufferRecorderController | null,
): void {
  activeController = controller;
}

export function requestStartManualRecording(): void {
  activeController?.startManualRecording();
}

export function requestStopManualRecording(): void {
  activeController?.stopManualRecording();
}

export function requestSetMicBufferMode(mode: MediaLibraryRecordingMode): void {
  activeController?.setMode(mode);
}
