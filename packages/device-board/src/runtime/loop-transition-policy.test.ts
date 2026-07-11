import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOOP_TRANSITION_POLICY,
  INITIAL_LOOP_TRANSITION_STATE,
  advanceLoopTransition,
  type LoopTransitionState,
} from './loop-transition-policy.js';

const P = DEFAULT_LOOP_TRANSITION_POLICY; // enter 0.5, holdDelta 0.15 (hold 0.35), debounce 3

function run(scores: Array<{ score: number; present?: boolean }>): LoopTransitionState {
  return scores.reduce<LoopTransitionState>(
    (s, x) => advanceLoopTransition(s, { score: x.score, present: x.present ?? true }, P),
    INITIAL_LOOP_TRANSITION_STATE,
  );
}

describe('loop-transition-policy', () => {
  it('входит в alarm по строгому порогу (score >= 0.5)', () => {
    expect(run([{ score: 0.49 }]).inAlarm).toBe(false);
    expect(run([{ score: 0.5 }]).inAlarm).toBe(true);
    expect(run([{ score: 0.9 }]).inAlarm).toBe(true);
  });

  it('вход мгновенный (первый кадр выше порога)', () => {
    const s = advanceLoopTransition(INITIAL_LOOP_TRANSITION_STATE, { score: 0.6, present: true }, P);
    expect(s.inAlarm).toBe(true);
    expect(s.belowStreak).toBe(0);
  });

  it('удержание при провале до зоны гистерезиса (0.35..0.5)', () => {
    // вошли на 0.6, затем 0.4 (ниже входа, но выше удержания 0.35) — держим
    const s = run([{ score: 0.6 }, { score: 0.4 }, { score: 0.4 }, { score: 0.4 }]);
    expect(s.inAlarm).toBe(true);
  });

  it('выход только после debounceN=3 кадров ниже удержания', () => {
    expect(run([{ score: 0.6 }, { score: 0.2 }]).inAlarm).toBe(true); // 1 ниже
    expect(run([{ score: 0.6 }, { score: 0.2 }, { score: 0.2 }]).inAlarm).toBe(true); // 2 ниже
    expect(run([{ score: 0.6 }, { score: 0.2 }, { score: 0.2 }, { score: 0.2 }]).inAlarm).toBe(false); // 3 ниже
  });

  it('всплеск выше удержания сбрасывает debounce-счётчик (сирена не мигает)', () => {
    // ниже, ниже, всплеск в зону удержания, ниже, ниже — не выходим (счётчик сброшен)
    const s = run([
      { score: 0.6 },
      { score: 0.2 },
      { score: 0.2 },
      { score: 0.4 }, // сброс
      { score: 0.2 },
      { score: 0.2 },
    ]);
    expect(s.inAlarm).toBe(true);
  });

  it('пустое окно трактуется как «ниже» → затухание, не залипание', () => {
    const s = run([
      { score: 0.6 },
      { score: 0, present: false },
      { score: 0, present: false },
      { score: 0, present: false },
    ]);
    expect(s.inAlarm).toBe(false);
  });

  it('пустое окно не входит в alarm из main', () => {
    expect(run([{ score: 0.9, present: false }]).inAlarm).toBe(false);
  });

  it('гистерезис асимметричен: 0.45 не входит из main, но удерживает в alarm', () => {
    expect(run([{ score: 0.45 }]).inAlarm).toBe(false); // из main не вошли (< 0.5)
    expect(run([{ score: 0.6 }, { score: 0.45 }, { score: 0.45 }, { score: 0.45 }]).inAlarm).toBe(true); // держим (>= 0.35)
  });

  it('ровная граница удержания 0.35 — держим (score >= holdThreshold)', () => {
    expect(run([{ score: 0.6 }, { score: 0.35 }, { score: 0.35 }, { score: 0.35 }]).inAlarm).toBe(true);
    // чуть ниже границы (0.34) — выходим по debounce
    expect(run([{ score: 0.6 }, { score: 0.34 }, { score: 0.34 }, { score: 0.34 }]).inAlarm).toBe(false);
  });

  it('невалидный score (NaN / -Inf / отрицательный) трактуется как 0 (ниже)', () => {
    expect(run([{ score: Number.NaN }]).inAlarm).toBe(false);
    expect(run([{ score: Number.NEGATIVE_INFINITY }]).inAlarm).toBe(false);
    // в alarm невалидный score → затухание к выходу
    expect(run([{ score: 0.9 }, { score: Number.NaN }, { score: -5 }, { score: Number.NaN }]).inAlarm).toBe(false);
  });
});
