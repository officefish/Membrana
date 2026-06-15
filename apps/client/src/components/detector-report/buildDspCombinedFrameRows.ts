import type {
  CepstralFrameRow,
  DroneDetectorVerdictSection,
  HarmonicFrameRow,
  SpectralFluxFrameRow,
} from '@membrana/detector-report';

export interface DspCombinedFrameRow {
  readonly index: number;
  readonly timestampMs: number;
  readonly harmonic: HarmonicFrameRow | null;
  readonly cepstral: CepstralFrameRow | null;
  readonly spectralFlux: SpectralFluxFrameRow | null;
}

function harmonicFrames(
  verdicts: readonly DroneDetectorVerdictSection[],
): readonly HarmonicFrameRow[] {
  const section = verdicts.find((v) => v.detectorName === 'harmonic');
  return section?.breakdown.kind === 'harmonic' ? section.breakdown.frames : [];
}

function cepstralFrames(
  verdicts: readonly DroneDetectorVerdictSection[],
): readonly CepstralFrameRow[] {
  const section = verdicts.find((v) => v.detectorName === 'cepstral');
  return section?.breakdown.kind === 'cepstral' ? section.breakdown.frames : [];
}

function spectralFluxFrames(
  verdicts: readonly DroneDetectorVerdictSection[],
): readonly SpectralFluxFrameRow[] {
  const section = verdicts.find((v) => v.detectorName === 'spectral-flux');
  return section?.breakdown.kind === 'spectral-flux' ? section.breakdown.frames : [];
}

/** Align harmonic, cepstral and spectral-flux frames by shared FFT index. */
export function buildDspCombinedFrameRows(
  verdicts: readonly DroneDetectorVerdictSection[],
): readonly DspCombinedFrameRow[] {
  const harmonic = harmonicFrames(verdicts);
  const cepstral = cepstralFrames(verdicts);
  const spectralFlux = spectralFluxFrames(verdicts);
  const frameCount = Math.max(harmonic.length, cepstral.length, spectralFlux.length);
  if (frameCount === 0) return [];

  const rows: DspCombinedFrameRow[] = [];
  for (let index = 0; index < frameCount; index += 1) {
    const h = harmonic[index] ?? null;
    const c = cepstral[index] ?? null;
    const s = spectralFlux[index] ?? null;
    const timestampMs = h?.timestampMs ?? c?.timestampMs ?? s?.timestampMs ?? 0;
    rows.push({
      index,
      timestampMs,
      harmonic: h,
      cepstral: c,
      spectralFlux: s,
    });
  }
  return rows;
}
