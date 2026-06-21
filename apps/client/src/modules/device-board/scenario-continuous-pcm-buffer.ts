/** Непрерывный PCM-буфер per device для MakeTrack без ref-queue concat. */
export class ScenarioContinuousPcmBuffer {
  private readonly chunks: Float32Array[] = [];

  private sampleRate: number | null = null;

  /** Добавляет PCM-чанк (последовательные get-sample). */
  append(samples: Float32Array, sampleRate: number): void {
    if (this.sampleRate === null) {
      this.sampleRate = sampleRate;
    }
    this.chunks.push(samples);
  }

  /** Снимок и очистка — после flush MakeTrack. */
  takeSlice(): { readonly samples: Float32Array; readonly sampleRate: number } | null {
    if (this.chunks.length === 0 || this.sampleRate === null) {
      return null;
    }
    const sampleRate = this.sampleRate;
    const total = this.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Float32Array(total);
    let offset = 0;
    for (const chunk of this.chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    this.reset();
    return { samples: merged, sampleRate };
  }

  reset(): void {
    this.chunks.length = 0;
    this.sampleRate = null;
  }
}
