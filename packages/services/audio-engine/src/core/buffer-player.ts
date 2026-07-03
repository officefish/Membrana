/**
 * BufferPlayer — воспроизводит AudioBuffer и одновременно публикует поток
 * AudioSampleFrame, аналогично LiveSampler, но источник — не MediaStream,
 * а декодированный буфер.
 */

import { logger } from '@membrana/core';

import {
  type AudioSampleFrame,
  DEFAULT_LIVE_CAPTURE_CONFIG,
  type LiveCaptureConfig,
  type SampleFrameHandler,
} from '../types.js';

import { closeAudioContext, createAudioContext } from './audio-context.js';
import { scheduleFadeOut } from './fade-out.js';
import { clampPlaybackOffset } from './playback-offset.js';
import {
  registerActivePlayback,
  unregisterActivePlayback,
} from './playback-registry.js';

export type BufferPlayerState =
  | 'idle'
  | 'starting'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'stopped'
  | 'error';

export type BufferPlayerEvent = 'start' | 'stop' | 'ended' | 'frame' | 'error' | 'progress';

export interface BufferPlayerProgress {
  readonly currentSec: number;
  readonly durationSec: number;
}

export interface BufferPlayerEventMap {
  start: void;
  stop: void;
  ended: void;
  frame: AudioSampleFrame;
  error: Error;
  progress: BufferPlayerProgress;
}

export interface BufferPlayerPlayOptions {
  readonly startOffsetSec?: number;
}

/** CT6 (канон §3.1): 0/умолчание = hard-cut (emergency), >0 = graceful fade. */
export interface BufferPlayerStopOptions {
  readonly fadeOutMs?: number;
}

type Listener<E extends BufferPlayerEvent> = (
  payload: BufferPlayerEventMap[E],
) => void;

export class BufferPlayer {
  private config: LiveCaptureConfig;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private fadeOutInProgress = false;
  private rafId: number | null = null;
  private state: BufferPlayerState = 'idle';
  private currentBuffer: AudioBuffer | null = null;
  private startOffsetSec = 0;
  private playheadAnchor = 0;
  private pausedAtSec = 0;

  private readonly listeners: {
    [K in BufferPlayerEvent]: Set<Listener<K>>;
  } = {
    start: new Set(),
    stop: new Set(),
    ended: new Set(),
    frame: new Set(),
    error: new Set(),
    progress: new Set(),
  };

  constructor(config: Partial<LiveCaptureConfig> = {}) {
    this.config = { ...DEFAULT_LIVE_CAPTURE_CONFIG, ...config };
  }

  on<E extends BufferPlayerEvent>(event: E, listener: Listener<E>): void {
    this.listeners[event].add(listener as Listener<E>);
  }

  off<E extends BufferPlayerEvent>(event: E, listener: Listener<E>): void {
    this.listeners[event].delete(listener as Listener<E>);
  }

  onFrame(handler: SampleFrameHandler): () => void {
    this.on('frame', handler);
    return () => this.off('frame', handler);
  }

  private emit<E extends BufferPlayerEvent>(
    event: E,
    payload: BufferPlayerEventMap[E],
  ): void {
    for (const fn of this.listeners[event]) {
      try {
        (fn as (p: BufferPlayerEventMap[E]) => void)(payload);
      } catch (err) {
        logger.error('BufferPlayer listener threw', { event, err });
      }
    }
  }

  getState(): BufferPlayerState {
    return this.state;
  }

  isPlaying(): boolean {
    return this.state === 'playing';
  }

  getConfig(): LiveCaptureConfig {
    return this.config;
  }

  updateConfig(patch: Partial<LiveCaptureConfig>): void {
    this.config = { ...this.config, ...patch };
    if (this.analyserNode) {
      this.analyserNode.fftSize = this.config.bufferSize;
      this.analyserNode.smoothingTimeConstant = this.config.smoothingTimeConstant;
    }
  }

  getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  getDurationSec(): number {
    return this.currentBuffer?.duration ?? 0;
  }

  getCurrentTimeSec(): number {
    if (this.state === 'playing' && this.audioContext) {
      const elapsed = this.audioContext.currentTime - this.playheadAnchor;
      return clampPlaybackOffset(this.startOffsetSec + elapsed, this.getDurationSec());
    }
    if (this.state === 'paused') {
      return this.pausedAtSec;
    }
    return 0;
  }

  async play(buffer: AudioBuffer, options: BufferPlayerPlayOptions = {}): Promise<void> {
    await this.teardownPlayback();
    this.currentBuffer = buffer;
    this.startOffsetSec = clampPlaybackOffset(
      options.startOffsetSec ?? 0,
      buffer.duration,
    );
    this.state = 'starting';

    try {
      this.audioContext = createAudioContext();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = this.config.bufferSize;
      this.analyserNode.smoothingTimeConstant = this.config.smoothingTimeConstant;

      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = buffer;
      // CT6: gain ПОСЛЕ analyser — fade гасит слышимый выход,
      // не искажая данные анализа (frame/fft читаются до gain).
      this.gainNode = this.audioContext.createGain();
      this.sourceNode.connect(this.analyserNode);
      this.analyserNode.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.sourceNode.onended = (): void => {
        if (this.state !== 'playing') return;
        this.emit('ended', undefined);
        void this.stop();
      };

      await this.audioContext.resume();
      this.playheadAnchor = this.audioContext.currentTime;
      this.sourceNode.start(0, this.startOffsetSec);
      this.state = 'playing';
      registerActivePlayback(this);
      this.emit('start', undefined);
      this.startLoop();
    } catch (err) {
      this.state = 'error';
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('error', error);
      await this.stop();
      throw error;
    }
  }

  async pause(): Promise<void> {
    if (this.state !== 'playing') return;
    this.pausedAtSec = this.getCurrentTimeSec();
    await this.teardownPlayback();
    this.state = 'paused';
    this.emit('stop', undefined);
    this.emitProgress();
  }

  async resume(): Promise<void> {
    if (!this.currentBuffer || this.state !== 'paused') return;
    await this.play(this.currentBuffer, { startOffsetSec: this.pausedAtSec });
  }

  async seek(offsetSec: number): Promise<void> {
    if (!this.currentBuffer) return;
    const next = clampPlaybackOffset(offsetSec, this.currentBuffer.duration);
    const wasPlaying = this.state === 'playing';
    this.pausedAtSec = next;
    if (wasPlaying) {
      await this.play(this.currentBuffer, { startOffsetSec: next });
    } else if (this.state === 'paused' || this.state === 'stopped' || this.state === 'ended') {
      this.state = 'paused';
      this.emitProgress();
    }
  }

  /**
   * CT6 (канон §3.1/§3.3): `fadeOutMs > 0` — graceful затухание перед
   * teardown (вытеснение захватом = 200 мс); 0/умолчание — hard-cut
   * (emergency stop). Повторный stop во время fade режет немедленно.
   * Без permission-проверок — engine останавливается для любого вызывающего.
   */
  async stop(options: BufferPlayerStopOptions = {}): Promise<void> {
    const wasActive =
      this.state === 'playing' ||
      this.state === 'starting' ||
      this.state === 'paused';

    const fadeOutMs = options.fadeOutMs ?? 0;
    if (
      fadeOutMs > 0 &&
      this.state === 'playing' &&
      !this.fadeOutInProgress &&
      this.gainNode !== null &&
      this.audioContext !== null
    ) {
      this.fadeOutInProgress = true;
      const settleMs = scheduleFadeOut(
        this.gainNode.gain,
        this.audioContext.currentTime,
        fadeOutMs,
      );
      await new Promise<void>((resolve) => {
        setTimeout(resolve, settleMs);
      });
      // Emergency stop (fadeOutMs=0) во время fade уже мог снести playback.
      if (this.state !== 'playing') {
        this.fadeOutInProgress = false;
        return;
      }
    }
    this.fadeOutInProgress = false;

    await this.teardownPlayback();
    this.currentBuffer = null;
    this.startOffsetSec = 0;
    this.pausedAtSec = 0;
    this.state = 'stopped';
    if (wasActive) this.emit('stop', undefined);
  }

  private async teardownPlayback(): Promise<void> {
    unregisterActivePlayback(this);
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.onended = null;
        this.sourceNode.stop();
      } catch {
        /* already stopped */
      }
      try {
        this.sourceNode.disconnect();
      } catch {
        /* already disconnected */
      }
      this.sourceNode = null;
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.audioContext) {
      await closeAudioContext(this.audioContext);
      this.audioContext = null;
    }
  }

  private emitProgress(): void {
    this.emit('progress', {
      currentSec: this.getCurrentTimeSec(),
      durationSec: this.getDurationSec(),
    });
  }

  private startLoop(): void {
    if (!this.analyserNode || !this.audioContext) return;

    const bufferSize = this.config.bufferSize;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = new Float32Array(bufferSize);

    const loop = (): void => {
      if (this.state !== 'playing' || !this.analyserNode) return;
      this.analyserNode.getFloatTimeDomainData(buffer);

      const frame: AudioSampleFrame = {
        samples: new Float32Array(buffer),
        sampleRate,
        timestamp: Date.now(),
      };
      this.emit('frame', frame);
      this.emitProgress();

      this.rafId = requestAnimationFrame(loop);
    };
    loop();
  }
}
