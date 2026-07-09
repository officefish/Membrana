import { describe, it, expect, beforeEach } from 'vitest';
import { EnsembleProducer } from '@membrana/detection-ensemble-service';
import type { AudioWindow } from '@membrana/detector-base';

import {
  resolveMicCombinedDetectionConfig,
  defaultMicCombinedDetectionConfig,
} from './types';
import { combinedDetectionState } from './combinedDetectionState';
import { createCombinedStreamDetectors } from './createCombinedStreamDetectors';

// ---------- config resolver ----------

describe('resolveMicCombinedDetectionConfig', () => {
  it('пустой/битый вход → дефолт', () => {
    expect(resolveMicCombinedDetectionConfig(undefined)).toEqual(
      defaultMicCombinedDetectionConfig,
    );
    expect(resolveMicCombinedDetectionConfig(42)).toEqual(defaultMicCombinedDetectionConfig);
  });

  it('клампит windowSec и smoothing в допустимые диапазоны', () => {
    expect(resolveMicCombinedDetectionConfig({ windowSec: 999, smoothing: 5 })).toEqual({
      windowSec: 10,
      smoothing: 1,
    });
    expect(resolveMicCombinedDetectionConfig({ windowSec: 0.1, smoothing: -1 })).toEqual({
      windowSec: 0.5,
      smoothing: 0,
    });
  });
});

// ---------- state bridge (контракт для alarm-плагина) ----------

describe('combinedDetectionState', () => {
  beforeEach(() => combinedDetectionState.reset());

  it('reset → начальный snapshot (live false, score 0)', () => {
    const snap = combinedDetectionState.getSnapshot();
    expect(snap.live).toBe(false);
    expect(snap.combinedScore).toBe(0);
    expect(snap.smoothedScore).toBe(0);
  });

  it('setReading публикует score/agreement/источники; setLive переключает live', () => {
    combinedDetectionState.setLive(true);
    combinedDetectionState.setReading({
      combinedScore: 0.7,
      smoothedScore: 0.6,
      agreement: 0.9,
      presentCount: 2,
      perSource: [{ name: 'harmonic', family: 'dsp', confidence: 0.7, present: true }],
    });
    const snap = combinedDetectionState.getSnapshot();
    expect(snap.live).toBe(true);
    expect(snap.smoothedScore).toBeCloseTo(0.6, 5);
    expect(snap.perSource).toHaveLength(1);
  });

  it('subscribe уведомляет слушателя об изменении', () => {
    let calls = 0;
    const unsub = combinedDetectionState.subscribe(() => {
      calls += 1;
    });
    combinedDetectionState.setLive(true);
    expect(calls).toBeGreaterThan(0);
    unsub();
  });
});

// ---------- детекторы ----------

describe('createCombinedStreamDetectors', () => {
  it('возвращает 3 DSP-детектора (harmonic/cepstral/spectral-flux)', () => {
    const detectors = createCombinedStreamDetectors();
    expect(detectors.map((d) => d.name).sort()).toEqual(
      ['cepstral', 'harmonic', 'spectral-flux'],
    );
    expect(detectors.every((d) => d.family === 'dsp')).toBe(true);
  });
});

// ---------- интеграция: реальный combinedScore из живого пути (headless) ----------

/** Синтетическое окно: тон 200 Гц + гармоники, 2 с @ 48 кГц. */
function syntheticDroneWindow(): AudioWindow {
  const sampleRate = 48000;
  const length = sampleRate * 2;
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    samples[i] =
      0.5 * Math.sin(2 * Math.PI * 200 * t) +
      0.25 * Math.sin(2 * Math.PI * 400 * t) +
      0.12 * Math.sin(2 * Math.PI * 600 * t);
  }
  return { samples, sampleRate, timestamp: 0, durationSec: 2 };
}

describe('EnsembleProducer + createCombinedStreamDetectors (реальный DSP-путь)', () => {
  it('combinedScore конечный в [0..1], все 3 детектора присутствуют', async () => {
    const producer = new EnsembleProducer(createCombinedStreamDetectors(), {
      smoothing: 1,
    });
    const result = await producer.analyze(syntheticDroneWindow());

    expect(Number.isFinite(result.combinedScore)).toBe(true);
    expect(result.combinedScore).toBeGreaterThanOrEqual(0);
    expect(result.combinedScore).toBeLessThanOrEqual(1);
    expect(result.presentCount).toBe(3);
    expect(result.perSource).toHaveLength(3);
    // smoothing=1 → сглаженный равен мгновенному.
    expect(result.smoothedScore).toBeCloseTo(result.combinedScore, 5);
  });
});
