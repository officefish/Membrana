import type {
  CepstralBreakdown,
  CepstralFrameRow,
  DetectorVerdictInput,
  DroneDetectorName,
  DroneDetectorVerdictSection,
  DspAggregationOptions,
  DspFrameVerdictInput,
  HarmonicBreakdown,
  HarmonicFrameRow,
  SpectralFluxBreakdown,
  SpectralFluxFrameRow,
  TemplateMatchBreakdown,
  TemplateMatchFieldRow,
  TemplateMatchMetricSampleRow,
  TemplateScoreRow,
} from './types.js';

function pickFrameReasoning(frames: readonly DspFrameVerdictInput[]): string | undefined {
  let best: DspFrameVerdictInput | undefined;
  for (const frame of frames) {
    if (!best || frame.confidence > best.confidence) {
      best = frame;
    }
  }
  return best?.reasoning;
}

function resolveFundamentalHz(frame: DspFrameVerdictInput): number | null {
  const fromFeatures = frame.features?.fundamentalHz;
  if (fromFeatures !== undefined && fromFeatures > 0) {
    return fromFeatures;
  }
  const fromList = frame.fundamentalsHz?.[0];
  return fromList !== undefined && fromList > 0 ? fromList : null;
}

function buildDspVerdictSectionBase(
  detectorName: DroneDetectorName,
  verdict: DetectorVerdictInput,
  options: DspAggregationOptions,
  frames: readonly DspFrameVerdictInput[],
  breakdown:
    | HarmonicBreakdown
    | CepstralBreakdown
    | SpectralFluxBreakdown,
): DroneDetectorVerdictSection {
  const reasoning = pickFrameReasoning(frames);
  return {
    detectorName,
    detectorFamily: 'dsp',
    isDrone: verdict.isDrone,
    confidence: verdict.confidence,
    ...(options.aggregation !== undefined ? { aggregation: options.aggregation } : {}),
    ...(options.sampleConfidenceThreshold !== undefined
      ? { sampleConfidenceThreshold: options.sampleConfidenceThreshold }
      : {}),
    ...(reasoning !== undefined ? { reasoning } : {}),
    breakdown,
  };
}

export function mapHarmonicBreakdown(
  frames: readonly DspFrameVerdictInput[],
  options: DspAggregationOptions,
): HarmonicBreakdown {
  const rows: HarmonicFrameRow[] = frames.map((frame) => ({
    index: frame.index,
    timestampMs: frame.timestampMs,
    maxHarmonicScore: frame.features?.harmonicScore ?? frame.confidence,
    fundamentalHz: resolveFundamentalHz(frame),
    confidence: frame.confidence,
    isDrone: frame.isDrone,
  }));

  return {
    kind: 'harmonic',
    aggregation: options.aggregation ?? 'any-frame',
    ...(options.sampleConfidenceThreshold !== undefined
      ? { sampleConfidenceThreshold: options.sampleConfidenceThreshold }
      : {}),
    frames: rows,
  };
}

export function mapCepstralBreakdown(
  frames: readonly DspFrameVerdictInput[],
  options: DspAggregationOptions,
): CepstralBreakdown {
  const rows: CepstralFrameRow[] = frames.map((frame) => ({
    index: frame.index,
    timestampMs: frame.timestampMs,
    cepstrumPeak: frame.features?.cepstrumPeak ?? frame.confidence,
    fundamentalHz: resolveFundamentalHz(frame),
    confidence: frame.confidence,
    isDrone: frame.isDrone,
  }));

  return {
    kind: 'cepstral',
    aggregation: options.aggregation ?? 'any-frame',
    ...(options.sampleConfidenceThreshold !== undefined
      ? { sampleConfidenceThreshold: options.sampleConfidenceThreshold }
      : {}),
    frames: rows,
  };
}

export function mapSpectralFluxBreakdown(
  frames: readonly DspFrameVerdictInput[],
  options: DspAggregationOptions,
): SpectralFluxBreakdown {
  const rows: SpectralFluxFrameRow[] = frames.map((frame) => ({
    index: frame.index,
    timestampMs: frame.timestampMs,
    flux: frame.features?.spectralFlux ?? 0,
    lowEnergyPercent: frame.features?.lowEnergyPercent ?? 0,
    confidence: frame.confidence,
    isDrone: frame.isDrone,
  }));

  return {
    kind: 'spectral-flux',
    aggregation: options.aggregation ?? 'any-frame',
    ...(options.sampleConfidenceThreshold !== undefined
      ? { sampleConfidenceThreshold: options.sampleConfidenceThreshold }
      : {}),
    frames: rows,
  };
}

export function mapTemplateMatchBreakdown(input: {
  readonly minConfidence: number;
  readonly templateKey: string;
  readonly templateName: string;
  readonly overallScore: number;
  readonly spectralScore: number;
  readonly temporalScore: number;
  readonly fields: readonly TemplateMatchFieldRow[];
  readonly topTemplates: readonly TemplateScoreRow[];
  readonly metricSamples?: readonly TemplateMatchMetricSampleRow[];
}): TemplateMatchBreakdown {
  return {
    kind: 'template-match',
    minConfidence: input.minConfidence,
    winner: {
      templateKey: input.templateKey,
      templateName: input.templateName,
      overallScore: input.overallScore / 100,
      spectralScore: input.spectralScore / 100,
      temporalScore: input.temporalScore / 100,
    },
    metricSamples: input.metricSamples ?? [],
    fields: input.fields,
    topTemplates: input.topTemplates.map((row) => ({
      ...row,
      score: row.score > 1 ? row.score / 100 : row.score,
    })),
  };
}

export function buildHarmonicVerdictSection(
  verdict: DetectorVerdictInput,
  frames: readonly DspFrameVerdictInput[],
  options: DspAggregationOptions,
): DroneDetectorVerdictSection {
  return buildDspVerdictSectionBase(
    'harmonic',
    verdict,
    options,
    frames,
    mapHarmonicBreakdown(frames, options),
  );
}

export function buildCepstralVerdictSection(
  verdict: DetectorVerdictInput,
  frames: readonly DspFrameVerdictInput[],
  options: DspAggregationOptions,
): DroneDetectorVerdictSection {
  return buildDspVerdictSectionBase(
    'cepstral',
    verdict,
    options,
    frames,
    mapCepstralBreakdown(frames, options),
  );
}

export function buildSpectralFluxVerdictSection(
  verdict: DetectorVerdictInput,
  frames: readonly DspFrameVerdictInput[],
  options: DspAggregationOptions,
): DroneDetectorVerdictSection {
  return buildDspVerdictSectionBase(
    'spectral-flux',
    verdict,
    options,
    frames,
    mapSpectralFluxBreakdown(frames, options),
  );
}

export function buildTemplateMatchVerdictSection(
  verdict: DetectorVerdictInput,
  breakdown: TemplateMatchBreakdown,
  reasoning?: string,
): DroneDetectorVerdictSection {
  return {
    detectorName: 'template-match',
    detectorFamily: 'dsp',
    isDrone: verdict.isDrone,
    confidence: verdict.confidence,
    ...(reasoning !== undefined ? { reasoning } : {}),
    breakdown,
  };
}
