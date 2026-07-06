/**
 * ND2 — нейро-детекция дрона по сэмплу библиотеки (YAMNet, zero-shot).
 * UC2 free-тарифа: тот же сценарий, что спектральный, но нейросетью.
 */
import type { DetectionResult } from '@membrana/detector-base';
import { DEFAULT_DRONE_SCORE_THRESHOLD } from '@membrana/yamnet-detector-service';

export const NEURAL_DRONE_ANALYZER_PLUGIN_ID = 'neural-drone-analyzer';

export interface NeuralDroneAnalyzerPluginConfig {
  /** Автозапуск анализа по окончании воспроизведения сэмпла. */
  readonly autoAnalyzeOnEnd: boolean;
  /** Порог drone-score для вердикта (0..1); до калибровки ND3 — дефолт пакета. */
  readonly droneScoreThreshold: number;
}

export const defaultNeuralDroneAnalyzerConfig: NeuralDroneAnalyzerPluginConfig = {
  autoAnalyzeOnEnd: true,
  droneScoreThreshold: DEFAULT_DRONE_SCORE_THRESHOLD,
};

export function resolveNeuralDroneAnalyzerConfig(
  raw: Partial<NeuralDroneAnalyzerPluginConfig> | undefined,
): NeuralDroneAnalyzerPluginConfig {
  const threshold = Number(
    raw?.droneScoreThreshold ?? defaultNeuralDroneAnalyzerConfig.droneScoreThreshold,
  );
  return {
    autoAnalyzeOnEnd:
      typeof raw?.autoAnalyzeOnEnd === 'boolean'
        ? raw.autoAnalyzeOnEnd
        : defaultNeuralDroneAnalyzerConfig.autoAnalyzeOnEnd,
    droneScoreThreshold: Number.isFinite(threshold)
      ? Math.min(1, Math.max(0, threshold))
      : defaultNeuralDroneAnalyzerConfig.droneScoreThreshold,
  };
}

/**
 * Фаза плагина: загрузка модели отделена от анализа — прогрев виден в UI честно.
 * `model-error` ≠ `error`: провал прогрева не выдаётся за провал анализа
 * (P2#2 ревью ND2); повторный запуск анализа заново инициирует загрузку.
 */
export type NeuralAnalysisStatus =
  | 'idle'
  | 'model-loading'
  | 'model-error'
  | 'analyzing'
  | 'ready'
  | 'error';

export interface NeuralDroneSnapshot {
  readonly status: NeuralAnalysisStatus;
  readonly modelReady: boolean;
  readonly lastResult: DetectionResult | null;
  readonly analyzedSampleId: string | null;
  readonly analyzedSampleTitle: string | null;
  readonly selectedSampleId: string | null;
  readonly selectedSampleTitle: string | null;
  readonly blockedReason: string | null;
  readonly errorMessage: string | null;
}
