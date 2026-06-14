import { describe, expect, it } from 'vitest';

import type { AudioSampleFrame } from '@membrana/audio-engine-service';

import { FftAnalyzer } from './fft-analyzer.js';
import { SpectralFluxTracker } from '../math/metrics.js';

function frame(samples: Float32Array, sampleRate = 48_000): AudioSampleFrame {
  return { samples, sampleRate, timestamp: Date.now() };
}

describe('FftAnalyzer collection flux', () => {
  it('внешний трекер не продвигается от обычных analyzeFrame без него', () => {
    const analyzer = new FftAnalyzer({ fftSize: 256 });
    const collectionFlux = new SpectralFluxTracker();

    const quiet = new Float32Array(256).fill(0.01);
    const loud = new Float32Array(256);
    for (let i = 0; i < loud.length; i++) {
      loud[i] = 0.2 * Math.sin((i / loud.length) * Math.PI * 8);
    }

    const fQuiet = frame(quiet);
    const fLoud = frame(loud);

    expect(analyzer.analyzeFrame(fQuiet, collectionFlux).flux).toBe(0);

    for (let i = 0; i < 30; i++) {
      analyzer.analyzeFrame(fQuiet);
    }

    const fluxBetweenSamples = analyzer.analyzeFrame(fLoud, collectionFlux).flux;
    expect(fluxBetweenSamples).toBeGreaterThan(0);
  });
});
