/**
 * Интеграция с реальной моделью (бандленные веса, node). Первый прогон платит
 * загрузку графа (~секунды) — таймаут увеличен. Ассерты на структуру и
 * направление сигнала, не на точные значения (zero-shot, калибровка — ND3).
 */
import { describe, expect, it } from 'vitest';
import { sineWindow, whiteNoiseWindow } from '@membrana/detector-base';

import { createYamnetDetectorNode, readYamnetArtifacts } from './node.js';

describe('yamnet real-model integration (node)', () => {
  it('артефакты бандла читаются и согласованы', async () => {
    const artifacts = await readYamnetArtifacts();
    expect(artifacts.modelJson.weightsManifest.length).toBeGreaterThan(0);
    const shardCount = artifacts.modelJson.weightsManifest.flatMap((g) => g.paths).length;
    expect(artifacts.weightShards.length).toBe(shardCount);
  });

  it(
    'инференс на синусе и шуме: валидная структура, не-дрон',
    async () => {
      const detector = createYamnetDetectorNode();

      const sine = await detector.detect(sineWindow(440, 1));
      expect(sine.confidence).toBeGreaterThanOrEqual(0);
      expect(sine.confidence).toBeLessThanOrEqual(1);
      expect(sine.latencyMs).toBeGreaterThan(0);
      expect(sine.reasoning).toBeTruthy();
      expect(Object.keys(sine.features ?? {}).length).toBeGreaterThan(0);

      const noise = await detector.detect(whiteNoiseWindow());
      expect(noise.confidence).toBeLessThanOrEqual(1);

      // Чистый синус 440 Гц — не дрон: score дрон-классов должен быть слабым.
      expect(sine.isDrone).toBe(false);
    },
    120_000,
  );

  it(
    'инференс детерминирован: одинаковый вход → одинаковый вердикт',
    async () => {
      const detector = createYamnetDetectorNode();
      const first = await detector.detect(sineWindow(440, 1));
      const second = await detector.detect(sineWindow(440, 1));
      expect(second.isDrone).toBe(first.isDrone);
      expect(second.confidence).toBeCloseTo(first.confidence, 5);
    },
    120_000,
  );
});
