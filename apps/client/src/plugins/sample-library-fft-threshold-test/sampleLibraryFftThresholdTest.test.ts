import { describe, expect, it } from 'vitest';

import type { FftThresholdTestReport } from '../fft-threshold-test/buildFftThresholdTestReport';

import { sampleLibraryFftThresholdState } from './sampleLibraryFftThresholdPluginState';
import {
  defaultSampleLibraryFftThresholdTestConfig,
  resolveSampleLibraryFftThresholdTestConfig,
} from './types';

function makeReport(isDetected: boolean): FftThresholdTestReport {
  return {
    testId: 't1',
    startedAt: 0,
    finishedAt: 1000,
    isDetected,
    passedCount: isDetected ? 4 : 1,
    passRate: isDetected ? 0.8 : 0.2,
    frameCount: 5,
    strictness: 'normal',
    mode: 'manual',
    intervalMs: 500,
    thresholds: {
      centroid: { min: 2900, max: 4300 },
      flux: { min: 0.03, max: 0.16 },
      rms: { min: 0.07, max: 0.28 },
    },
    normalization: { centroidHzMax: 5000, fluxRefMax: 1, loudnessRefMax: 0.35 },
    frames: [],
  };
}

describe('resolveSampleLibraryFftThresholdTestConfig', () => {
  it('returns defaults for invalid input', () => {
    expect(resolveSampleLibraryFftThresholdTestConfig(null)).toEqual(
      defaultSampleLibraryFftThresholdTestConfig,
    );
    expect(resolveSampleLibraryFftThresholdTestConfig(42)).toEqual(
      defaultSampleLibraryFftThresholdTestConfig,
    );
  });

  it('defaults to the calibrated drone box (free-v1 config B)', () => {
    const c = defaultSampleLibraryFftThresholdTestConfig;
    expect(c.thresholds.centroid).toEqual({ min: 2900, max: 4300 });
    expect(c.frameCount).toBe(5);
    expect(c.strictness).toBe('normal');
  });

  it('merges partial overrides and clamps frameCount', () => {
    const c = resolveSampleLibraryFftThresholdTestConfig({
      frameCount: 4,
      strictness: 'strict',
      thresholds: { centroid: { min: 1000, max: 2000 } },
    });
    expect(c.frameCount).toBe(defaultSampleLibraryFftThresholdTestConfig.frameCount);
    expect(c.strictness).toBe('strict');
    expect(c.thresholds.centroid).toEqual({ min: 1000, max: 2000 });
    expect(c.thresholds.flux).toEqual(
      defaultSampleLibraryFftThresholdTestConfig.thresholds.flux,
    );
  });
});

describe('sampleLibraryFftThresholdState', () => {
  it('transitions idle → loading → ready and keeps the report', () => {
    sampleLibraryFftThresholdState.reset();
    sampleLibraryFftThresholdState.setSampleContext({
      selectedSampleId: 's1',
      selectedSampleTitle: 'Sample 1',
    });
    expect(sampleLibraryFftThresholdState.getSnapshot().status).toBe('idle');

    sampleLibraryFftThresholdState.beginAnalysis('s1');
    expect(sampleLibraryFftThresholdState.getSnapshot().status).toBe('loading');

    const report = makeReport(true);
    sampleLibraryFftThresholdState.finishAnalysis('s1', report);
    const snap = sampleLibraryFftThresholdState.getSnapshot();
    expect(snap.status).toBe('ready');
    expect(snap.analyzedSampleId).toBe('s1');
    expect(snap.report?.isDetected).toBe(true);
  });

  it('records error state', () => {
    sampleLibraryFftThresholdState.reset();
    sampleLibraryFftThresholdState.beginAnalysis('s2');
    sampleLibraryFftThresholdState.failAnalysis('decode failed');
    const snap = sampleLibraryFftThresholdState.getSnapshot();
    expect(snap.status).toBe('error');
    expect(snap.errorMessage).toBe('decode failed');
  });
});
