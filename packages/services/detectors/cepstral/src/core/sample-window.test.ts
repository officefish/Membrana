/**
 * Зубы на подготовку входа кепстрального детектора. Держат дефект, закрытый 02.08: `detect()`
 * слышал первые `fftSize` сэмплов (43 мс при 2048 и 48 кГц) вместо всей записи и молчал об этом.
 *
 * Проверяется не только механика кадров, но и САМ ДЕТЕКТОР: без этого зуб доказывал бы, что
 * усреднение написано, а не что оно включено. Норма #1565 — вещдоком служит прогон, а не файл.
 */
import { describe, expect, it } from 'vitest';

import { CepstralDetector } from './cepstral-detector.js';
import { fftFrames, geometricMeanMagnitudes, prepareFftSamples } from './sample-window.js';

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
    const frames = [...fftFrames(new Float32Array(20), FFT, 4)];
    expect(frames.length).toBe(4);
  });

  it('запись короче окна кадров не даёт вовсе', () => {
    expect([...fftFrames(new Float32Array(FFT - 1), FFT)]).toEqual([]);
  });
});

describe('сведение спектров записи', () => {
  it('судит всю запись, а не первый кадр', () => {
    // Первая половина тихая, вторая громкая. Прежнее поведение — обрезка до первого кадра —
    // вернуло бы ноль и объявило запись тишиной.
    const samples = new Float32Array(32);
    samples.fill(0, 0, 16);
    samples.fill(1, 16, 32);

    const merged = geometricMeanMagnitudes(samples, FFT, meanMagnitude, FFT);
    expect(merged).not.toBeNull();
    expect(merged?.[0]).toBeGreaterThan(0);

    // Ровно то, что было до починки: первый кадр — тишина.
    expect(meanMagnitude(prepareFftSamples(samples, FFT))[0]).toBe(0);
  });

  it('запись короче окна — кадров нет, отдаёт null, а не выдуманный спектр', () => {
    expect(geometricMeanMagnitudes(new Float32Array(FFT - 1), FFT, meanMagnitude)).toBeNull();
  });

  it('запись ровно в окно даёт спектр этого окна', () => {
    const samples = new Float32Array(FFT).fill(2);
    expect(geometricMeanMagnitudes(samples, FFT, meanMagnitude)?.[0]).toBeCloseTo(2, 6);
  });
});

describe('сведение годится КЕПСТРУ, а не спектру вообще', () => {
  /** Спектр кадра берётся из первого сэмпла — так у кадров получаются разные «спектры». */
  const firstSample = (frame: Float32Array): Float32Array => new Float32Array([frame[0] ?? 0]);

  it('логарифм сведённого равен среднему логарифмов — это и есть усреднение кепстров', () => {
    // Кепстр есть IFFT(log|S|), IFFT линеен ⇒ среднее кепстров = IFFT(среднее log|S|).
    // Значит подать классификатору среднее геометрическое = усреднить кепстры кадров.
    const samples = new Float32Array([4, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 0, 0]);
    const merged = geometricMeanMagnitudes(samples, FFT, firstSample, FFT);

    const meanOfLogs = (Math.log(4 + 1e-10) + Math.log(16 + 1e-10)) / 2;
    expect(Math.log(merged?.[0] ?? 0)).toBeCloseTo(meanOfLogs, 5);
  });

  it('пик не раздувается: сведённое строго меньше арифметического среднего при разных кадрах', () => {
    // Неравенство о средних. Именно этот зазор и размывал бы пик квефренции, будь здесь
    // арифметическое среднее: log(среднего) > среднее(log) для несовпадающих кадров.
    const samples = new Float32Array([4, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 0, 0]);
    const merged = geometricMeanMagnitudes(samples, FFT, firstSample, FFT) ?? new Float32Array([0]);

    expect(merged[0]).toBeCloseTo(8, 5); // √(4·16)
    expect(merged[0]).toBeLessThan((4 + 16) / 2);
  });

  it('одинаковые кадры: сведённое совпадает с арифметическим — расхождения без причины нет', () => {
    const samples = new Float32Array([9, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0]);
    const merged = geometricMeanMagnitudes(samples, FFT, firstSample, FFT);
    expect(merged?.[0]).toBeCloseTo(9, 5);
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

// ── Детектор: усреднение не написано, а включено ──────────────────────────────────────────

const SAMPLE_RATE = 48_000;

/** Тон заданной частоты длиной `length` сэмплов. */
function tone(hz: number, length: number, offset = 0): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) out[i] = Math.sin((2 * Math.PI * hz * (i + offset)) / SAMPLE_RATE);
  return out;
}

describe('детектор судит запись целиком', () => {
  it('вторая половина записи влияет на вердикт — первая его больше не решает', async () => {
    const detector = new CepstralDetector();
    const fftSize = 2048;
    const half = fftSize * 4;

    // Две записи с ОДИНАКОВОЙ первой половиной и разными вторыми. До починки обе судились
    // по первым 2048 сэмплам, то есть по общей части, и давали побайтово один результат.
    const head = tone(200, half);
    const a = new Float32Array(half * 2);
    const b = new Float32Array(half * 2);
    a.set(head, 0);
    b.set(head, 0);
    a.set(tone(200, half, half), half);
    b.set(tone(1700, half, half), half);

    const ra = await detector.detect({ samples: a, sampleRate: SAMPLE_RATE, timestamp: 0 });
    const rb = await detector.detect({ samples: b, sampleRate: SAMPLE_RATE, timestamp: 0 });

    const featureOf = (r: Awaited<ReturnType<CepstralDetector['detect']>>) =>
      `${r.features?.fundamentalHz ?? 0}|${r.features?.cepstrumPeak ?? 0}`;
    expect(featureOf(ra)).not.toBe(featureOf(rb));
  });

  it('вход ровно в окно идёт прежней быстрой веткой — числа бенчмарка не сдвигаются', async () => {
    const detector = new CepstralDetector();
    const samples = tone(200, 2048);

    const direct = await detector.detect({ samples, sampleRate: SAMPLE_RATE, timestamp: 0 });
    const again = await detector.detect({ samples, sampleRate: SAMPLE_RATE, timestamp: 0 });

    expect(direct.isDrone).toBe(again.isDrone);
    expect(direct.features?.fundamentalHz).toBe(again.features?.fundamentalHz);
    expect(direct.features?.cepstrumPeak).toBe(again.features?.cepstrumPeak);
  });
});
