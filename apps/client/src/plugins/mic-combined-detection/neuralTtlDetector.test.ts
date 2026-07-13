import { describe, expect, it } from 'vitest';
import type { AudioWindow, DetectionResult, DroneDetector } from '@membrana/detector-base';

import { wrapNeuralWithTtl } from './neuralTtlDetector';
import { resolveModalities, modalitiesLabel } from './modalities';

const WINDOW: AudioWindow = {
  samples: new Float32Array(16),
  sampleRate: 48000,
  timestamp: 0,
  durationSec: 1,
};

function fakeNeural(behavior: { failFrom?: number } = {}): {
  detector: DroneDetector;
  calls: () => number;
} {
  let calls = 0;
  return {
    detector: {
      name: 'yamnet',
      family: 'neural',
      async detect(): Promise<DetectionResult> {
        calls += 1;
        if (behavior.failFrom !== undefined && calls >= behavior.failFrom) {
          throw new Error('модель недоступна');
        }
        return { isDrone: true, confidence: 0.8, latencyMs: 1 };
      },
    },
    calls: () => calls,
  };
}

describe('wrapNeuralWithTtl (консилиум, точка 3)', () => {
  it('между опросами отдаёт кэш без вызова модели (субдискретизация)', async () => {
    let t = 0;
    const { detector, calls } = fakeNeural();
    const wrapped = wrapNeuralWithTtl(detector, { pollIntervalMs: 6000, ttlMs: 15000, now: () => t });

    await wrapped.detect(WINDOW); // t=0 — реальный опрос
    t = 2000;
    const cached = await wrapped.detect(WINDOW); // кэш
    t = 4000;
    await wrapped.detect(WINDOW); // кэш
    expect(calls()).toBe(1);
    expect(cached.confidence).toBe(0.8);

    t = 6000; // интервал прошёл — снова реальный опрос
    await wrapped.detect(WINDOW);
    expect(calls()).toBe(2);
  });

  it('отказ опроса при свежем кэше → кэш отвечает (транзиент не роняет модальность)', async () => {
    let t = 0;
    const { detector } = fakeNeural({ failFrom: 2 });
    const wrapped = wrapNeuralWithTtl(detector, { pollIntervalMs: 6000, ttlMs: 15000, now: () => t });

    await wrapped.detect(WINDOW); // успех, кэш @0
    t = 6000;
    const survived = await wrapped.detect(WINDOW); // опрос упал, но кэш @0 свеж (6с ≤ 15с)
    expect(survived.confidence).toBe(0.8);
  });

  it('протухание TTL → throw (present:false в ансамбле), не тихий кэш', async () => {
    let t = 0;
    const { detector } = fakeNeural({ failFrom: 2 });
    const wrapped = wrapNeuralWithTtl(detector, { pollIntervalMs: 6000, ttlMs: 15000, now: () => t });

    await wrapped.detect(WINDOW); // успех, кэш @0
    t = 16000; // кэш протух (16с > 15с)
    await expect(wrapped.detect(WINDOW)).rejects.toThrow(); // опрос упал, кэш протух → throw
    t = 18000;
    await expect(wrapped.detect(WINDOW)).rejects.toThrow(/протух/); // кэша нет, до опроса далеко
  });

  it('ошибка модели на первом опросе → throw сразу (graceful на уровне ансамбля)', async () => {
    const { detector } = fakeNeural({ failFrom: 1 });
    const wrapped = wrapNeuralWithTtl(detector, { pollIntervalMs: 6000, ttlMs: 15000, now: () => 0 });
    await expect(wrapped.detect(WINDOW)).rejects.toThrow('модель недоступна');
  });

  it('сохраняет name/family детектора (perSource честный)', () => {
    const { detector } = fakeNeural();
    const wrapped = wrapNeuralWithTtl(detector);
    expect(wrapped.name).toBe('yamnet');
    expect(wrapped.family).toBe('neural');
  });
});

describe('resolveModalities / modalitiesLabel (консилиум, точка 4)', () => {
  const src = (family: string, present: boolean) => ({
    name: family,
    family,
    confidence: 0.5,
    present,
  });

  it('dsp+neural когда обе модальности живы', () => {
    expect(resolveModalities([src('dsp', true), src('neural', true)])).toBe('dsp+neural');
    expect(modalitiesLabel('dsp+neural')).toBe('спектр+нейро');
  });

  it('деградация нейро → dsp (видимая, «спектр»)', () => {
    expect(resolveModalities([src('dsp', true), src('neural', false)])).toBe('dsp');
    expect(modalitiesLabel('dsp')).toBe('спектр');
  });

  it('никого нет → none', () => {
    expect(resolveModalities([src('dsp', false), src('neural', false)])).toBe('none');
    expect(modalitiesLabel('none')).toBe('нет источников');
  });
});
