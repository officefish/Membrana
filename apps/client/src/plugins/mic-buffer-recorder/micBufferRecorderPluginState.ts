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
  readonly storageMode: MediaLibraryStorageMode;
  readonly error: string | null;
  readonly effectiveFormat: MediaLibraryCaptureFormat;
}

class MicBufferRecorderPluginStateImpl {
  private streamLive = false;
  private mode: MediaLibraryRecordingMode = 'manual';
  private format: MediaLibraryCaptureFormat = 'wav';
  private manualPresetSec: ManualDurationPresetSec = 5;
  private autoSegmentSec: AutoSegmentPresetSec = 10;
  private pauseSec = 1;
  private isRecording = false;
  private elapsedSec = 0;
  private targetDurationSec = 5;
  private usedBytes = 0;
  private limitBytes = 0;
  private sampleCount = 0;
  private maxBufferSamples = 10;
  private recordingBlocked = false;
  private storageMode: MediaLibraryStorageMode = 'browser-limited-fallback';
  private error: string | null = null;
  private effectiveFormat: MediaLibraryCaptureFormat = 'wav';

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
  }): void {
    this.usedBytes = params.usedBytes;
    this.limitBytes = params.limitBytes;
    this.sampleCount = params.sampleCount;
    this.maxBufferSamples = params.maxBufferSamples;
    this.recordingBlocked = params.recordingBlocked;
    this.storageMode = params.storageMode;
    this.rebuild();
  }

  setError(error: string | null): void {
    this.error = error;
    this.rebuild();
  }

  reset(): void {
    this.streamLive = false;
    this.isRecording = false;
    this.elapsedSec = 0;
    this.error = null;
    this.rebuild();
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
      storageMode: this.storageMode,
      error: this.error,
      effectiveFormat: this.effectiveFormat,
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
