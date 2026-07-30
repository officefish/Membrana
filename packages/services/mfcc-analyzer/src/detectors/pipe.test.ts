import { describe, expect, it } from 'vitest';

import type { MfccVector } from '../types.js';
import { evaluatePipe, type PipeSpec } from './pipe.js';

const HASH = 'mel40-c4-buf512';

const vec = (coefficients: readonly number[], windowStartIndex: number, hash = HASH): MfccVector => ({
  coefficients: Float32Array.from(coefficients),
  windowStartIndex,
  configHash: hash,
});

const SPEC: PipeSpec = {
  bounds: [
    { min: 0, max: 10 },
    { min: 0, max: 10 },
    { min: 0, max: 10 },
    { min: 0, max: 10 },
  ],
  configHash: HASH,
  minInBandRatio: 0.75,
  minPassRate: 0.6,
  minMagnitude: 0.5,
  judgedCoefficients: null,
};

describe('труба судит долей коэффициентов в коридоре, а не тремя метриками', () => {
  it('все коэффициенты внутри — кадр прошёл, прогон детектирован', () => {
    const out = evaluatePipe([vec([1, 2, 3, 4], 0), vec([2, 3, 4, 5], 512)], SPEC);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.report.passedCount).toBe(2);
    expect(out.report.passRate).toBe(1);
    expect(out.report.detected).toBe(true);
  });

  it('доля ниже minInBandRatio — кадр не прошёл (2 из 4 при пороге 0.75)', () => {
    const out = evaluatePipe([vec([1, 2, 99, 99], 0)], SPEC);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.report.frames[0]!.inBandCount).toBe(2);
    expect(out.report.frames[0]!.inBandRatio).toBe(0.5);
    expect(out.report.frames[0]!.state).toBe('failed');
    expect(out.report.detected).toBe(false);
  });

  it('detected считается по доле ПРОШЕДШИХ кадров, а не по последнему', () => {
    const frames = [vec([1, 1, 1, 1], 0), vec([1, 1, 1, 1], 512), vec([99, 99, 99, 99], 1024)];
    const out = evaluatePipe(frames, SPEC);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.report.passRate).toBeCloseTo(2 / 3, 10);
    expect(out.report.detected).toBe(true);
  });

  it('C0 выводится из счёта явным списком, а не скрытой политикой пакета', () => {
    const spec: PipeSpec = { ...SPEC, judgedCoefficients: [1, 2, 3] };
    const out = evaluatePipe([vec([999, 1, 2, 3], 0)], spec);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.report.frames[0]!.judgedCoefficientCount).toBe(3);
    expect(out.report.frames[0]!.state).toBe('passed');
  });
});

describe('ложный зелёный закрыт предикатами, а не обещанием', () => {
  it('вектор из нулей при коридоре, включающем ноль, НЕ даёт зелёного — он немой', () => {
    // Наивная реализация вернула бы inBandRatio=1 и detected=true на чистой тишине.
    const out = evaluatePipe([vec([0, 0, 0, 0], 0)], SPEC);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toContain('немые');
  });

  it('немые кадры не идут в знаменатель passRate', () => {
    const out = evaluatePipe([vec([0, 0, 0, 0], 0), vec([1, 2, 3, 4], 512)], SPEC);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.report.silentCount).toBe(1);
    expect(out.report.judgedCount).toBe(1);
    expect(out.report.passRate).toBe(1);
  });

  it('minMagnitude=0 ВЫКЛЮЧАЕТ защиту — острый край пришпилен, а не спрятан', () => {
    // На ревью обоснование этого края было дано неверно («немые кадры всё равно ведут к
    // отказу»): при пороге 0 немых кадров не бывает вовсе, потому что magnitude < 0 ложно
    // всегда. Значит нулевой вектор судится и проходит коридор, включающий ноль. Край
    // остаётся легальным — но как названный акт вызывающего, зафиксированный зубом.
    const out = evaluatePipe([vec([0, 0, 0, 0], 0)], { ...SPEC, minMagnitude: 0 });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.report.silentCount).toBe(0);
    expect(out.report.detected).toBe(true);
  });

  it('пустой корпус — отказ с причиной, а не detected:false', () => {
    const out = evaluatePipe([], SPEC);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toContain('пуст');
  });
});

describe('несравнимость отпечатков держится трубой, а не вызывающим', () => {
  it('смешанные configHash в корпусе — отказ с обоими отпечатками в причине', () => {
    const out = evaluatePipe([vec([1, 2, 3, 4], 0), vec([1, 2, 3, 4], 512, 'mel26-c4-buf512')], SPEC);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toContain('несравним');
    expect(out.reason).toContain('mel26-c4-buf512');
  });

  it('корпус чужих настроек против коридора, снятого при других — отказ', () => {
    const out = evaluatePipe([vec([1, 2, 3, 4], 0, 'mel26-c4-buf512')], SPEC);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toContain('несравнимо');
  });

  it('корпус не по порядку во времени — отказ (порядок несущий)', () => {
    const out = evaluatePipe([vec([1, 2, 3, 4], 512), vec([1, 2, 3, 4], 0)], SPEC);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toContain('не упорядочен');
  });
});

describe('негодная труба называется поимённо', () => {
  it.each([
    ['коридоров', { ...SPEC, bounds: SPEC.bounds.slice(0, 2) }],
    ['minInBandRatio', { ...SPEC, minInBandRatio: 1.5 }],
    ['minPassRate', { ...SPEC, minPassRate: -1 }],
    ['minMagnitude', { ...SPEC, minMagnitude: Number.NaN }],
    ['judgedCoefficients', { ...SPEC, judgedCoefficients: [9] }],
  ])('%s — отказ с этим полем в причине', (field, spec) => {
    const out = evaluatePipe([vec([1, 2, 3, 4], 0)], spec as PipeSpec);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toContain(field);
  });

  it('вывернутый коридор min > max — отказ, а не пустой вердикт', () => {
    const spec: PipeSpec = { ...SPEC, bounds: [{ min: 5, max: 1 }, ...SPEC.bounds.slice(1)] };
    const out = evaluatePipe([vec([1, 2, 3, 4], 0)], spec);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toContain('min=5');
  });
});
