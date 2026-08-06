/**
 * Зубы блока `mfcc-judge-by-package` спринта `handoff-7-9`.
 *
 * Охраняемый рубеж — эквивалентность. Прибор перестал судить собственной копией и зовёт
 * судью пакета; признак успеха назван обзором (`docs/discussions/mfcc-judge-semantics.md`)
 * и НЕ равен «зубы зелёные»: приговоры обязаны совпасть с теми, что прибор выносил до
 * замены. Числа ниже сняты прогоном ДО правки и вписаны сюда как эталон.
 */
import { describe, expect, it } from 'vitest';

import { judgeFrame, judgeSeries, vectorMagnitude } from '../mfccAnalyzerPlugin';
import { MFCC_PRESET_FIRST_CUT } from '../presets';
import { silentVectors, vectorOfMagnitude } from '../__fixtures__/mfccFrameFixtures';

const PRESET = MFCC_PRESET_FIRST_CUT;
const FLOOR = 0.5;
const PAIR = PRESET.strictness.normal;

/** Та же выборка, на которой снят эталон: две живые, две немые. */
const VECTORS = [vectorOfMagnitude(3), vectorOfMagnitude(0.1), ...silentVectors(1), vectorOfMagnitude(5)];

/** Эталон ДО замены: снят прогоном прежней реализации 02.08. */
const BEFORE = {
  frames: [
    { state: 'passed', inBandCount: 3, magnitude: 3.0000000000000004 },
    { state: 'silent', inBandCount: 0, magnitude: 0.09999999999999999 },
    { state: 'silent', inBandCount: 0, magnitude: 0.010000000000000002 },
    { state: 'passed', inBandCount: 3, magnitude: 5.000000000000001 },
  ],
  series: { judgedCount: 2, silentCount: 2, passedCount: 2, passRate: 1, detected: true, refusal: null },
} as const;

describe('прибор судит пакетом, а не своей копией', () => {
  it('приговор КАЖДОГО кадра совпал с прежним — состояние и счёт точно, норма в пределах Float32', () => {
    const frames = VECTORS.map((v, i) => judgeFrame(v, i, PRESET, PAIR.minInBandRatio, FLOOR));

    frames.forEach((f, i) => {
      const was = BEFORE.frames[i]!;
      expect(f.state, `кадр ${i}: состояние`).toBe(was.state);
      expect(f.inBandCount, `кадр ${i}: коэффициентов в коридоре`).toBe(was.inBandCount);
      // Допуск ТОЛЬКО здесь и только потому, что судья считает во Float32, а прежняя копия
      // считала в double. Состояния и счёты — целые, им допуск не положен.
      expect(Math.abs(f.magnitude - was.magnitude), `кадр ${i}: норма`).toBeLessThan(1e-6);
    });
  });

  it('вердикт серии совпал с прежним ТОЧНЫМ равенством: это целые и доли от целых', () => {
    const s = judgeSeries(VECTORS, PRESET, 'normal', FLOOR);
    expect(s.judgedCount).toBe(BEFORE.series.judgedCount);
    expect(s.silentCount).toBe(BEFORE.series.silentCount);
    expect(s.passedCount).toBe(BEFORE.series.passedCount);
    expect(s.passRate).toBe(BEFORE.series.passRate);
    expect(s.detected).toBe(BEFORE.series.detected);
    expect(s.refusal).toBe(BEFORE.series.refusal);
  });

  it('немой кадр выходит из знаменателя, а не считается провалом', () => {
    const s = judgeSeries(VECTORS, PRESET, 'normal', FLOOR);
    expect(s.judgedCount + s.silentCount).toBe(VECTORS.length);
    expect(s.passRate).toBe(s.passedCount / s.judgedCount);
  });

  it('«судить было нечем» отличимо от «цели нет»', () => {
    const allMute = judgeSeries(silentVectors(4), PRESET, 'normal', FLOOR);
    expect(allMute.refusal).toMatch(/судить нечем/u);
    expect(allMute.detected).toBe(false);

    const empty = judgeSeries([], PRESET, 'normal', FLOOR);
    expect(empty.refusal).toMatch(/серия пуста/u);

    // Обе ситуации дают detected:false — и различаются ТОЛЬКО причиной. Слить их значило бы
    // соврать в пользу прибора.
    expect(allMute.refusal).not.toBe(empty.refusal);
  });

  it('слепок отсуженных коэффициентов остаётся у клиента: судья его не хранит', () => {
    const f = judgeFrame(VECTORS[0]!, 0, PRESET, PAIR.minInBandRatio, FLOOR);
    expect(f.judgedValues).toHaveLength(PRESET.judgedCoefficients.length);
    expect(f.judgedValues.every((v) => Number.isFinite(v))).toBe(true);
  });

  it('норма считается пакетом: мост через контейнер семантики не меняет', () => {
    expect(vectorMagnitude([3, 4])).toBeCloseTo(5, 6);
    expect(vectorMagnitude([])).toBe(0);
  });
  it('граница немоты: норма РОВНО на пороге — кадр судится, а не молчит', () => {
    // Порог задан строгим неравенством у судьи (magnitude < minMagnitude). Граница
    // проверяется зубом, иначе она уедет молча при следующей правке пакета.
    const at = judgeFrame(vectorOfMagnitude(FLOOR), 0, PRESET, PAIR.minInBandRatio, FLOOR);
    const below = judgeFrame(vectorOfMagnitude(FLOOR * 0.999), 0, PRESET, PAIR.minInBandRatio, FLOOR);
    expect(at.state).not.toBe('silent');
    expect(below.state).toBe('silent');
  });

  it('приговор кадра НЕ зависит от порога серии: два предмета не смешаны', () => {
    // Утверждение стояло комментарием; здесь оно становится проверкой. Кадр судится долей
    // коэффициентов в коридоре, а minPassRate — про долю прошедших КАДРОВ.
    const strict = judgeFrame(VECTORS[0]!, 0, PRESET, PAIR.minInBandRatio, FLOOR);
    const lenient = judgeFrame(VECTORS[0]!, 0, { ...PRESET, strictness: {
      ...PRESET.strictness,
      normal: { ...PAIR, minPassRate: 1 },
    } }, PAIR.minInBandRatio, FLOOR);
    expect(lenient.state).toBe(strict.state);
    expect(lenient.inBandCount).toBe(strict.inBandCount);
  });

  it('отпечаток штампуется ИЗ пресета, поэтому защита судьи от чужого хэша отсюда не сработает', () => {
    // Названо прямо, а не оставлено догадкой: клиент клеймит векторы хэшем того же пресета,
    // которым судит, — значит рассогласование этим путём недостижимо. Настоящая защита в
    // том, что коллектор связан с ОДНИМ пресетом на всю серию; сменить его посреди сбора
    // нечем. Уедет это устройство — зуб обязан покраснеть.
    const s = judgeSeries(VECTORS, PRESET, 'normal', FLOOR);
    expect(s.configHash).toBe(PRESET.configHash);
    expect(s.refusal).toBeNull();
  });

  it('инвариант: названный отказ и обнаружение несовместны', () => {
    for (const vectors of [[], silentVectors(3), VECTORS]) {
      const s = judgeSeries(vectors, PRESET, 'normal', FLOOR);
      if (s.refusal !== null) expect(s.detected, `отказ «${s.refusal}» рядом с detected`).toBe(false);
    }
  });
});
