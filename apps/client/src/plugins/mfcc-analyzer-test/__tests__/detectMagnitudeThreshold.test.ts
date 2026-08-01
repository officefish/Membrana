/**
 * Сателлит замера порога тишины. Спринт `mfcc-plugin-sprint`, блок `mfcc-plugin-tests`.
 *
 * Проверяется не «функция что-то вернула», а два свойства, ради которых она заведена:
 * черта лежит ВЫШЕ увиденной тишины, и отказ приходит значением с причиной, а не тихим нулём.
 */
import { describe, expect, it } from 'vitest';

import {
  MIN_SILENCE_FRAMES,
  SILENCE_HEADROOM,
  detectMagnitudeThreshold,
} from '../detectMagnitudeThreshold';
import { silentVectors, vectorOfMagnitude } from '../__fixtures__/mfccFrameFixtures';

describe('detectMagnitudeThreshold', () => {
  it('отказывает, когда кадров тишины меньше порога выборки', () => {
    const m = detectMagnitudeThreshold(silentVectors(MIN_SILENCE_FRAMES - 1));
    expect(m.floor).toBeNull();
    expect(m.refusal).toContain(String(MIN_SILENCE_FRAMES));
    expect(m.sampleCount).toBe(MIN_SILENCE_FRAMES - 1);
  });

  it('отказ приходит значением, а не исключением: порог просто не назначен', () => {
    expect(() => detectMagnitudeThreshold([])).not.toThrow();
    expect(detectMagnitudeThreshold([]).floor).toBeNull();
  });

  it('называет мёртвый тракт мёртвым, а не тихим, когда разброса нет', () => {
    const flat = Array.from({ length: 20 }, () => vectorOfMagnitude(0.5));
    const m = detectMagnitudeThreshold(flat);
    expect(m.floor).toBeNull();
    expect(m.refusal).toMatch(/мёртв/u);
  });

  it('поток одних нулей — тоже мёртвый тракт, а не идеальная тишина', () => {
    const zeros = Array.from({ length: 20 }, () => vectorOfMagnitude(0));
    expect(detectMagnitudeThreshold(zeros).floor).toBeNull();
  });

  it('при отказе по разбросу всё равно показывает, что именно увидели', () => {
    const flat = Array.from({ length: 20 }, () => vectorOfMagnitude(0.5));
    const m = detectMagnitudeThreshold(flat);
    // Отказ, который не показывает наблюдения, оспорить нельзя — его остаётся только принять.
    expect(m.observed).not.toBeNull();
    expect(m.observed?.max).toBeCloseTo(0.5, 6);
  });

  it('черта лежит ВЫШЕ самой громкой увиденной тишины', () => {
    const m = detectMagnitudeThreshold(silentVectors(20));
    expect(m.refusal).toBeNull();
    expect(m.floor).not.toBeNull();
    expect(m.floor as number).toBeGreaterThan(m.observed?.max as number);
  });

  it('черта равна хвосту распределения с объявленным запасом', () => {
    const m = detectMagnitudeThreshold(silentVectors(20));
    expect(m.floor as number).toBeCloseTo((m.observed?.p99 as number) * SILENCE_HEADROOM, 9);
  });

  it('нечисловые нормы отбрасываются, а не портят черту', () => {
    const good = silentVectors(MIN_SILENCE_FRAMES + 4);
    const withNaN = [...good, [Number.NaN, 0, 0], [Number.POSITIVE_INFINITY, 0, 0]];
    const m = detectMagnitudeThreshold(withNaN);
    expect(m.sampleCount).toBe(good.length);
    expect(Number.isFinite(m.floor as number)).toBe(true);
  });

  it('если после отбрасывания мусора выборки не хватает — отказ, а не черта по остатку', () => {
    const few = [...silentVectors(3), [Number.NaN, 0, 0], [Number.NaN, 0, 0]];
    const m = detectMagnitudeThreshold(few);
    expect(m.floor).toBeNull();
    expect(m.sampleCount).toBe(3);
  });

  it('порядок кадров на черту не влияет', () => {
    const v = silentVectors(20);
    const forward = detectMagnitudeThreshold(v).floor as number;
    const backward = detectMagnitudeThreshold([...v].reverse()).floor as number;
    expect(backward).toBeCloseTo(forward, 12);
  });

  it('громкий выброс поднимает черту — тишина с грохотом тишиной не считается', () => {
    const quiet = detectMagnitudeThreshold(silentVectors(20)).floor as number;
    const withSpike = detectMagnitudeThreshold([...silentVectors(20), vectorOfMagnitude(5)])
      .floor as number;
    expect(withSpike).toBeGreaterThan(quiet);
  });
});
