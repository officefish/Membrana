/**
 * Зубы на подготовку входа детектора спектрального потока: кадры и усреднение спектров для
 * линейных величин записи. Про сам поток — зубы в `spectral-flux-detector.test.ts`: усреднять
 * спектры ради вердикта о потоке нельзя, и эта граница проверяется там, где живёт.
 */
import { describe, expect, it } from 'vitest';

import { averageMagnitudes, fftFrames, prepareFftSamples } from './sample-window.js';

const FFT = 8;

/** Спектр-заглушка: одно число, равное среднему модулю кадра. */
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

  it('перекрытие по умолчанию — половина окна', () => {
    // 32 сэмпла при окне 8 и шаге 4: старты 0,4,8,12,16,20,24 — семь кадров.
    expect([...fftFrames(new Float32Array(32), FFT)].length).toBe(7);
  });

  it('хвост короче кадра не добивается нулями — для потока это был бы ложный скачок', () => {
    const frames = [...fftFrames(new Float32Array(20), FFT, 4)];
    expect(frames.length).toBe(4);
  });

  it('запись короче окна кадров не даёт вовсе', () => {
    expect([...fftFrames(new Float32Array(FFT - 1), FFT)]).toEqual([]);
  });
});

describe('усреднение спектров — для доли энергии низа, не для потока', () => {
  it('считает по всей записи, а не по первому кадру', () => {
    const samples = new Float32Array(32);
    samples.fill(0, 0, 16);
    samples.fill(1, 16, 32);

    const averaged = averageMagnitudes(samples, FFT, meanMagnitude, FFT);
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
