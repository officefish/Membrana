/**
 * Оценка качества звукового потока для live-мониторинга.
 * Порт эвристик из packages/temp/three-param-analyzer (updateSoundQuality).
 */

export interface SoundQualityInput {
  readonly centroidHz: number;
  readonly flux: number;
  readonly rms: number;
  readonly rmsHistory: readonly number[];
}

export interface SoundQualityMetrics {
  /** 0…60 dB */
  readonly snr: number;
  /** 0…100 % */
  readonly clarity: number;
  /** 0…100 % */
  readonly dynamics: number;
  /** dB, обычно −60…0 */
  readonly peakDb: number;
  /** 0…100 % */
  readonly overall: number;
}

export interface SoundQualityWeights {
  readonly snr?: number;
  readonly clarity?: number;
  readonly dynamics?: number;
  readonly headroom?: number;
}

export interface SoundQualityOptions {
  readonly loudnessRefMax?: number;
  readonly weights?: SoundQualityWeights;
}

const DEFAULT_LOUDNESS_REF = 0.35;
const DEFAULT_WEIGHTS: Required<SoundQualityWeights> = {
  snr: 0.3,
  clarity: 0.3,
  dynamics: 0.2,
  headroom: 0.2,
};

export function estimateNoiseFloor(rmsHistory: readonly number[]): number {
  if (rmsHistory.length < 20) return 0.01;
  const sorted = [...rmsHistory].sort((a, b) => a - b);
  const bottom10 = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.1)));
  const avg = bottom10.reduce((sum, v) => sum + v, 0) / bottom10.length;
  return Math.max(0.005, avg);
}

export function evaluateClarity(centroidHz: number, flux: number): number {
  let score = 0;
  if (centroidHz >= 300 && centroidHz <= 2000) score += 0.5;
  else if (centroidHz < 300) score += 0.2;
  else score += 0.3;

  if (flux >= 0.3 && flux <= 1.5) score += 0.5;
  else if (flux < 0.3) score += 0.3;
  else score += 0.2;

  return score * 100;
}

export function evaluateDynamics(rmsHistory: readonly number[]): number {
  if (rmsHistory.length < 20) return 50;
  const maxRMS = Math.max(...rmsHistory);
  const minRMS = Math.min(...rmsHistory);
  if (maxRMS === 0) return 0;
  const dynamicRange = 20 * Math.log10(maxRMS / Math.max(minRMS, 1e-9));
  return Math.min(100, Math.max(0, (dynamicRange / 40) * 100));
}

export function evaluatePeakDb(
  rmsHistory: readonly number[],
  loudnessRefMax: number,
): number {
  const tail = rmsHistory.length > 0 ? rmsHistory.slice(-50) : [];
  const peak = tail.length > 0 ? Math.max(...tail) : 0;
  if (peak === 0) return -60;
  const peakDB = 20 * Math.log10(peak / loudnessRefMax);
  return Math.max(-60, Math.min(0, peakDB));
}

export function evaluateSoundQuality(
  input: SoundQualityInput,
  options?: SoundQualityOptions,
): SoundQualityMetrics {
  const loudnessRefMax = options?.loudnessRefMax ?? DEFAULT_LOUDNESS_REF;
  const w = { ...DEFAULT_WEIGHTS, ...options?.weights };

  const noise = estimateNoiseFloor(input.rmsHistory);
  const signalRms = input.rms;
  const snr =
    signalRms > 0 && noise > 0
      ? Math.min(60, Math.max(0, 20 * Math.log10(signalRms / noise)))
      : 0;

  const clarity = evaluateClarity(input.centroidHz, input.flux);
  const dynamics = evaluateDynamics(input.rmsHistory);
  const peakDb = evaluatePeakDb(input.rmsHistory, loudnessRefMax);

  const snrScore = Math.min(100, (snr / 40) * 100);
  const headroomScore = signalRms > loudnessRefMax ? 0 : 100;
  const overall = Math.min(
    100,
    Math.max(
      0,
      snrScore * w.snr +
        clarity * w.clarity +
        dynamics * w.dynamics +
        headroomScore * w.headroom,
    ),
  );

  return { snr, clarity, dynamics, peakDb, overall };
}

export type SoundQualityBadgeTone = 'success' | 'warning' | 'error';

export interface SoundQualityBadge {
  readonly label: string;
  readonly tone: SoundQualityBadgeTone;
}

export function soundQualityBadge(overall: number): SoundQualityBadge {
  if (overall >= 80) return { label: 'Отличное', tone: 'success' };
  if (overall >= 60) return { label: 'Хорошее', tone: 'success' };
  if (overall >= 40) return { label: 'Удовлетворительное', tone: 'warning' };
  if (overall >= 20) return { label: 'Плохое', tone: 'warning' };
  return { label: 'Очень плохое', tone: 'error' };
}

export function soundQualityHint(
  metrics: SoundQualityMetrics,
  input: SoundQualityInput,
  options?: SoundQualityOptions,
): string {
  const loudnessRefMax = options?.loudnessRefMax ?? DEFAULT_LOUDNESS_REF;

  if (input.rms > loudnessRefMax) {
    return 'Уровень сигнала слишком высокий — уменьшите громкость или отодвиньте микрофон.';
  }
  if (metrics.snr < 15) {
    return 'Низкое отношение сигнал/шум. Возможны помехи или слишком тихий источник.';
  }
  if (metrics.clarity < 40) {
    return 'Низкая чёткость звука. Проверьте положение микрофона и акустику.';
  }
  if (metrics.overall >= 80) {
    return 'Отличное качество звука для анализа.';
  }
  if (metrics.overall >= 60) {
    return 'Хорошее качество звука для анализа.';
  }
  if (metrics.overall >= 40) {
    return 'Удовлетворительное качество — возможны погрешности в метриках.';
  }
  return 'Плохое качество звука. Проверьте микрофон и обстановку.';
}
