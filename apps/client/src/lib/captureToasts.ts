import type { DeviceCaptureReleaseReason } from '@membrana/core';
import type { DeviceCaptureClientState } from '@membrana/device-board';

/**
 * CT5 (канон §7 + требование п.9 брифа): активные уведомления о захвате.
 * Вытеснение не должно выглядеть как баг — молчаливая остановка запрещена.
 */
export interface CaptureToastDescriptor {
  readonly key: string;
  readonly tone: 'warning' | 'info';
  readonly message: string;
}

/** Переход состояния захвата → toast (null = перехода нет / шум не показываем). */
export function resolveCaptureTransitionToast(
  prev: DeviceCaptureClientState | null,
  next: DeviceCaptureClientState | null,
  releaseReason: DeviceCaptureReleaseReason | null,
): CaptureToastDescriptor | null {
  if (prev === null && next !== null) {
    return {
      key: `captured-${next.sessionId}-${next.mode}`,
      tone: 'warning',
      message:
        next.mode === 'hard'
          ? 'Сервер захватил управление устройством (жёсткий режим). Локальный сценарий остановлен; доступен только аварийный стоп.'
          : 'Сервер захватил управление устройством (мягкий режим). Локальный сценарий остановлен; пуск и стоп остаются доступны.',
    };
  }

  if (prev !== null && next !== null && prev.mode !== next.mode) {
    return next.mode === 'hard'
      ? {
          key: `mode-hard-${next.sessionId}`,
          tone: 'warning',
          message: 'Режим захвата изменён на жёсткий — управление с устройства отключено.',
        }
      : {
          key: `mode-soft-${next.sessionId}`,
          tone: 'info',
          message: 'Режим захвата изменён на мягкий — пуск и стоп снова доступны.',
        };
  }

  if (prev !== null && next === null) {
    if (releaseReason === 'ttl-expired') {
      return {
        key: `released-ttl-${prev.sessionId}`,
        tone: 'warning',
        message:
          'Захват снят автоматически: сервер недоступен (истёк TTL). Устройство снова автономно.',
      };
    }
    return {
      key: `released-${prev.sessionId}`,
      tone: 'info',
      message: 'Сервер отпустил управление устройством. Полная автономия восстановлена.',
    };
  }

  return null;
}
