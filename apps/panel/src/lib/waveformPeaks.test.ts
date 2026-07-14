import { describe, expect, it } from 'vitest';
import { downsamplePeaks } from './waveformPeaks';

describe('downsamplePeaks', () => {
  it('пики честные: одиночный импульс не размазывается усреднением', () => {
    // 1000 почти нулевых сэмплов, один «выстрел» 1.0 в середине.
    const samples = new Float32Array(1000).fill(0.01);
    samples[500] = 1;
    const peaks = downsamplePeaks(samples, 10);
    // Бакет с импульсом держит полный максимум (среднее дало бы ~0.02).
    expect(peaks[5]).toBe(1);
    expect(peaks[0]).toBeCloseTo(0.01, 5);
  });

  it('берёт |амплитуду| — отрицательные пики видны', () => {
    const samples = new Float32Array(100).fill(0);
    samples[10] = -0.8;
    const peaks = downsamplePeaks(samples, 10);
    expect(peaks[1]).toBeCloseTo(0.8, 5);
  });

  it('устойчив к краям: пустой вход и buckets > длины', () => {
    expect(Array.from(downsamplePeaks(new Float32Array(0), 5))).toEqual([0, 0, 0, 0, 0]);
    const two = new Float32Array([0.5, 0.25]);
    const peaks = downsamplePeaks(two, 4);
    expect(peaks.length).toBe(4);
    // Каждый сэмпл попадает хотя бы в один бакет, максимум не теряется.
    expect(Math.max(...Array.from(peaks))).toBe(0.5);
  });
});
