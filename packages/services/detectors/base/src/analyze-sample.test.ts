import { describe, expect, it } from 'vitest';

import { analyzeSample } from './analyze-sample.js';
import { createMockDroneDetector } from './mock-detector.js';
import { harmonicDroneWindow } from './test-fixtures.js';

describe('analyzeSample', () => {
  it('returns zero verdict when buffer shorter than fftSize', async () => {
    const detector = createMockDroneDetector({ isDrone: true, confidence: 0.9 });
    const { verdict, frameLatenciesMs } = await analyzeSample(
      new Float32Array(100),
      48_000,
      detector,
      { fftSize: 2048 },
    );
    expect(verdict.frameCount).toBe(0);
    expect(verdict.isDrone).toBe(false);
    expect(verdict.confidence).toBe(0);
    expect(frameLatenciesMs).toHaveLength(0);
  });

  it('aggregates max confidence and any-frame isDrone across windows', async () => {
    let call = 0;
    const detector: import('./types.js').DroneDetector = {
      name: 'mock-seq',
      family: 'dsp',
      detect: async () => {
        call += 1;
        if (call === 2) {
          return { isDrone: true, confidence: 0.82, latencyMs: 1 };
        }
        return { isDrone: false, confidence: 0.2, latencyMs: 0.5 };
      },
    };

    const samples = harmonicDroneWindow().samples;
    const { verdict } = await analyzeSample(samples, 48_000, detector, {
      fftSize: 2048,
      hopSize: 1024,
    });

    expect(verdict.frameCount).toBeGreaterThan(1);
    expect(verdict.isDrone).toBe(true);
    expect(verdict.confidence).toBe(0.82);
    expect(verdict.maxFrameConfidence).toBe(0.82);
    expect(verdict.latencyMsTotal).toBeGreaterThan(0);
  });

  it('returns frameVerdicts when includeFrameVerdicts is true', async () => {
    const detector: import('./types.js').DroneDetector = {
      name: 'mock-seq',
      family: 'dsp',
      detect: async (window) => ({
        isDrone: window.timestamp > 0,
        confidence: window.timestamp > 0 ? 0.7 : 0.2,
        latencyMs: 1,
        features: { spectralFlux: 0.5 },
      }),
    };

    const samples = harmonicDroneWindow().samples;
    const { frameVerdicts } = await analyzeSample(samples, 48_000, detector, {
      fftSize: 2048,
      hopSize: 1024,
      includeFrameVerdicts: true,
    });

    expect(frameVerdicts).toBeDefined();
    expect(frameVerdicts!.length).toBeGreaterThan(1);
    expect(frameVerdicts![0]?.index).toBe(0);
    expect(frameVerdicts![0]?.timestampMs).toBe(0);
    expect(frameVerdicts![1]?.features?.spectralFlux).toBe(0.5);
  });
});

/**
 * ЗОЛОТОЙ ЗУБ СВОДА КОПИЙ ОКНА (02.08).
 *
 * Написан ДО того, как `analyzeSample` перестал держать свою приватную `iterWindows` и стал
 * звать общий `fftFrames`, и зелён на СТАРОМ коде. Требование резчика: неизменность чисел
 * бенчмарка доказывается зубом, а не словами — этот путь кормит `yarn benchmark:detectors` и
 * UI-плагин библиотеки образцов, и сдвиг числа кадров сдвинул бы все замеры разом.
 *
 * Мерка выбрана самая грубая и самая говорящая: СКОЛЬКО КАДРОВ увидел детектор. Всё
 * остальное в агрегации — производное от этого числа.
 */
describe('золотой зуб: число кадров не меняется сводом копий', () => {
  const FFT = 16;
  const countFrames = async (length: number, opts: Record<string, unknown> = {}) => {
    const detector = createMockDroneDetector({ isDrone: false, confidence: 0 });
    const { verdict } = await analyzeSample(new Float32Array(length), 48_000, detector, {
      fftSize: FFT,
      ...opts,
    });
    return verdict.frameCount;
  };

  it('запись короче окна — ноль кадров', async () => {
    expect(await countFrames(FFT - 1)).toBe(0);
  });

  it('запись ровно в окно — один кадр', async () => {
    expect(await countFrames(FFT)).toBe(1);
  });

  it('граница «на один сэмпл меньше следующего кадра» — по-прежнему один кадр', async () => {
    // hop = 8 при hopRatio 0.5; следующий старт лёг бы на 8, кадр кончился бы на 24.
    expect(await countFrames(FFT + 8 - 1)).toBe(1);
  });

  it('ровно на следующий кадр — два', async () => {
    expect(await countFrames(FFT + 8)).toBe(2);
  });

  it('длинная запись — семь кадров при перекрытии 50%', async () => {
    expect(await countFrames(FFT * 4)).toBe(7);
  });

  it('явный hop уважается и не подменяется умолчанием', async () => {
    expect(await countFrames(FFT * 4, { hopSize: FFT })).toBe(4);
  });

  it('hopRatio считается от fftSize, а не от длины записи', async () => {
    expect(await countFrames(FFT * 4, { hopRatio: 0.25 })).toBe(13);
  });
});

/**
 * ЗОЛОТОЙ ЗУБ, РАСШИРЕННЫЙ СОДЕРЖИМЫМ КАДРА (замечание архитектора 02.08).
 *
 * Числа кадров мало: оно фиксирует геометрию окна, но не содержимое. Копии обхода жили в
 * четырёх местах и развивались независимо, поэтому «тела совпадают до символа» не равно
 * «совпадают краевые случаи»: остаток короче кадра, последний неполный шаг, округление шага при
 * нецелом `hopRatio·fftSize`. Число кадров при сдвиге совпадёт, а последний кадр — нет.
 *
 * ОЖИДАНИЯ ВЫЧИСЛЯЮТСЯ, А НЕ ПОДБИРАЮТСЯ. Вход — пила (значение равно индексу), поэтому сумма
 * кадра, начинающегося на `s`, равна `L·s + L(L−1)/2` и известна аналитически. Такой зуб ловит
 * сдвиг окна на ОДИН сэмпл и не зависит от снятых констант, которые пришлось бы обновлять
 * вместе с кодом — то есть от зуба, переписываемого под то, что он проверяет.
 */
describe('золотой зуб: содержимое кадров не меняется сводом копий', () => {
  const FFT = 16;

  /**
   * КВАДРАТИЧНАЯ последовательность, а не пила (замечание Дынина 02.08): у пилы сумма кадра
   * линейна, и пропуск одного сэмпла вместе с лишним соседним компенсируются — линейное
   * искажение обхода прошло бы зуб насквозь. На квадратах такие симметрии не спасают.
   */
  const ramp = (n: number) => {
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) out[i] = i * i;
    return out;
  };

  /** Отвечает суммой кадра: сдвиг окна на сэмпл немедленно меняет ответ. */
  const sumProbe = (): import('./types.js').DroneDetector => ({
    name: 'sum-probe',
    family: 'dsp',
    detect: async (w) => {
      let s = 0;
      for (const v of w.samples) s += v;
      // Уверенность несёт сумму как есть, поделённую на заведомо больший масштаб: потолок 1
      // съел бы разницу между кадрами и сделал зуб слепым.
      return { isDrone: s > 0, confidence: s / 1e6, latencyMs: 0 };
    },
  });

  /** Аналитическая сумма квадратов на полуинтервале [start, start+L). */
  const frameSum = (start: number, L: number) => {
    let s = 0;
    for (let i = start; i < start + L; i += 1) s += i * i;
    return s;
  };

  const framesOf = async (length: number, opts: Record<string, unknown> = {}) => {
    const { verdict, frameVerdicts } = await analyzeSample(ramp(length), 48_000, sumProbe(), {
      fftSize: FFT,
      includeFrameVerdicts: true,
      ...opts,
    });
    return {
      frameCount: verdict.frameCount,
      sums: (frameVerdicts ?? []).map((f) => Math.round(f.confidence * 1e6)),
    };
  };

  it('длинная запись: каждый кадр начинается там, где обязан', async () => {
    const hop = FFT / 2;
    const expected = [0, 1, 2, 3, 4, 5, 6].map((i) => frameSum(i * hop, FFT));
    expect(await framesOf(FFT * 4)).toEqual({ frameCount: 7, sums: expected });
  });

  it('пустой буфер: кадров нет', async () => {
    expect(await framesOf(0)).toEqual({ frameCount: 0, sums: [] });
  });

  it('на сэмпл короче окна: кадров нет', async () => {
    expect(await framesOf(FFT - 1)).toEqual({ frameCount: 0, sums: [] });
  });

  it('ровно окно: один кадр от начала записи', async () => {
    expect(await framesOf(FFT)).toEqual({ frameCount: 1, sums: [frameSum(0, FFT)] });
  });

  it('на сэмпл меньше второго кадра: по-прежнему один, хвост отброшен', async () => {
    expect(await framesOf(FFT + FFT / 2 - 1)).toEqual({ frameCount: 1, sums: [frameSum(0, FFT)] });
  });

  it('нецелой шаг округляется вниз, и кадры не съезжают', async () => {
    // hopRatio 0.3 при окне 16 → floor(4.8) = 4.
    const hop = 4;
    const expected = [0, 1, 2, 3, 4].map((i) => frameSum(i * hop, FFT));
    expect(await framesOf(FFT * 2, { hopRatio: 0.3 })).toEqual({ frameCount: 5, sums: expected });
  });
});
