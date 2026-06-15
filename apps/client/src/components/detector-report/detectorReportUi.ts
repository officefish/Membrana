import type { DroneDetectorName } from '@membrana/detector-report';

export const DRONE_DETECTOR_LABELS: Record<DroneDetectorName, string> = {
  harmonic: 'Гармонический (harmonic)',
  cepstral: 'Кепстральный (cepstral)',
  'spectral-flux': 'Спектральный поток (spectral-flux)',
  'template-match': 'Сопоставление шаблонов (template-match)',
};

export const TEMPLATE_MATCH_FIELD_LABELS: Record<string, string> = {
  centroid: 'Спектральный центр (среднее)',
  flux: 'Спектральный поток (среднее)',
  rms: 'Громкость RMS (среднее)',
  frameHitRatio: 'Доля тактов в диапазоне',
  centroidStd: 'Разброс центра (σ)',
  fluxStd: 'Разброс потока (σ)',
  rmsStd: 'Разброс громкости (σ)',
  activityRatio: 'Доля активных тактов',
  avgSilenceDuration: 'Средняя пауза',
  avgBurstDuration: 'Средний всплеск',
  frequencyJumps: 'Скачки частоты',
  volumeTrend: 'Тренд громкости',
  frequencyTrend: 'Тренд частоты',
  longTermStability: 'Долгосрочная стабильность',
  periodicity: 'Периодичность',
  envelopeShape: 'Форма огибающей',
  peakToAverageRatio: 'Пик / среднее',
};

export function matchTone(percent: number): string {
  if (percent >= 70) return 'text-success';
  if (percent >= 40) return 'text-warning';
  return 'text-error';
}

export function matchBarTone(percent: number): string {
  if (percent >= 70) return 'bg-success';
  if (percent >= 40) return 'bg-warning';
  return 'bg-error';
}

export function formatConfidencePercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function shortenReportId(reportId: string): string {
  if (reportId.length <= 16) return reportId;
  return `${reportId.slice(0, 8)}…${reportId.slice(-4)}`;
}
