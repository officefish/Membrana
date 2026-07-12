import { describe, expect, it } from 'vitest';

import { resolveActiveLoopIndicator } from './active-loop-indicator.js';

const base = { isRunning: true, activeBranch: 'main' as const, mode: 'normal' as const };

describe('resolveActiveLoopIndicator (ADR loop-switch Р3, вариант B)', () => {
  it('не бежит → null (индикатора нет)', () => {
    expect(resolveActiveLoopIndicator({ ...base, isRunning: false })).toBeNull();
  });

  it('main-луп → «Обычный», без причины', () => {
    const r = resolveActiveLoopIndicator(base);
    expect(r).toEqual({ loop: 'main', label: 'Обычный', reason: null, reasonLabel: null });
  });

  it('alarm по авто-детекции (mode normal, branch alarm) → причина detection', () => {
    const r = resolveActiveLoopIndicator({ ...base, activeBranch: 'alarm' });
    expect(r?.loop).toBe('alarm');
    expect(r?.reason).toBe('detection');
    expect(r?.reasonLabel).toBe('авто-детекция');
  });

  it('alarm по ручному override (mode alarm) → причина manual', () => {
    const r = resolveActiveLoopIndicator({ ...base, activeBranch: 'alarm', mode: 'alarm' });
    expect(r?.loop).toBe('alarm');
    expect(r?.reason).toBe('manual');
    expect(r?.reasonLabel).toBe('ручной режим');
  });

  it('ручной alarm intent, но branch ещё main → показываем фактический main (лаг тика)', () => {
    const r = resolveActiveLoopIndicator({ ...base, mode: 'alarm', activeBranch: 'main' });
    expect(r?.loop).toBe('main');
    expect(r?.reason).toBeNull();
  });
});
