/**
 * Дефолтная конфигурация и пресеты для AudioAnalyzer.
 */

import type { AudioAnalyzerConfig, DetectionThresholds } from './types.js';

/** Безопасные значения по умолчанию. */
export const DEFAULT_CONFIG: AudioAnalyzerConfig = {
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  detectionThresholds: {
    centroidMin: 200,
    centroidMax: 800,
    fluxMin: 0,
    fluxMax: 1.5,
    rmsMin: 0.01,
    rmsMax: 1.0,
  },
  liveMode: {
    intervalMs: 30,
    minRMS: 0.02,
    frequencyRange: { min: 50, max: 15_000 },
  },
  advancedAnalysis: {
    enabled: false,
    calculateSpectrum: false,
    calculateStatistics: true,
    calculateTemporalPatterns: false,
  },
};

/**
 * Готовые пресеты для типовых задач.
 * Применяются через `analyzer.updateConfig(PRESETS.drone)`.
 */
export const PRESETS: Record<'drone' | 'speech' | 'music', Partial<AudioAnalyzerConfig>> = {
  drone: {
    detectionThresholds: {
      centroidMin: 200,
      centroidMax: 800,
      fluxMin: 0,
      fluxMax: 1.5,
      rmsMin: 0.01,
      rmsMax: 1.0,
    },
  },
  speech: {
    detectionThresholds: {
      centroidMin: 300,
      centroidMax: 3_000,
      fluxMin: 0.1,
      fluxMax: 3.0,
      rmsMin: 0.02,
      rmsMax: 0.8,
    },
  },
  music: {
    fftSize: 4_096,
    smoothingTimeConstant: 0.6,
    detectionThresholds: {
      centroidMin: 100,
      centroidMax: 5_000,
      fluxMin: 0.05,
      fluxMax: 5.0,
      rmsMin: 0.005,
      rmsMax: 1.5,
    },
  },
};

/** Хелпер: применить пресет поверх дефолта, не мутируя исходный объект. */
export function applyPreset(
  preset: Partial<AudioAnalyzerConfig>,
): AudioAnalyzerConfig {
  return {
    ...DEFAULT_CONFIG,
    ...preset,
    detectionThresholds: {
      ...DEFAULT_CONFIG.detectionThresholds,
      ...(preset.detectionThresholds as Partial<DetectionThresholds> | undefined),
    } as DetectionThresholds,
    liveMode: { ...DEFAULT_CONFIG.liveMode, ...(preset.liveMode ?? {}) },
    advancedAnalysis: {
      ...DEFAULT_CONFIG.advancedAnalysis,
      ...(preset.advancedAnalysis ?? {}),
    },
  };
}
