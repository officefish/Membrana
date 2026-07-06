import { describe, expect, it } from 'vitest';

import { DRONE_CLASSES } from './drone-classes.js';
import {
  meanScoresPerClass,
  scoreToVerdict,
  topClassIndices,
  YAMNET_NUM_CLASSES,
} from './scoring.js';

function zeroClipScores(): Float32Array {
  return new Float32Array(YAMNET_NUM_CLASSES);
}

describe('meanScoresPerClass', () => {
  it('усредняет по кадрам', () => {
    const frames = new Float32Array(2 * YAMNET_NUM_CLASSES);
    frames[0] = 0.2; // кадр 0, класс 0
    frames[YAMNET_NUM_CLASSES] = 0.6; // кадр 1, класс 0
    const mean = meanScoresPerClass(frames, 2);
    expect(mean[0]).toBeCloseTo(0.4, 5);
  });

  it('бросает при неверной форме', () => {
    expect(() => meanScoresPerClass(new Float32Array(10), 2)).toThrow(/форм/i);
  });
});

describe('topClassIndices', () => {
  it('возвращает индексы по убыванию score', () => {
    const scores = zeroClipScores();
    scores[7] = 0.9;
    scores[3] = 0.5;
    scores[100] = 0.7;
    expect(topClassIndices(scores, 3)).toEqual([7, 100, 3]);
  });
});

describe('scoreToVerdict', () => {
  it('высокий Propeller-score → isDrone true, класс в reasoning', () => {
    const scores = zeroClipScores();
    scores[332] = 0.8; // Propeller, airscrew (вес 1)
    const verdict = scoreToVerdict(scores);
    expect(verdict.isDrone).toBe(true);
    expect(verdict.confidence).toBeCloseTo(0.8, 5);
    expect(verdict.reasoning).toContain('Propeller');
    expect(verdict.features['drone:Propeller, airscrew']).toBeCloseTo(0.8, 3);
  });

  it('вес класса ослабляет score: Buzz 0.5×0.4 ниже порога', () => {
    const scores = zeroClipScores();
    scores[125] = 0.5; // Buzz (вес 0.4) → 0.2 < 0.25
    const verdict = scoreToVerdict(scores);
    expect(verdict.isDrone).toBe(false);
    expect(verdict.confidence).toBeCloseTo(0.2, 5);
  });

  it('речь/музыка без дрон-классов → isDrone false, confidence 0', () => {
    const scores = zeroClipScores();
    scores[0] = 0.95; // Speech
    const verdict = scoreToVerdict(scores);
    expect(verdict.isDrone).toBe(false);
    expect(verdict.confidence).toBe(0);
    expect(verdict.reasoning).toContain('Speech');
  });

  it('порог настраивается через options', () => {
    const scores = zeroClipScores();
    scores[333] = 0.3; // Helicopter (вес 1)
    expect(scoreToVerdict(scores, { droneScoreThreshold: 0.5 }).isDrone).toBe(false);
    expect(scoreToVerdict(scores, { droneScoreThreshold: 0.25 }).isDrone).toBe(true);
  });

  it('features содержит score всех дрон-классов', () => {
    const verdict = scoreToVerdict(zeroClipScores());
    for (const spec of DRONE_CLASSES) {
      expect(verdict.features[`drone:${spec.name}`]).toBe(0);
    }
  });
});
