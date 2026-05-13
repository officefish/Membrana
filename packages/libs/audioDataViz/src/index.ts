/**
 * @membrana/audio-data-viz — React-компоненты и canvas-утилиты для визуализации аудио:
 * живой поток (AnalyserNode), одиночные кадры и типы для последовательностей кадров.
 */

export type { TimeDomainFrame, FrequencyFrame, AudioVisualizationFrame } from './types/frames';
export type { AudioFrameSequence } from './types/sequences';

export {
  getCanvasThemeColors,
  invalidateCanvasThemeColorCache,
  type CanvasThemeColors,
} from './theme/canvasThemeColors';

export {
  syncCanvasToCssBox,
  renderFftBarsCanvas,
  renderSpectrumLineCanvas,
  type SyncCanvasOptions,
  type SpectrumLineOptions,
} from './canvas/renderFrequencyVisualization';

export { QualityMeter, type QualityMeterProps } from './components/QualityMeter';
export { SpectrumBars, type SpectrumBarsProps } from './components/SpectrumBars';
export { VolumeMeter, type VolumeMeterProps } from './components/VolumeMeter';
export { Waveform, type WaveformProps } from './components/Waveform';

export {
  FftBarsSnapshotCanvas,
  SpectrumLineSnapshotCanvas,
  type FftBarsSnapshotCanvasProps,
  type SpectrumLineSnapshotCanvasProps,
} from './components/FrequencySnapshots';

export { LiveFftBarsCanvas, type LiveFftBarsCanvasProps } from './live/LiveFftBarsCanvas';
export {
  LiveSpectrumLineCanvas,
  type LiveSpectrumLineCanvasProps,
} from './live/LiveSpectrumLineCanvas';
export { useInvalidateCanvasThemeOnDataTheme } from './live/useInvalidateCanvasThemeOnDataTheme';

/** Обратные имена для постепенного переименования в приложениях. */
export { QualityMeter as QualityWidget } from './components/QualityMeter';
export { SpectrumBars as SpectrumWidget } from './components/SpectrumBars';
export { VolumeMeter as VolumeWidget } from './components/VolumeMeter';
export { Waveform as WaveformWidget } from './components/Waveform';
