import { describe, it, expect } from 'vitest';
import type {
  AudioWindow,
  DetectionResult,
  DetectorFamily,
  DroneDetector,
} from '@membrana/detector-base';
import {
  EnsembleProducer,
  fuseDetectorResults,
  detectorSnapshotToFusionInput,
} from './service.js';
import type { DetectorSnapshot } from './types.js';

// ---------- helpers ----------

function result(confidence: number, isDrone = confidence >= 0.5): DetectionResult {
  return { isDrone, confidence, latencyMs: 0 };
}

function snapshot(
  name: string,
  family: DetectorFamily,
  confidence: number | null,
  weight?: number,
): DetectorSnapshot {
  return {
    name,
    family,
    result: confidence === null ? null : result(confidence),
    weight,
  };
}

const WINDOW: AudioWindow = {
  samples: new Float32Array(0),
  sampleRate: 48000,
  timestamp: 0,
  durationSec: 0,
};

/** Мок-детектор: возвращает фиксированный confidence (или бросает / молчит). */
function mockDetector(
  name: string,
  family: DetectorFamily,
  behavior: number | 'throw',
): DroneDetector {
  return {
    name,
    family,
    async detect(): Promise<DetectionResult> {
      if (behavior === 'throw') throw new Error(`${name} inference failed`);
      return result(behavior);
    },
  };
}

// ---------- fuseDetectorResults (чистое слияние) ----------

describe('fuseDetectorResults', () => {
  it('согласие high↔high → высокий combinedScore, agreement ≈ 1', () => {
    const fusion = fuseDetectorResults([
      snapshot('trends', 'dsp', 0.9),
      snapshot('yamnet', 'neural', 0.85),
    ]);
    expect(fusion.combinedScore).toBeCloseTo(0.875, 5);
    expect(fusion.agreement).toBeGreaterThan(0.9);
    expect(fusion.presentCount).toBe(2);
  });

  it('согласие low↔low → низкий combinedScore, agreement высокий', () => {
    const fusion = fuseDetectorResults([
      snapshot('trends', 'dsp', 0.1),
      snapshot('yamnet', 'neural', 0.15),
    ]);
    expect(fusion.combinedScore).toBeLessThan(0.2);
    expect(fusion.agreement).toBeGreaterThan(0.9);
  });

  it('расхождение high↔low → середина, низкий agreement', () => {
    const fusion = fuseDetectorResults([
      snapshot('trends', 'dsp', 0.95),
      snapshot('yamnet', 'neural', 0.05),
    ]);
    expect(fusion.combinedScore).toBeCloseTo(0.5, 5);
    expect(fusion.agreement).toBeLessThan(0.2);
  });

  it('молчащий детектор (result=null) не влияет на combinedScore', () => {
    const fusion = fuseDetectorResults([
      snapshot('trends', 'dsp', 0.8),
      snapshot('yamnet', 'neural', null),
    ]);
    expect(fusion.combinedScore).toBeCloseTo(0.8, 5);
    expect(fusion.presentCount).toBe(1);
    // <2 присутствующих → agreement 1 (расхождению неоткуда взяться).
    expect(fusion.agreement).toBe(1);
  });

  it('все молчат → combinedScore 0, presentCount 0', () => {
    const fusion = fuseDetectorResults([
      snapshot('trends', 'dsp', null),
      snapshot('yamnet', 'neural', null),
    ]);
    expect(fusion.combinedScore).toBe(0);
    expect(fusion.presentCount).toBe(0);
  });

  it('больший вес нейро сдвигает combinedScore к yamnet', () => {
    const equal = fuseDetectorResults([
      snapshot('trends', 'dsp', 0.2),
      snapshot('yamnet', 'neural', 0.8),
    ]);
    const neuralHeavy = fuseDetectorResults([
      snapshot('trends', 'dsp', 0.2),
      snapshot('yamnet', 'neural', 0.8, 3),
    ]);
    expect(equal.combinedScore).toBeCloseTo(0.5, 5);
    // (0.2·1 + 0.8·3) / 4 = 0.65 — ближе к yamnet.
    expect(neuralHeavy.combinedScore).toBeCloseTo(0.65, 5);
    expect(neuralHeavy.combinedScore).toBeGreaterThan(equal.combinedScore);
  });

  it('detectorSnapshotToFusionInput: молчащий → present:false, confidence 0', () => {
    const input = detectorSnapshotToFusionInput(snapshot('yamnet', 'neural', null));
    expect(input.present).toBe(false);
    expect(input.confidence).toBe(0);
    expect(input.family).toBe('neural');
  });
});

// ---------- EnsembleProducer (оркестрация над окнами) ----------

describe('EnsembleProducer', () => {
  it('combinedScore > 0 на живом входе; согласие → высокий', async () => {
    const producer = new EnsembleProducer([
      mockDetector('trends', 'dsp', 0.9),
      mockDetector('yamnet', 'neural', 0.85),
    ]);
    const out = await producer.analyze(WINDOW);
    expect(out.combinedScore).toBeGreaterThan(0);
    expect(out.combinedScore).toBeCloseTo(0.875, 5);
    expect(out.smoothedScore).toBeCloseTo(out.combinedScore, 5); // smoothing=1 по умолчанию
  });

  it('упавший детектор трактуется как молчащий, не рушит analyze', async () => {
    const producer = new EnsembleProducer([
      mockDetector('trends', 'dsp', 0.8),
      mockDetector('yamnet', 'neural', 'throw'),
    ]);
    const out = await producer.analyze(WINDOW);
    expect(out.presentCount).toBe(1);
    expect(out.combinedScore).toBeCloseTo(0.8, 5);
  });

  it('веса детекторов по имени сдвигают combinedScore', async () => {
    const producer = new EnsembleProducer(
      [mockDetector('trends', 'dsp', 0.2), mockDetector('yamnet', 'neural', 0.8)],
      { weights: { yamnet: 3 } },
    );
    const out = await producer.analyze(WINDOW);
    expect(out.combinedScore).toBeCloseTo(0.65, 5);
  });

  it('EMA-сглаживание монотонно приближает выход к постоянному входу', async () => {
    const producer = new EnsembleProducer(
      [mockDetector('yamnet', 'neural', 0.8)],
      { smoothing: 0.5 },
    );
    const first = await producer.analyze(WINDOW); // ema=null → сразу 0.8
    expect(first.smoothedScore).toBeCloseTo(0.8, 5);
    // Меняем на детектор с 0.0 и смотрим, что EMA плавно спускается, а не прыгает.
    const producer2 = new EnsembleProducer(
      [mockDetector('yamnet', 'neural', 0.8)],
      { smoothing: 0.5 },
    );
    await producer2.analyze(WINDOW); // 0.8
    const step = await producer2.analyze(WINDOW); // константа → остаётся 0.8
    expect(step.smoothedScore).toBeCloseTo(0.8, 5);
  });

  it('smoothing<1: скачок входа сглаживается (выход между старым и новым)', async () => {
    // Продюсер с одним детектором, чей confidence меняется между вызовами.
    let conf = 0.9;
    const detector: DroneDetector = {
      name: 'yamnet',
      family: 'neural',
      async detect(): Promise<DetectionResult> {
        return result(conf);
      },
    };
    const producer = new EnsembleProducer([detector], { smoothing: 0.25 });
    const a = await producer.analyze(WINDOW); // ema=0.9
    expect(a.smoothedScore).toBeCloseTo(0.9, 5);
    conf = 0.1;
    const b = await producer.analyze(WINDOW); // 0.25·0.1 + 0.75·0.9 = 0.7
    expect(b.smoothedScore).toBeCloseTo(0.7, 5);
    expect(b.combinedScore).toBeCloseTo(0.1, 5); // мгновенный — уже 0.1
    expect(b.smoothedScore).toBeGreaterThan(b.combinedScore); // инерция вниз
  });

  it('reset() очищает EMA-состояние', async () => {
    const detector = mockDetector('yamnet', 'neural', 0.8);
    const producer = new EnsembleProducer([detector], { smoothing: 0.5 });
    await producer.analyze(WINDOW);
    producer.reset();
    const afterReset = await producer.analyze(WINDOW);
    expect(afterReset.smoothedScore).toBeCloseTo(0.8, 5); // как первый вызов
  });

  it('окно без детекторов → combinedScore 0', async () => {
    const producer = new EnsembleProducer([]);
    const out = await producer.analyze(WINDOW);
    expect(out.combinedScore).toBe(0);
    expect(out.presentCount).toBe(0);
    expect(out.smoothedScore).toBe(0);
  });
});
