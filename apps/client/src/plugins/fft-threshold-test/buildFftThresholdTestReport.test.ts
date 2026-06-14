import { describe, expect, it } from 'vitest';

import type { ThresholdTestResult } from '@membrana/fft-analyzer-service';

import { buildFftThresholdTestReport } from './buildFftThresholdTestReport';
import { toJsonString, toPlainText } from './exportFftThresholdReport';
import { fftThresholdReportHistory } from './fftThresholdReportHistory';
import { normalizeCentroidHz, normalizeFlux, normalizeLoudness } from './normalizeMetrics';

function sampleResult(overrides: Partial<ThresholdTestResult> = {}): ThresholdTestResult {
  return {
    testId: 'test-1',
    startedAt: 1_000,
    finishedAt: 2_000,
    frameCount: 3,
    strictness: 'normal',
    mode: 'manual',
    intervalMs: 500,
    thresholds: {
      centroid: { min: 500, max: 1250 },
      flux: { min: 0.2, max: 1.5 },
      rms: { min: 0.03, max: 0.35 },
    },
    frames: [
      {
        index: 0,
        timestamp: 1100,
        centroid: 600,
        flux: 0.3,
        rms: 0.05,
        centroidInRange: true,
        fluxInRange: true,
        rmsInRange: true,
        metricsInRangeCount: 3,
        framePassed: true,
      },
      {
        index: 1,
        timestamp: 1600,
        centroid: 700,
        flux: 0.5,
        rms: 0.08,
        centroidInRange: true,
        fluxInRange: true,
        rmsInRange: true,
        metricsInRangeCount: 3,
        framePassed: true,
      },
      {
        index: 2,
        timestamp: 2100,
        centroid: 800,
        flux: 0.4,
        rms: 0.06,
        centroidInRange: true,
        fluxInRange: true,
        rmsInRange: true,
        metricsInRangeCount: 3,
        framePassed: true,
      },
    ],
    passedCount: 3,
    passRate: 1,
    isDetected: true,
    ...overrides,
  };
}

describe('buildFftThresholdTestReport', () => {
  it('нормализованные поля совпадают с normalizeMetrics', () => {
    const report = buildFftThresholdTestReport(sampleResult());
    const row = report.frames[0]!;
    expect(row.centroidNorm).toBe(normalizeCentroidHz(row.centroidHz));
    expect(row.fluxNorm).toBe(normalizeFlux(row.fluxRaw));
    expect(row.rmsNorm).toBe(normalizeLoudness(row.rmsRaw));
  });
});

describe('exportFftThresholdReport', () => {
  it('JSON парсится и содержит testId', () => {
    const report = buildFftThresholdTestReport(sampleResult());
    const parsed = JSON.parse(toJsonString(report)) as { testId: string };
    expect(parsed.testId).toBe('test-1');
  });

  it('текст содержит итог и строки кадров', () => {
    const report = buildFftThresholdTestReport(sampleResult());
    const text = toPlainText(report);
    expect(text).toContain('Обнаружено');
    expect(text).toContain('Кадры:');
    expect(text.match(/\n {2}1 \|/g)?.length).toBe(1);
    expect(text.match(/\n {2}3 \|/g)?.length).toBe(1);
  });

  it('текст для не-детекции', () => {
    const report = buildFftThresholdTestReport(
      sampleResult({ isDetected: false, passedCount: 0, passRate: 0 }),
    );
    expect(toPlainText(report)).toContain('Не обнаружено');
  });
});

describe('fftThresholdReportHistory', () => {
  it('хранит не более 5 отчётов, новый первый', () => {
    fftThresholdReportHistory.clear();
    for (let i = 0; i < 6; i++) {
      fftThresholdReportHistory.push(
        buildFftThresholdTestReport(sampleResult({ testId: `id-${i}` })),
      );
    }
    const list = fftThresholdReportHistory.getReports();
    expect(list).toHaveLength(5);
    expect(list[0]?.testId).toBe('id-5');
    expect(list[4]?.testId).toBe('id-1');
    fftThresholdReportHistory.clear();
  });
});
