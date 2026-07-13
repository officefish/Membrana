import { describe, expect, it } from 'vitest';

import {
  buildCodeAnchorRecord,
  evaluateProdMainDivergence,
  type CodeAnchorMeta,
  type DriftAnchorRecord,
} from './drift-anchor.js';

const META: CodeAnchorMeta = {
  anchorSource: 'ci',
  detectorVersion: 'abc1234',
  takenAt: '2026-07-13T04:00:00.000Z',
};

const BASELINE = { harmonic: 0.5325, yamnet: 0.8029 };

describe('buildCodeAnchorRecord', () => {
  it('равные метрики → ok, delta 0', () => {
    const r = buildCodeAnchorRecord(BASELINE, { harmonic: 0.5325, yamnet: 0.8029 }, 0.01, META);
    expect(r.verdict).toBe('ok');
    expect(r.delta).toBe(0);
    expect(r.anchorKind).toBe('code');
    expect(r.imageFrozenAt).toBeNull();
    expect(r.metrics).toEqual({ harmonic: 0.5325, yamnet: 0.8029 });
  });

  it('регресс в пределах ε → drift (виден, не блокит)', () => {
    const r = buildCodeAnchorRecord(BASELINE, { harmonic: 0.528, yamnet: 0.8029 }, 0.01, META);
    expect(r.verdict).toBe('drift');
    expect(r.delta).toBeCloseTo(0.0045, 6);
  });

  it('регресс > ε → broken (жёсткий блок merge)', () => {
    const r = buildCodeAnchorRecord(BASELINE, { harmonic: 0.5325, yamnet: 0.75 }, 0.01, META);
    expect(r.verdict).toBe('broken');
    expect(r.delta).toBeCloseTo(0.0529, 6);
  });

  it('рост F1 — не дрейф (направленная семантика)', () => {
    const r = buildCodeAnchorRecord(BASELINE, { harmonic: 0.6, yamnet: 0.9 }, 0.01, META);
    expect(r.verdict).toBe('ok');
    expect(r.delta).toBe(0);
  });

  it('детектор исчез из прогона → broken, delta = его baseline F1', () => {
    const r = buildCodeAnchorRecord(BASELINE, { harmonic: 0.5325 }, 0.01, META);
    expect(r.verdict).toBe('broken');
    expect(r.delta).toBe(0.8029);
  });

  it('новый детектор попадает в metrics, но вердикт не трогает', () => {
    const r = buildCodeAnchorRecord(
      BASELINE,
      { harmonic: 0.5325, yamnet: 0.8029, clap: 0.42 },
      0.01,
      META,
    );
    expect(r.verdict).toBe('ok');
    expect(r.metrics.clap).toBe(0.42);
  });

  it('регресс РОВНО на ε → drift, не broken (строгое > на границе)', () => {
    const r = buildCodeAnchorRecord({ yamnet: 0.8029 }, { yamnet: 0.7929 }, 0.01, META);
    expect(r.delta).toBeCloseTo(0.01, 6);
    expect(r.verdict).toBe('drift');
  });

  it('регресс на ε + минимальный шаг округления → broken', () => {
    const r = buildCodeAnchorRecord({ yamnet: 0.8029 }, { yamnet: 0.7928 }, 0.01, META);
    expect(r.verdict).toBe('broken');
  });

  it('пустой baseline → broken (fail-closed: мисконфиг гейта не проходит тихо)', () => {
    const r = buildCodeAnchorRecord({}, { yamnet: 0.8029 }, 0.01, META);
    expect(r.verdict).toBe('broken');
  });

  it('NaN/undefined в метриках или порог не число → broken (fail-closed)', () => {
    expect(
      buildCodeAnchorRecord({ yamnet: Number.NaN }, { yamnet: 0.8 }, 0.01, META).verdict,
    ).toBe('broken');
    expect(
      buildCodeAnchorRecord({ yamnet: 0.8 }, { yamnet: Number.NaN }, 0.01, META).verdict,
    ).toBe('broken');
    expect(
      buildCodeAnchorRecord({ yamnet: 0.8 }, { yamnet: 0.8 }, Number.NaN, META).verdict,
    ).toBe('broken');
  });

  it('float-шум ниже 4 знаков гасится округлением', () => {
    const r = buildCodeAnchorRecord(
      { yamnet: 0.80291 },
      { yamnet: 0.80293000001 },
      0.01,
      META,
    );
    expect(r.verdict).toBe('ok');
    expect(r.delta).toBe(0);
  });
});

function codeRecord(overrides: Partial<DriftAnchorRecord>): DriftAnchorRecord {
  return {
    anchorKind: 'code',
    anchorSource: 'ci',
    detectorVersion: 'abc1234',
    imageFrozenAt: null,
    delta: 0,
    verdict: 'ok',
    takenAt: '2026-07-13T04:00:00.000Z',
    metrics: { yamnet: 0.8029 },
    ...overrides,
  };
}

describe('evaluateProdMainDivergence', () => {
  it('одна версия, совпавшие метрики → in-sync', () => {
    const d = evaluateProdMainDivergence(
      codeRecord({ anchorSource: 'ci' }),
      codeRecord({ anchorSource: 'schedule' }),
      0.005,
    );
    expect(d.verdict).toBe('in-sync');
    expect(d.delta).toBe(0);
    expect(d.reasons).toEqual([]);
  });

  it('разные detectorVersion → stale-ci (не danger)', () => {
    const d = evaluateProdMainDivergence(
      codeRecord({ detectorVersion: 'old0000' }),
      codeRecord({ anchorSource: 'schedule', detectorVersion: 'new1111' }),
      0.005,
    );
    expect(d.verdict).toBe('stale-ci');
    expect(d.reasons).toHaveLength(1);
  });

  it('одна версия, метрики разошлись > ε → diverged «Прод ≠ main»', () => {
    const d = evaluateProdMainDivergence(
      codeRecord({ metrics: { yamnet: 0.8029 } }),
      codeRecord({ anchorSource: 'schedule', metrics: { yamnet: 0.7514 } }),
      0.005,
    );
    expect(d.verdict).toBe('diverged');
    expect(d.delta).toBeCloseTo(0.0515, 6);
    expect(d.reasons[0]).toContain('yamnet');
  });

  it('детектор есть только с одной стороны → diverged', () => {
    const d = evaluateProdMainDivergence(
      codeRecord({ metrics: { yamnet: 0.8029, harmonic: 0.5325 } }),
      codeRecord({ anchorSource: 'schedule', metrics: { yamnet: 0.8029 } }),
      0.005,
    );
    expect(d.verdict).toBe('diverged');
    expect(d.reasons[0]).toContain('harmonic');
  });

  it('расхождение РОВНО на ε → in-sync (строгое > на границе)', () => {
    const d = evaluateProdMainDivergence(
      codeRecord({ metrics: { yamnet: 0.8029 } }),
      codeRecord({ anchorSource: 'schedule', metrics: { yamnet: 0.7979 } }),
      0.005,
    );
    expect(d.delta).toBeCloseTo(0.005, 6);
    expect(d.verdict).toBe('in-sync');
  });

  it('нечисловая метрика в журнале → diverged (fail-visible)', () => {
    const d = evaluateProdMainDivergence(
      codeRecord({ metrics: { yamnet: Number.NaN } }),
      codeRecord({ anchorSource: 'schedule', metrics: { yamnet: 0.8029 } }),
      0.005,
    );
    expect(d.verdict).toBe('diverged');
    expect(d.reasons[0]).toContain('нечисловая');
  });

  it('не code-anchor запись → TypeError (защита от смешения якорей)', () => {
    expect(() =>
      evaluateProdMainDivergence(
        codeRecord({ anchorKind: 'data' }),
        codeRecord({ anchorSource: 'schedule' }),
        0.005,
      ),
    ).toThrow(TypeError);
  });
});
