import { describe, expect, it } from 'vitest';
import { sineWindow } from '@membrana/detector-base';

import { YamnetDetector } from './detector.js';
import { YAMNET_NUM_CLASSES } from './core/scoring.js';
import type { YamnetInference } from './core/model.js';

/** Мок модели: отдаёт заданные clip-score одним кадром (без TF.js в контракт-тесте). */
function mockModel(classScores: Partial<Record<number, number>>): {
  infer(): Promise<YamnetInference>;
} {
  const frameScores = new Float32Array(YAMNET_NUM_CLASSES);
  for (const [idx, score] of Object.entries(classScores)) {
    frameScores[Number(idx)] = score ?? 0;
  }
  return { infer: () => Promise.resolve({ frameScores, frameCount: 1 }) };
}

function detectorWith(classScores: Partial<Record<number, number>>): YamnetDetector {
  return new YamnetDetector({
    // Мок покрывает контракт detect() без загрузки 16МБ весов; реальный
    // инференс проверяет node-integration.test.ts.
    modelProvider: () => Promise.resolve(mockModel(classScores) as never),
  });
}

describe('yamnet detector contract', () => {
  it('exposes name and family', () => {
    const detector = detectorWith({});
    expect(detector.name).toBe('yamnet');
    expect(detector.family).toBe('neural');
  });

  it('detect возвращает DetectionResult с валидными полями', async () => {
    const result = await detectorWith({ 332: 0.7 }).detect(sineWindow(440));
    expect(result.isDrone).toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.reasoning).toContain('Propeller');
    expect(result.features).toBeDefined();
  });

  it('не-дроновые классы → isDrone false', async () => {
    const result = await detectorWith({ 0: 0.9 }).detect(sineWindow(440));
    expect(result.isDrone).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('модель грузится один раз (кэш промиса)', async () => {
    let loads = 0;
    const detector = new YamnetDetector({
      modelProvider: () => {
        loads += 1;
        return Promise.resolve(mockModel({}) as never);
      },
    });
    await Promise.all([detector.detect(sineWindow(440)), detector.detect(sineWindow(880))]);
    await detector.detect(sineWindow(220));
    expect(loads).toBe(1);
  });

  it('ошибка загрузки не залипает в кэше', async () => {
    let calls = 0;
    const detector = new YamnetDetector({
      modelProvider: () => {
        calls += 1;
        if (calls === 1) return Promise.reject(new Error('load failed'));
        return Promise.resolve(mockModel({}) as never);
      },
    });
    await expect(detector.detect(sineWindow(440))).rejects.toThrow('load failed');
    await expect(detector.detect(sineWindow(440))).resolves.toBeDefined();
  });
});
