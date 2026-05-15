import type { FftThresholdTestReport } from './buildFftThresholdTestReport';
import {
  formatRawCentroid,
  formatRawFlux,
  formatRawLoudness,
} from './normalizeMetrics';
import { STRICTNESS_LABELS } from './types';

export function reportExportBasename(report: FftThresholdTestReport): string {
  return `fft-threshold-test_${report.testId}`;
}

export function toJsonString(report: FftThresholdTestReport): string {
  return JSON.stringify(report, null, 2);
}

function boolMark(ok: boolean): string {
  return ok ? 'да' : 'нет';
}

function tickMark(passed: boolean): string {
  return passed ? '✓' : '✗';
}

export function toPlainText(report: FftThresholdTestReport): string {
  const finished = new Date(report.finishedAt).toLocaleString('ru-RU');
  const modeLabel = report.mode === 'auto' ? 'авто' : 'ручной';
  const detected = report.isDetected ? 'Обнаружено' : 'Не обнаружено';
  const lines: string[] = [
    'FFT пороговый тест — отчёт',
    '========================',
    '',
    `ID: ${report.testId}`,
    `Завершён: ${finished}`,
    `Режим: ${modeLabel}`,
    `Строгость: ${STRICTNESS_LABELS[report.strictness]}`,
    `Интервал: ${report.intervalMs} мс`,
    `Итог: ${detected}`,
    `Кадры: ${report.passedCount}/${report.frameCount} (${(report.passRate * 100).toFixed(0)}%)`,
    '',
    'Пороги (сырые):',
    `  Центроид: ${formatRawCentroid(report.thresholds.centroid.min)} … ${formatRawCentroid(report.thresholds.centroid.max)}`,
    `  Поток: ${formatRawFlux(report.thresholds.flux.min)} … ${formatRawFlux(report.thresholds.flux.max)}`,
    `  Громкость: ${formatRawLoudness(report.thresholds.rms.min)} … ${formatRawLoudness(report.thresholds.rms.max)}`,
    '',
    'Кадры:',
    '  № | Центр (Гц / норм) | Поток (сыр / норм) | RMS (сыр / норм) | C F R | Кадр',
    '  --+------------------+--------------------+------------------+-------+-----',
  ];

  for (const row of report.frames) {
    lines.push(
      `  ${row.index + 1} | ${Math.round(row.centroidHz)} / ${row.centroidNorm.toFixed(2)} | ${row.fluxRaw.toFixed(3)} / ${row.fluxNorm.toFixed(2)} | ${row.rmsRaw.toFixed(4)} / ${row.rmsNorm.toFixed(2)} | ${tickMark(row.centroidInRange)} ${tickMark(row.fluxInRange)} ${tickMark(row.rmsInRange)} | ${tickMark(row.framePassed)}`,
    );
  }

  lines.push(
    '',
    `Нормализация UI: центроид ÷${report.normalization.centroidHzMax}, поток ÷${report.normalization.fluxRefMax}, громкость ÷${report.normalization.loudnessRefMax}`,
  );

  return lines.join('\n');
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadReportJson(report: FftThresholdTestReport): void {
  downloadTextFile(
    `${reportExportBasename(report)}.json`,
    toJsonString(report),
    'application/json',
  );
}

export function downloadReportText(report: FftThresholdTestReport): void {
  downloadTextFile(
    `${reportExportBasename(report)}.txt`,
    toPlainText(report),
    'text/plain',
  );
}
