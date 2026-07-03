import { describe, expect, it } from 'vitest';
import {
  FREE_V1_CLASS_MIN_CONFIDENCE,
  FREE_V1_DRONE_FIRST_MIN_GAP,
} from '@membrana/trends-detector-service';

import { buildClassifyOptions } from './run-template-match-analysis.js';

/**
 * Регрессия 2026-07-03 (обнаружена HG3 preliminary-прогоном): после
 * fv1-s3 каталог template-match получил free-v1 конкурентов, но classifyTrends
 * вызывался без drone-first калибровки → benchmark recall 0.000 на v0.2
 * (таблица DETECTOR_BENCHMARK: 88.3%). Тест фиксирует контракт опций.
 */
describe('buildClassifyOptions (template-match ↔ free-v1 калибровка)', () => {
  it('передаёт drone-first gap и пер-классовые пороги из trends-detector', () => {
    const options = buildClassifyOptions({ minConfidence: 55, activityRmsThreshold: 0.02 });
    expect(options.droneFirstMinGap).toBe(FREE_V1_DRONE_FIRST_MIN_GAP);
    expect(options.classMinConfidence).toBe(FREE_V1_CLASS_MIN_CONFIDENCE);
    expect(options.minConfidence).toBe(55);
    expect(options.activityRmsThreshold).toBe(0.02);
  });

  it('drone-first gap положительный (политика активна)', () => {
    expect(FREE_V1_DRONE_FIRST_MIN_GAP).toBeGreaterThan(0);
  });
});
