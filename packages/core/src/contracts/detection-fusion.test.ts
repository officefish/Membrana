import { describe, expect, it } from 'vitest';

import { fuseDetectorConfidences, type FusionSourceInput } from './detection-fusion.js';

const trends = (confidence: number, isDrone = confidence >= 0.5): FusionSourceInput => ({
  name: 'trends',
  family: 'dsp',
  confidence,
  isDrone,
});

const yamnet = (confidence: number, isDrone = confidence >= 0.5): FusionSourceInput => ({
  name: 'yamnet',
  family: 'neural',
  confidence,
  isDrone,
});

describe('fuseDetectorConfidences', () => {
  describe('согласие источников', () => {
    it('оба high → combinedScore high, agreement high', () => {
      const result = fuseDetectorConfidences([trends(0.9), yamnet(0.8)]);
      expect(result.combinedScore).toBeCloseTo(0.85, 10);
      expect(result.agreement).toBeCloseTo(0.9, 10); // 1 - |0.9-0.8|
      expect(result.presentCount).toBe(2);
    });

    it('оба low → combinedScore low, agreement high', () => {
      const result = fuseDetectorConfidences([trends(0.1), yamnet(0.15)]);
      expect(result.combinedScore).toBeCloseTo(0.125, 10);
      expect(result.agreement).toBeCloseTo(0.95, 10);
    });
  });

  describe('расхождение источников', () => {
    it('один high, другой low → середина, agreement low (НЕ бинарный OR)', () => {
      const result = fuseDetectorConfidences([trends(0.9), yamnet(0.2)]);
      // OR дал бы ~0.9; взвешенное среднее держит середину.
      expect(result.combinedScore).toBeCloseTo(0.55, 10);
      expect(result.agreement).toBeCloseTo(0.3, 10); // 1 - |0.9-0.2|
    });

    it('одиночный сильный детектор НЕ выстреливает как OR', () => {
      const result = fuseDetectorConfidences([trends(1), yamnet(0)]);
      expect(result.combinedScore).toBeCloseTo(0.5, 10);
      expect(result.agreement).toBeCloseTo(0, 10);
    });
  });

  describe('один источник молчит', () => {
    it('present:false исключён из среднего и agreement, но виден в perSource', () => {
      const result = fuseDetectorConfidences([
        trends(0.8),
        { ...yamnet(0.99), present: false },
      ]);
      expect(result.combinedScore).toBeCloseTo(0.8, 10); // молчащий yamnet не тянет вверх
      expect(result.presentCount).toBe(1);
      expect(result.agreement).toBe(1); // <2 присутствующих — расхождению неоткуда взяться

      const silent = result.perSource.find((s) => s.name === 'yamnet');
      expect(silent?.present).toBe(false);
      expect(silent?.normalizedWeight).toBe(0);
      expect(silent?.confidence).toBeCloseTo(0.99, 10); // confidence сохранён для показа
    });

    it('оба молчат → combinedScore 0, presentCount 0, agreement 1', () => {
      const result = fuseDetectorConfidences([
        { ...trends(0.7), present: false },
        { ...yamnet(0.9), present: false },
      ]);
      expect(result.combinedScore).toBe(0);
      expect(result.presentCount).toBe(0);
      expect(result.agreement).toBe(1);
      expect(result.perSource).toHaveLength(2);
    });
  });

  describe('веса', () => {
    it('нейро с бóльшим весом смещает combinedScore в свою сторону', () => {
      const result = fuseDetectorConfidences([
        { ...trends(0.2), weight: 1 },
        { ...yamnet(0.8), weight: 3 },
      ]);
      // (0.2*1 + 0.8*3) / 4 = 0.65
      expect(result.combinedScore).toBeCloseTo(0.65, 10);
      const neural = result.perSource.find((s) => s.name === 'yamnet');
      expect(neural?.normalizedWeight).toBeCloseTo(0.75, 10);
    });

    it('нулевой/отрицательный вес исключает источник из среднего', () => {
      const result = fuseDetectorConfidences([
        { ...trends(0.9), weight: 0 },
        { ...yamnet(0.3), weight: -5 },
      ]);
      // Оба веса → 0, totalWeight 0 → combinedScore 0, хотя presentCount=2.
      expect(result.combinedScore).toBe(0);
      expect(result.presentCount).toBe(2);
    });
  });

  describe('устойчивость (тотальная функция)', () => {
    it('пустой вход → нули без исключения', () => {
      const result = fuseDetectorConfidences([]);
      expect(result).toEqual({
        combinedScore: 0,
        agreement: 1,
        presentCount: 0,
        perSource: [],
      });
    });

    it('confidence вне [0..1] и NaN клампятся', () => {
      const result = fuseDetectorConfidences([trends(1.5), yamnet(Number.NaN)]);
      // 1.5→1, NaN→0 ⇒ среднее 0.5
      expect(result.combinedScore).toBeCloseTo(0.5, 10);
      expect(result.perSource[0]?.confidence).toBe(1);
      expect(result.perSource[1]?.confidence).toBe(0);
    });

    it('сохраняет порядок и количество источников в perSource', () => {
      const result = fuseDetectorConfidences([yamnet(0.4), trends(0.6)]);
      expect(result.perSource.map((s) => s.name)).toEqual(['yamnet', 'trends']);
    });
  });
});
