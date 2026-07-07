import { describe, expect, it } from 'vitest';

import { resolveCapturePlaybackMatrix } from './capture-playback-matrix.js';

describe('resolveCapturePlaybackMatrix (CSR2)', () => {
  // Полная таблица (Dynin): captured × mode × isRunning.
  const rows: ReadonlyArray<
    [boolean, 'soft' | 'hard' | null, boolean, { canStart: boolean; canStop: boolean; canPause: boolean }]
  > = [
    // Не захвачено — полный локальный контроль (пауза при работе есть).
    [false, null, false, { canStart: true, canStop: false, canPause: false }],
    [false, null, true, { canStart: false, canStop: true, canPause: true }],
    // Soft-захват: работает → только Stop; остановлен → Start; пауза никогда.
    [true, 'soft', true, { canStart: false, canStop: true, canPause: false }],
    [true, 'soft', false, { canStart: true, canStop: false, canPause: false }],
    // Hard-захват: устройство ведомое — локальный start заблокирован; emergency
    // stop при работе доступен; пауза никогда.
    [true, 'hard', true, { canStart: false, canStop: true, canPause: false }],
    [true, 'hard', false, { canStart: false, canStop: false, canPause: false }],
  ];

  it.each(rows)(
    'captured=%s mode=%s running=%s',
    (captured, captureMode, isRunning, expected) => {
      expect(resolveCapturePlaybackMatrix({ captured, captureMode, isRunning })).toEqual(expected);
    },
  );

  it('пауза заблокирована при любом захвате', () => {
    expect(resolveCapturePlaybackMatrix({ captured: true, captureMode: 'soft', isRunning: true }).canPause).toBe(false);
    expect(resolveCapturePlaybackMatrix({ captured: true, captureMode: 'hard', isRunning: true }).canPause).toBe(false);
  });

  it('emergency stop доступен под захватом при работе (§3.3)', () => {
    expect(resolveCapturePlaybackMatrix({ captured: true, captureMode: 'hard', isRunning: true }).canStop).toBe(true);
  });
});
