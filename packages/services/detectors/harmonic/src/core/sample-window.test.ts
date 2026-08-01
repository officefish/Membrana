/**
 * Зубы на подготовку входа. Держат дефект, закрытый 01.08: `detect()` слышал первые
 * `fftSize` сэмплов (85 мс при 4096 и 48 кГц) вместо всей записи и молчал об этом.
 */
import { describe, expect, it } from 'vitest';

import { averageMagnitudes, fftFrames, prepareFftSamples } from './sample-window.js';

const FFT = 8;

/** Спектр-заглушка: одно число, равное среднему модулю кадра, — так проверяется усреднение. */
const meanMagnitude = (frame: Float32Array): Float32Array => {
  let sum = 0;
  for (const v of frame) sum += Math.abs(v);
  return new Float32Array([sum / frame.length]);
};

describe('кадры записи', () => {
  it('запись длиннее окна даёт несколько кадров, каждый ровно в окно', () => {
    const frames = [...fftFrames(new Float32Array(32), FFT)];
    expect(frames.length).toBeGreaterThan(1);
    for (const f of frames) expect(f.length).toBe(FFT);
  });

  it('хвост короче кадра не добивается нулями — спектра, которого нет, не вносим', () => {
    // 20 сэмплов при окне 8 и шаге 4: старты 0, 4, 8, 12 — последний кадр кончается на 20.
    const frames = [...fftFrames(new Float32Array(20), FFT, 4)];
    expect(frames.length).toBe(4);
  });

  it('запись короче окна кадров не даёт вовсе', () => {
    expect([...fftFrames(new Float32Array(FFT - 1), FFT)]).toEqual([]);
  });
});

describe('усреднение спектров записи', () => {
  it('судит всю запись, а не первый кадр', () => {
    // Первая половина тихая, вторая громкая. Прежнее поведение — обрезка до первого кадра —
    // вернуло бы ноль и объявило запись тишиной.
    const samples = new Float32Array(32);
    samples.fill(0, 0, 16);
    samples.fill(1, 16, 32);

    const averaged = averageMagnitudes(samples, FFT, meanMagnitude, FFT);
    expect(averaged).not.toBeNull();
    expect(averaged?.[0]).toBeCloseTo(0.5, 6);

    // Ровно то, что было до починки: первый кадр — тишина.
    expect(meanMagnitude(prepareFftSamples(samples, FFT))[0]).toBe(0);
  });

  it('запись короче окна — кадров нет, отдаёт null, а не выдуманный спектр', () => {
    expect(averageMagnitudes(new Float32Array(FFT - 1), FFT, meanMagnitude)).toBeNull();
  });

  it('запись ровно в окно даёт спектр этого окна', () => {
    const samples = new Float32Array(FFT).fill(2);
    expect(averageMagnitudes(samples, FFT, meanMagnitude)?.[0]).toBeCloseTo(2, 6);
  });
});

describe('короткий вход по-прежнему дополняется нулями', () => {
  it('длина приводится к окну, начало сохраняется', () => {
    const out = prepareFftSamples(new Float32Array([1, 2, 3]), FFT);
    expect(out.length).toBe(FFT);
    expect([...out.subarray(0, 3)]).toEqual([1, 2, 3]);
    expect([...out.subarray(3)]).toEqual([0, 0, 0, 0, 0]);
  });

  it('вход ровно в окно отдаётся тем же буфером — лишней копии нет', () => {
    const samples = new Float32Array(FFT).fill(1);
    expect(prepareFftSamples(samples, FFT)).toBe(samples);
  });
});
