import type { AudioVisualizationFrame } from './frames';

/**
 * Упорядоченная последовательность кадров (например STFT по файлу,
 * серия снимков метрик или буфер для скруббера).
 */
export interface AudioFrameSequence<
  TFrame extends AudioVisualizationFrame = AudioVisualizationFrame,
> {
  readonly frames: readonly TFrame[];
  /**
   * Монотонные метки времени кадров, мс (та же длина, что у `frames`),
   * если известны; иначе индекс кадра можно трактовать как порядковый номер.
   */
  readonly frameTimesMs?: readonly number[];
}
