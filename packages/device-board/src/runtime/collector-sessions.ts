import {
  createReferenceValue,
  type ScenarioReferenceValue,
} from '@membrana/core';

/** Снимок очереди singleton после flush. */
export interface CollectorSessionFlushSnapshot {
  readonly deviceHandle: string;
  readonly sessionHandle: string;
  readonly refs: readonly ScenarioReferenceValue[];
  readonly flushedAtIso: string;
}

export type CollectorPayloadKind = 'AudioSampleRef' | 'FftFrameRef';

export type CollectorSessionRefKind = 'RecorderRef' | 'SpectralAnalyserRef';

const RECORDER_HANDLE_PREFIX = 'recorder:' as const;
const ANALYSER_HANDLE_PREFIX = 'analyser:' as const;

/** Стабильный handle singleton RecorderRef для deviceHandle. */
export function recorderSessionHandle(deviceHandle: string): string {
  return `${RECORDER_HANDLE_PREFIX}${deviceHandle}`;
}

/** Стабильный handle singleton SpectralAnalyserRef для deviceHandle. */
export function spectralAnalyserSessionHandle(deviceHandle: string): string {
  return `${ANALYSER_HANDLE_PREFIX}${deviceHandle}`;
}

function isValidPayloadRef(
  ref: ScenarioReferenceValue,
  expectedKind: CollectorPayloadKind,
): boolean {
  return ref.kind === expectedKind && ref.valid && ref.handle !== null && ref.handle.length > 0;
}

/**
 * Очередь ref'ов device-scoped singleton (Recorder / SpectralAnalyser).
 * Config policy на singleton — out of scope MVP (DBC0–DBC2).
 */
export class RefCollectorSession {
  private readonly queue: ScenarioReferenceValue[] = [];

  private readonly subscribers = new Set<string>();

  readonly deviceHandle: string;

  readonly sessionRefKind: CollectorSessionRefKind;

  readonly payloadKind: CollectorPayloadKind;

  readonly sessionHandle: string;

  constructor(options: {
    readonly deviceHandle: string;
    readonly sessionRefKind: CollectorSessionRefKind;
    readonly payloadKind: CollectorPayloadKind;
    readonly sessionHandle: string;
  }) {
    this.deviceHandle = options.deviceHandle;
    this.sessionRefKind = options.sessionRefKind;
    this.payloadKind = options.payloadKind;
    this.sessionHandle = options.sessionHandle;
  }

  /** Ссылка на singleton-сессию для GetRecorder / GetSpectralAnalyser. */
  getSessionRef(): ScenarioReferenceValue {
    return createReferenceValue(this.sessionRefKind, this.sessionHandle);
  }

  /** Текущая глубина очереди (без flush). */
  get queueDepth(): number {
    return this.queue.length;
  }

  /** Подписчики Collect-узлов (multicast, DBC3+). */
  get subscriberIds(): readonly string[] {
    return [...this.subscribers];
  }

  /** Регистрация Collect-узла; возвращает unsubscribe. */
  subscribe(collectNodeId: string): () => void {
    this.subscribers.add(collectNodeId);
    return () => {
      this.subscribers.delete(collectNodeId);
    };
  }

  /** Добавляет ref в очередь; игнорирует невалидные или чужой kind. */
  append(ref: ScenarioReferenceValue): boolean {
    if (!isValidPayloadRef(ref, this.payloadKind)) {
      return false;
    }
    this.queue.push(ref);
    return true;
  }

  /** Read-only снимок очереди без очистки. */
  peekQueue(): readonly ScenarioReferenceValue[] {
    return [...this.queue];
  }

  /** Сбрасывает очередь и возвращает снимок для downstream (NewTrack / trends). */
  flush(nowIso: string = new Date().toISOString()): CollectorSessionFlushSnapshot {
    const refs = [...this.queue];
    this.queue.length = 0;
    return {
      deviceHandle: this.deviceHandle,
      sessionHandle: this.sessionHandle,
      refs,
      flushedAtIso: nowIso,
    };
  }

  reset(): void {
    this.queue.length = 0;
    this.subscribers.clear();
  }
}

/**
 * Registry device-scoped singleton sessions (one Recorder + one SpectralAnalyser per deviceHandle).
 */
export class DeviceCollectorRegistry {
  private readonly recorders = new Map<string, RefCollectorSession>();

  private readonly analysers = new Map<string, RefCollectorSession>();

  getOrCreateRecorder(deviceHandle: string): RefCollectorSession {
    const existing = this.recorders.get(deviceHandle);
    if (existing !== undefined) {
      return existing;
    }
    const session = new RefCollectorSession({
      deviceHandle,
      sessionRefKind: 'RecorderRef',
      payloadKind: 'AudioSampleRef',
      sessionHandle: recorderSessionHandle(deviceHandle),
    });
    this.recorders.set(deviceHandle, session);
    return session;
  }

  getOrCreateSpectralAnalyser(deviceHandle: string): RefCollectorSession {
    const existing = this.analysers.get(deviceHandle);
    if (existing !== undefined) {
      return existing;
    }
    const session = new RefCollectorSession({
      deviceHandle,
      sessionRefKind: 'SpectralAnalyserRef',
      payloadKind: 'FftFrameRef',
      sessionHandle: spectralAnalyserSessionHandle(deviceHandle),
    });
    this.analysers.set(deviceHandle, session);
    return session;
  }

  getRecorderSessionRef(deviceHandle: string): ScenarioReferenceValue {
    return this.getOrCreateRecorder(deviceHandle).getSessionRef();
  }

  getSpectralAnalyserSessionRef(deviceHandle: string): ScenarioReferenceValue {
    return this.getOrCreateSpectralAnalyser(deviceHandle).getSessionRef();
  }

  appendSample(deviceHandle: string, sampleRef: ScenarioReferenceValue): boolean {
    return this.getOrCreateRecorder(deviceHandle).append(sampleRef);
  }

  appendFrame(deviceHandle: string, frameRef: ScenarioReferenceValue): boolean {
    return this.getOrCreateSpectralAnalyser(deviceHandle).append(frameRef);
  }

  flushRecorder(
    deviceHandle: string,
    nowIso?: string,
  ): CollectorSessionFlushSnapshot | null {
    const session = this.recorders.get(deviceHandle);
    if (session === undefined) {
      return null;
    }
    return session.flush(nowIso);
  }

  flushSpectralAnalyser(
    deviceHandle: string,
    nowIso?: string,
  ): CollectorSessionFlushSnapshot | null {
    const session = this.analysers.get(deviceHandle);
    if (session === undefined) {
      return null;
    }
    return session.flush(nowIso);
  }

  resetDevice(deviceHandle: string): void {
    this.recorders.get(deviceHandle)?.reset();
    this.analysers.get(deviceHandle)?.reset();
    this.recorders.delete(deviceHandle);
    this.analysers.delete(deviceHandle);
  }

  resetAll(): void {
    for (const session of this.recorders.values()) {
      session.reset();
    }
    for (const session of this.analysers.values()) {
      session.reset();
    }
    this.recorders.clear();
    this.analysers.clear();
  }
}

/** Фабрика registry для host bridge. */
export function createDeviceCollectorRegistry(): DeviceCollectorRegistry {
  return new DeviceCollectorRegistry();
}
