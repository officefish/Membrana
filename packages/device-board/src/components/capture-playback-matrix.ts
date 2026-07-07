/**
 * CSR2 (capture-shared-runtime): матрица доступности play/stop/pause на поле в
 * зависимости от оси захвата. Чистая функция — единая спецификация требования
 * владельца (2026-07-07): под захватом контроль общий, сценарий работает →
 * только Stop, остановлен → Start (soft), пауза заблокирована всегда.
 *
 * Инвариант канона §3.3: emergency stop доступен ВСЕГДА — здесь это `canStop`
 * при `isRunning` (в любом режиме захвата). Звук матрицей не блокируется.
 */
export interface CapturePlaybackMatrix {
  readonly canStart: boolean;
  readonly canStop: boolean;
  readonly canPause: boolean;
}

export function resolveCapturePlaybackMatrix(input: {
  readonly captured: boolean;
  readonly captureMode: 'soft' | 'hard' | null;
  readonly isRunning: boolean;
}): CapturePlaybackMatrix {
  if (!input.captured) {
    // Не захвачено (автономно / сопряжён-наблюдение): полный локальный контроль.
    return {
      canStart: !input.isRunning,
      canStop: input.isRunning,
      canPause: input.isRunning,
    };
  }
  // Под захватом контроль общий. Пауза заблокирована (тариф v3).
  // soft — поле может start/stop; hard — устройство ведомое, локальный start
  // заблокирован, но emergency stop доступен всегда (§3.3).
  const hard = input.captureMode === 'hard';
  return {
    canStart: !input.isRunning && !hard,
    canStop: input.isRunning,
    canPause: false,
  };
}
