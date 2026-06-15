import { describe, expect, it } from 'vitest';
import type { DroneDetectorVerdictSection } from '@membrana/detector-report';

import { buildDspCombinedFrameRows } from './buildDspCombinedFrameRows';

const FIXTURE_VERDICTS: DroneDetectorVerdictSection[] = [
  {
    detectorName: 'harmonic',
    detectorFamily: 'dsp',
    isDrone: true,
    confidence: 0.78,
    breakdown: {
      kind: 'harmonic',
      aggregation: 'any-frame',
      frames: [
        {
          index: 0,
          timestampMs: 0,
          maxHarmonicScore: 0.41,
          fundamentalHz: 180,
          confidence: 0.41,
          isDrone: false,
        },
        {
          index: 1,
          timestampMs: 21,
          maxHarmonicScore: 0.78,
          fundamentalHz: 182,
          confidence: 0.78,
          isDrone: true,
        },
      ],
    },
  },
  {
    detectorName: 'cepstral',
    detectorFamily: 'dsp',
    isDrone: false,
    confidence: 0.35,
    breakdown: {
      kind: 'cepstral',
      aggregation: 'any-frame',
      frames: [
        {
          index: 0,
          timestampMs: 0,
          cepstrumPeak: 0.2,
          fundamentalHz: 180,
          confidence: 0.2,
          isDrone: false,
        },
        {
          index: 1,
          timestampMs: 21,
          cepstrumPeak: 0.35,
          fundamentalHz: 182,
          confidence: 0.35,
          isDrone: false,
        },
      ],
    },
  },
  {
    detectorName: 'spectral-flux',
    detectorFamily: 'dsp',
    isDrone: true,
    confidence: 0.6,
    breakdown: {
      kind: 'spectral-flux',
      aggregation: 'any-frame',
      frames: [
        {
          index: 0,
          timestampMs: 0,
          flux: 0.1,
          lowEnergyPercent: 12,
          confidence: 0.1,
          isDrone: false,
        },
        {
          index: 1,
          timestampMs: 21,
          flux: 0.55,
          lowEnergyPercent: 8,
          confidence: 0.6,
          isDrone: true,
        },
      ],
    },
  },
];

describe('buildDspCombinedFrameRows', () => {
  it('aligns harmonic, cepstral and spectral-flux frames by index', () => {
    const rows = buildDspCombinedFrameRows(FIXTURE_VERDICTS);

    expect(rows).toHaveLength(2);
    expect(rows[1]?.harmonic?.maxHarmonicScore).toBe(0.78);
    expect(rows[1]?.cepstral?.cepstrumPeak).toBe(0.35);
    expect(rows[1]?.spectralFlux?.flux).toBe(0.55);
    expect(rows[1]?.timestampMs).toBe(21);
  });
});
