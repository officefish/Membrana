import { getMonoChannel, loadAudioBuffer } from '@membrana/audio-engine-service';
import {
  collectMetricSamples,
  DEFAULT_FFT_SIZE,
} from '@membrana/template-match-detector-service';
import { classifyTrends } from '@membrana/trends-detector-service';

import {
  DRONE_TIGHT_MIN_CONFIDENCE,
  DRONE_TIGHT_TRENDS_INTERVAL_MS,
  DRONE_TIGHT_TRENDS_MEASUREMENTS_COUNT,
  getDroneTightEnabledTemplateKeys,
  getFreeV1ClassifyOptions,
  isDroneTightTrendsDetection,
  resolveTrendsTemplatesForAnalysis,
} from '@/lib/droneTightCalibration';

import type { VdrManifestSample, VdrTruthLabel } from './types';

export interface VdrTrendsVerdict {
  readonly isDrone: boolean;
  readonly confidence: number;
  readonly templateId: string | null;
}

const MIN_RMS = 0.02; // паритет с harness (HARNESS_TRENDS_DEFAULTS.minRms)

/**
 * Trends-вердикт по PCM — тот же путь, что benchmark-харнесс и
 * trends-fft-sample-analyzer: collectMetricSamples → classifyTrends
 * (curated DRONE_TIGHT + free-v1 классы; пользовательские шаблоны не
 * подмешиваются — паритет со скриптом benchmark:detectors).
 */
export function analyzeVdrPcm(samples: Float32Array, sampleRate: number): VdrTrendsVerdict {
  const metricSamples = collectMetricSamples(samples, sampleRate, {
    fftSize: DEFAULT_FFT_SIZE,
    intervalMs: DRONE_TIGHT_TRENDS_INTERVAL_MS,
    measurementsCount: DRONE_TIGHT_TRENDS_MEASUREMENTS_COUNT,
  });
  const templates = resolveTrendsTemplatesForAnalysis([], getDroneTightEnabledTemplateKeys());
  const result = classifyTrends(metricSamples, templates, {
    ...getFreeV1ClassifyOptions(DRONE_TIGHT_MIN_CONFIDENCE),
    activityRmsThreshold: MIN_RMS,
  });
  return {
    isDrone: isDroneTightTrendsDetection(result.detectedState, result.isDetected),
    confidence: result.confidence,
    templateId: result.isDetected ? result.detectedState : null,
  };
}

/** WAV-файл пилотного корпуса → trends-вердикт (звук только через audio-engine). */
export async function analyzeVdrFile(file: File): Promise<VdrTrendsVerdict> {
  const buffer = await loadAudioBuffer(file);
  return analyzeVdrPcm(getMonoChannel(buffer), buffer.sampleRate);
}

/** id сэмпла из имени файла корпуса (pilot-drone-001.wav → pilot-drone-001). */
export function sampleIdFromFileName(fileName: string): string {
  return fileName.replace(/\.wav$/i, '');
}

/** Парсинг манифеста пилота (файл из data/detectors-benchmark/vdr-hard-gate-pilot/). */
export function parseVdrManifest(raw: unknown): VdrManifestSample[] {
  const samples = (raw as { samples?: unknown })?.samples;
  if (!Array.isArray(samples)) {
    throw new Error('Манифест: ожидается поле samples[]');
  }
  return samples.map((sample) => {
    const { id, label, path } = sample as { id?: unknown; label?: unknown; path?: unknown };
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error('Манифест: у сэмпла нет id');
    }
    const truth: VdrTruthLabel =
      label === 'drone' || label === 'not-drone' ? label : 'unlabeled';
    return { id, label: truth, ...(typeof path === 'string' ? { path } : {}) };
  });
}
