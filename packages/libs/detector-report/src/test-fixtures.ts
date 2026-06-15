import type { BuildDroneDetectionReportInput } from './types.js';

/** Minimal fixture for unit tests (DDR1); DDR2 will populate from real detector runs. */
export const SAMPLE_DDR1_FIXTURE_INPUT: BuildDroneDetectionReportInput = {
  reportId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  createdAt: new Date('2026-06-15T13:42:03.000Z'),
  sample: {
    id: 'sample-fixture-001',
    title: 'Drone hover 5s',
    sampleRate: 48_000,
    durationSec: 5,
    groundTruthLabel: 'drone',
  },
  verdicts: [
    {
      detectorName: 'harmonic',
      detectorFamily: 'dsp',
      isDrone: true,
      confidence: 0.82,
      aggregation: 'any-frame',
      sampleConfidenceThreshold: 0.55,
      reasoning: 'Harmonic structure above threshold in frame 3',
      breakdown: {
        kind: 'harmonic',
        aggregation: 'any-frame',
        sampleConfidenceThreshold: 0.55,
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
      detectorName: 'template-match',
      detectorFamily: 'dsp',
      isDrone: true,
      confidence: 0.71,
      breakdown: {
        kind: 'template-match',
        minConfidence: 0.5,
        winner: {
          templateKey: 'DRONE_CURATED',
          templateName: 'Curated drone corpus',
          overallScore: 0.71,
          spectralScore: 0.75,
          temporalScore: 0.66,
        },
        fields: [
          {
            field: 'centroid',
            category: 'spectral',
            actual: '4200 Hz',
            expected: '3000 – 6000 Hz',
            matchPercent: 88,
            weight: 0.35,
          },
        ],
        topTemplates: [
          {
            templateKey: 'DRONE_CURATED',
            templateName: 'Curated drone corpus',
            score: 0.71,
          },
          {
            templateKey: 'DRONE_ALT',
            templateName: null,
            score: 0.42,
          },
        ],
        metricSamples: [],
      },
    },
  ],
};
