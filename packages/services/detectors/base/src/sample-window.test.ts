/**
 * Зубы единого носителя подготовки окна.
 *
 * Держат дефект, ради которого свод и делается: до 02.08 обход кадров жил в четырёх копиях, и
 * починка «детектор слышит первые fftSize сэмплов вместо записи» доехала до одного пакета
 * 01.08, а до двух других — только на следующий день.
 *
 * Здесь проверяется НОСИТЕЛЬ. Поведение конкретного детектора остаётся в его пакете: зуб окна
 * не знает ни про кепстр, ни про поток.
 */
import { describe, expect, it } from 'vitest';

import {
  averageMagnitudes,
  fftFrames,
  geometricMeanMagnitudes,
  prepareFftSamples,
} from './sample-window.js';

const FFT = 8;

/** Спектр-заглушка: одно число, равное среднему модулю кадра. */
const meanMagnitude = (frame: Float32Array): Float32Array => {
  let sum = 0;
  for (const v of frame) sum += Math.abs(v);
  return new Float32Array([sum / frame.length]);
};

/** Спектр-заглушка: первый сэмпл кадра — так у кадров получаются разные «спектры». */
const firstSample = (frame: Float32Array): Float32Array => new Float32Array([frame[0] ?? 0]);

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

  it('хвост короче кадра не добивается нулями — спектра, которого нет, не вносим', () => {
    expect([...fftFrames(new Float32Array(20), FFT, 4)].length).toBe(4);
  });

  it('запись короче окна кадров не даёт вовсе', () => {
    expect([...fftFrames(new Float32Array(FFT - 1), FFT)]).toEqual([]);
  });

  it('запись ровно в окно даёт ровно один кадр', () => {
    expect([...fftFrames(new Float32Array(FFT), FFT)].length).toBe(1);
  });

  it('кадры — окна исходного буфера, а не копии: свод не платит за лишнюю память', () => {
    const samples = new Float32Array(16);
    for (const f of fftFrames(samples, FFT)) expect(f.buffer).toBe(samples.buffer);
  });
});

describe('короткий вход дополняется нулями', () => {
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

describe('арифметический свод — для линейных мерок', () => {
  it('судит всю запись, а не первый кадр', () => {
    // Первая половина тихая, вторая громкая. Прежнее поведение — обрезка до первого кадра —
    // вернуло бы ноль и объявило запись тишиной.
    const samples = new Float32Array(32);
    samples.fill(0, 0, 16);
    samples.fill(1, 16, 32);

    expect(averageMagnitudes(samples, FFT, meanMagnitude, FFT)?.[0]).toBeCloseTo(0.5, 6);
    expect(meanMagnitude(prepareFftSamples(samples, FFT))[0]).toBe(0);
  });

  it('запись короче окна — кадров нет, отдаёт null, а не выдуманный спектр', () => {
    expect(averageMagnitudes(new Float32Array(FFT - 1), FFT, meanMagnitude)).toBeNull();
  });

  it('запись ровно в окно даёт спектр этого окна', () => {
    expect(averageMagnitudes(new Float32Array(FFT).fill(2), FFT, meanMagnitude)?.[0]).toBeCloseTo(2, 6);
  });
});

describe('геометрический свод — для кепстра', () => {
  it('логарифм сведённого равен среднему логарифмов — это и есть усреднение кепстров', () => {
    const samples = new Float32Array([4, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 0, 0]);
    const merged = geometricMeanMagnitudes(samples, FFT, firstSample, FFT);
    const meanOfLogs = (Math.log(4 + 1e-10) + Math.log(16 + 1e-10)) / 2;
    expect(Math.log(merged?.[0] ?? 0)).toBeCloseTo(meanOfLogs, 5);
  });

  it('пик не раздувается: сведённое строго меньше арифметического при разных кадрах', () => {
    const samples = new Float32Array([4, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 0, 0]);
    const geo = geometricMeanMagnitudes(samples, FFT, firstSample, FFT) ?? new Float32Array([0]);
    const ari = averageMagnitudes(samples, FFT, firstSample, FFT) ?? new Float32Array([0]);

    expect(geo[0]).toBeCloseTo(8, 5); // √(4·16)
    expect(ari[0]).toBeCloseTo(10, 5); // (4+16)/2
    expect(geo[0]).toBeLessThan(ari[0] as number);
  });

  it('одинаковые кадры: два свода совпадают — расхождения без причины нет', () => {
    const samples = new Float32Array([9, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0]);
    expect(geometricMeanMagnitudes(samples, FFT, firstSample, FFT)?.[0]).toBeCloseTo(9, 5);
    expect(averageMagnitudes(samples, FFT, firstSample, FFT)?.[0]).toBeCloseTo(9, 5);
  });

  it('кадров нет — null, как и у соседа: два свода отвечают одинаково на пустоту', () => {
    expect(geometricMeanMagnitudes(new Float32Array(FFT - 1), FFT, firstSample)).toBeNull();
  });
});

/**
 * Дыры, названные Дыниным на разборе блока 02.08. Прежние зубы проверяли ЧИСЛО кадров, а
 * ломались 01–02.08 именно позиции; «кадры суть окна буфера» проверялось по `.buffer`, что
 * пропускает посторонний сдвиг; эпсилон геометрического свода был задан, но не проверен.
 */
describe('свойства, которыми свод копий и ломался', () => {
  it('старты кадров — ровно кратные шагу, а не «столько же штук»', () => {
    const samples = new Float32Array(FFT * 4);
    const hop = FFT / 2;
    const starts = [...fftFrames(samples, FFT)].map((f) => f.byteOffset / samples.BYTES_PER_ELEMENT);
    expect(starts).toEqual([0, hop, hop * 2, hop * 3, hop * 4, hop * 5, hop * 6]);
  });

  it('кадр — окно буфера С ТЕМ ЖЕ смещением: zero-copy проверяется адресом, не только буфером', () => {
    const samples = new Float32Array(FFT * 3);
    const hop = FFT / 2;
    [...fftFrames(samples, FFT)].forEach((f, i) => {
      expect(f.buffer).toBe(samples.buffer);
      expect(f.byteOffset).toBe(i * hop * samples.BYTES_PER_ELEMENT);
    });
  });

  it('арифметический свод совпадает с покомпонентным средним спектров кадров', () => {
    // Прежде это проверялось скаляром на одной паре; спектр из нескольких полос мог бы
    // усредняться правильно в первой и криво в остальных.
    const samples = new Float32Array([1, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0]);
    const spectrumOf = (f: Float32Array) => new Float32Array([f[0] ?? 0, (f[0] ?? 0) * 2, (f[0] ?? 0) + 10]);
    const merged = averageMagnitudes(samples, FFT, spectrumOf, FFT);
    expect([...(merged ?? [])]).toEqual([2, 4, 12]);
  });

  it('ноль в одном кадре не зануляет геометрический свод — эпсилон держит контракт', () => {
    const samples = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0]);
    const merged = geometricMeanMagnitudes(samples, FFT, firstSample, FFT);
    expect(merged?.[0]).toBeGreaterThan(0);
    expect(merged?.[0]).toBeLessThan(4);
  });
});

describe('шаг меньше сэмпла — ошибка входа, а не пустота', () => {
  it('нулевой шаг отвергается: иначе обход выдаёт один кадр бесконечно', () => {
    // Дефект старше свода — он жил во всех четырёх копиях одинаково. Проверено до починки:
    // 1001 итерация без продвижения.
    expect(() => [...fftFrames(new Float32Array(64), FFT, 0)]).toThrow(RangeError);
  });

  it('отрицательный и нечисловой шаг — та же ошибка входа', () => {
    expect(() => [...fftFrames(new Float32Array(64), FFT, -4)]).toThrow(RangeError);
    expect(() => [...fftFrames(new Float32Array(64), FFT, Number.NaN)]).toThrow(RangeError);
  });

  it('шаг ровно в один сэмпл законен — граница не съехала', () => {
    expect([...fftFrames(new Float32Array(FFT + 2), FFT, 1)].length).toBe(3);
  });
});

describe('инвариант соседства кадров — им держится ТОЛЬКО детектор потока', () => {
  it('кадры несут исходные сэмплы без единого дополнения', () => {
    // Замечание Дынина 02.08: любое «безобидное» изменение носителя — дополнить хвост нулями,
    // повторить последний кадр, наложить окно Ханна — сломает ТОЛЬКО поток, и сломает молча:
    // соседи усредняют и сдвига не заметят, а поток мерит разницу между соседними кадрами.
    const samples = new Float32Array(FFT * 3);
    for (let i = 0; i < samples.length; i += 1) samples[i] = i + 1;
    const hop = FFT / 2;

    [...fftFrames(samples, FFT)].forEach((frame, idx) => {
      const start = idx * hop;
      expect([...frame]).toEqual([...samples.subarray(start, start + FFT)]);
      expect(frame.some((v) => v === 0)).toBe(false); // ни одного дополненного нуля
    });
  });

  it('соседние кадры перекрываются ровно на окно минус шаг', () => {
    const samples = new Float32Array(FFT * 3);
    for (let i = 0; i < samples.length; i += 1) samples[i] = i + 1;
    const frames = [...fftFrames(samples, FFT)];
    const hop = FFT / 2;

    for (let i = 1; i < frames.length; i += 1) {
      const prevTail = [...(frames[i - 1] as Float32Array).subarray(hop)];
      const currHead = [...(frames[i] as Float32Array).subarray(0, FFT - hop)];
      expect(currHead).toEqual(prevTail);
    }
  });
});
