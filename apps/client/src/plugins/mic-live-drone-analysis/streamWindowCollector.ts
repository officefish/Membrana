import type { AudioSampleFrame } from '@membrana/audio-engine-service';

export interface StreamWindowAudio {
  readonly samples: Float32Array;
  readonly sampleRate: number;
  readonly durationSec: number;
}

/** Accumulates mic frames until wall-clock window duration elapses. */
export class StreamWindowCollector {
  private frames: AudioSampleFrame[] = [];
  private windowStartAt = 0;
  private collecting = false;
  private windowSec = 3;

  begin(windowSec: number): void {
    this.windowSec = windowSec;
    this.frames = [];
    this.windowStartAt = Date.now();
    this.collecting = true;
  }

  isCollecting(): boolean {
    return this.collecting;
  }

  elapsedMs(): number {
    if (!this.collecting) return 0;
    return Date.now() - this.windowStartAt;
  }

  /** Push frame; returns true when window duration reached. */
  push(frame: AudioSampleFrame): boolean {
    if (!this.collecting) return false;
    this.frames.push(frame);
    return this.elapsedMs() >= this.windowSec * 1000;
  }

  finish(): StreamWindowAudio {
    this.collecting = false;
    if (this.frames.length === 0) {
      throw new Error('Stream window has no audio frames');
    }
    const sampleRate = this.frames[0]!.sampleRate;
    const totalLength = this.frames.reduce((sum, frame) => sum + frame.samples.length, 0);
    const samples = new Float32Array(totalLength);
    let offset = 0;
    for (const frame of this.frames) {
      samples.set(frame.samples, offset);
      offset += frame.samples.length;
    }
    return {
      samples,
      sampleRate,
      durationSec: samples.length / sampleRate,
    };
  }

  reset(): void {
    this.frames = [];
    this.collecting = false;
    this.windowStartAt = 0;
  }
}
